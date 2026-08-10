import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { AuthRequest } from "../middleware/auth";
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../validators/org.validator";
import { ok, created, badRequest, forbidden, notFound, serverError, conflict } from "../utils/response";
import { uniqueOrgSlug } from "../utils/slug";
import { sendEmail, inviteEmailTemplate } from "../utils/email";
import { isStrongPassword } from "./auth.controller";
import { hashToken } from "../utils/tokenHash";
import { signAccessToken, signRefreshToken, getRefreshExpiryDate } from "../lib/jwt";
import { MemberRole } from "@prisma/client";
import { google } from "googleapis";

// ── Create Organization ──────────────────────────────────────
export async function createOrganization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createOrgSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }

    const slug = await uniqueOrgSlug(parsed.data.name);

    const org = await prisma.organization.create({
      data: {
        ...parsed.data,
        slug,
        members: {
          create: { userId: req.userId!, role: MemberRole.OWNER },
        },
      },
    });

    // Auto-grant all enabled modules to the Owner
    const modules: string[] = (parsed.data as any).enabledModules ?? [];
    if (modules.length > 0) {
      await prisma.userModuleAccess.createMany({
        data: modules.map((moduleKey) => ({ userId: req.userId!, organizationId: org.id, moduleKey })),
        skipDuplicates: true,
      });
    }

    created(res, org, "Organization created successfully");
  } catch (err) {
    serverError(res, err);
  }
}

// ── List My Organizations ────────────────────────────────────
export async function getMyOrganizations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.userId!, isActive: true },
      include: {
        organization: {
          select: {
            id: true, name: true, slug: true, logo: true,
            businessType: true, currency: true, country: true, isActive: true,
            enabledModules: true,
          },
        },
      },
    });
    ok(res, memberships.map((m) => ({ ...m.organization, role: m.role, joinedAt: m.joinedAt })));
  } catch (err) {
    serverError(res, err);
  }
}

// ── Get Organization Details ─────────────────────────────────
export async function getOrganization(req: OrgRequest, res: Response): Promise<void> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      include: {
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
      },
    });
    if (!org) { notFound(res, "Organization not found"); return; }
    // Extract hrSettings from complianceConfig for the frontend
    const cfg = (org.complianceConfig as Record<string, any>) ?? {};
    ok(res, { ...org, hrSettings: cfg.hrSettings ?? null });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Update Organization ──────────────────────────────────────
export async function updateOrganization(req: OrgRequest, res: Response): Promise<void> {
  try {
    if (req.memberRole !== MemberRole.OWNER && req.memberRole !== MemberRole.ADMIN) {
      forbidden(res, "Only Owner or Admin can update organization"); return;
    }

    // Extract hrSettings separately — stored in complianceConfig JSON field
    const { hrSettings, ...rest } = req.body as Record<string, any>;

    const parsed = updateOrgSchema.safeParse(rest);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }

    // An org's own admin can turn a module OFF freely, but turning a new one
    // ON requires the super admin's approval via a module request — see
    // requestOrgModule(). Silently drop any additions rather than erroring,
    // since the frontend never sends them (this is just a backend backstop).
    if (parsed.data.enabledModules !== undefined) {
      const existing = await prisma.organization.findUnique({ where: { id: req.organizationId }, select: { enabledModules: true } });
      const current = existing?.enabledModules ?? [];
      parsed.data.enabledModules = parsed.data.enabledModules.filter((m) => current.includes(m));
    }

    // Merge hrSettings into existing complianceConfig
    let updateData: Record<string, any> = { ...parsed.data };
    if (hrSettings !== undefined) {
      const existing = await prisma.organization.findUnique({
        where: { id: req.organizationId },
        select: { complianceConfig: true },
      });
      const existingConfig = (existing?.complianceConfig as Record<string, any>) ?? {};
      updateData.complianceConfig = { ...existingConfig, hrSettings };
    }

    const org = await prisma.organization.update({ where: { id: req.organizationId }, data: updateData });

    // Return hrSettings extracted from complianceConfig for convenience
    const cfg = (org.complianceConfig as Record<string, any>) ?? {};
    ok(res, { ...org, hrSettings: cfg.hrSettings ?? null }, "Organization updated");
  } catch (err) {
    serverError(res, err);
  }
}

// ── Send invite via the inviter's connected Gmail account ─────
async function sendInviteViaGmail(inviterId: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const db = (prisma as any);
    const account = await db.gmailAccount.findUnique({ where: { userId: inviterId } });
    if (!account || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return false;

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
    oAuth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.expiresAt.getTime(),
    });
    // Auto-refresh if needed
    if (account.expiresAt < new Date()) {
      const { credentials } = await oAuth2Client.refreshAccessToken();
      await db.gmailAccount.update({
        where: { userId: inviterId },
        data: { accessToken: credentials.access_token!, expiresAt: new Date(credentials.expiry_date || Date.now() + 3600_000) },
      });
      oAuth2Client.setCredentials(credentials);
    }

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client }) as any;
    const mimeLines = [
      `From: ${account.email}`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
    ];
    const raw = Buffer.from(mimeLines.join("\r\n")).toString("base64url");
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    console.log(`📧 [GMAIL] Invite sent to ${to} via ${account.email}`);
    return true;
  } catch (err: any) {
    console.warn("[Gmail invite] Failed, will fall back to SMTP:", err.message);
    return false;
  }
}

// ── Invite Member ────────────────────────────────────────────
export async function inviteMember(req: OrgRequest, res: Response): Promise<void> {
  try {
    if (req.memberRole !== MemberRole.OWNER && req.memberRole !== MemberRole.ADMIN) {
      forbidden(res, "Only Owner or Admin can invite members"); return;
    }
    const parsed = inviteMemberSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }

    const { email, role, allowedModules } = parsed.data;

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId: req.organizationId! } },
      });
      if (alreadyMember?.isActive) { conflict(res, "This user is already a member"); return; }
    }

    // Check for pending invite — resend if exists (update modules)
    const existingInvite = await prisma.orgInvite.findFirst({
      where: { email, organizationId: req.organizationId!, status: "PENDING" },
    });
    if (existingInvite) { conflict(res, "An invite has already been sent to this email"); return; }

    const org = await prisma.organization.findUnique({ where: { id: req.organizationId }, select: { name: true } });
    const inviter = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } });

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    const invite = await prisma.orgInvite.create({
      data: { email, organizationId: req.organizationId!, role, allowedModules: allowedModules ?? [], invitedById: req.userId!, expiresAt },
    });

    const subject = `You're invited to join ${org!.name} on FlowCRM`;
    const html = inviteEmailTemplate(org!.name, inviter!.name, invite.token, role, allowedModules ?? []);

    // Try the inviter's connected Gmail first; fall back to SMTP
    const sentViaGmail = await sendInviteViaGmail(req.userId!, email, subject, html);
    if (!sentViaGmail) {
      await sendEmail({ to: email, subject, html });
    }

    created(res, { id: invite.id, email, role, allowedModules: invite.allowedModules }, "Invitation sent successfully");
  } catch (err) {
    serverError(res, err);
  }
}

// ── Get Invite Info (no auth needed — public) ────────────────
export async function getInviteInfo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const token = req.query.token as string;
    if (!token) { badRequest(res, "Token is required"); return; }

    const invite = await prisma.orgInvite.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true } },
        invitedBy: { select: { name: true } },
      },
    });

    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      badRequest(res, "This invite link is invalid or has expired"); return;
    }

    ok(res, {
      orgName: invite.organization.name,
      inviterName: invite.invitedBy?.name || "Someone",
      role: invite.role,
      email: invite.email,
    });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Accept Invite ────────────────────────────────────────────
export async function acceptInvite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) { badRequest(res, "Invite token is required"); return; }

    const invite = await prisma.orgInvite.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true, currency: true, country: true, businessType: true, isActive: true, enabledModules: true },
        },
      },
    });

    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      badRequest(res, "Invalid or expired invitation"); return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.email !== invite.email) {
      forbidden(res, "This invitation was sent to a different email address"); return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationMember.upsert({
        where: { userId_organizationId: { userId: req.userId!, organizationId: invite.organizationId } },
        update: { role: invite.role, isActive: true },
        create: { userId: req.userId!, organizationId: invite.organizationId, role: invite.role },
      });
      await tx.orgInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });

      // Grant the modules the admin pre-selected for this employee
      if (invite.allowedModules.length > 0) {
        await tx.userModuleAccess.createMany({
          data: invite.allowedModules.map((moduleKey) => ({
            userId: req.userId!,
            organizationId: invite.organizationId,
            moduleKey,
            grantedById: invite.invitedById,
          })),
          skipDuplicates: true,
        });
      }
    });

    ok(res, { organization: invite.organization, role: invite.role }, "Joined organization successfully");
  } catch (err) {
    serverError(res, err);
  }
}

// ── Register a brand-new account directly from an invite ──────
// Public — no auth. Used when the invited email has no existing FlowCRM
// account yet. The invite link itself (sent to a real inbox by an org
// admin) is treated as proof of email ownership, so no separate
// verification step is required — same trust model as a password-reset
// link. Creates the user, joins the org, grants the pre-selected
// modules, and returns tokens so the frontend can log them straight in.
export async function registerViaInvite(req: Request, res: Response): Promise<void> {
  try {
    const { token, name, password } = req.body as { token?: string; name?: string; password?: string };
    if (!token || !name?.trim() || !password) {
      badRequest(res, "token, name, and password are required");
      return;
    }

    const invite = await prisma.orgInvite.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true, currency: true, country: true, businessType: true, isActive: true, enabledModules: true },
        },
      },
    });
    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      badRequest(res, "This invite link is invalid or has expired");
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      conflict(res, "An account with this email already exists. Please log in instead.");
      return;
    }

    const strength = isStrongPassword(password);
    if (!strength.ok) { badRequest(res, strength.reason!); return; }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name: name.trim(), email: invite.email, password: hashedPassword, isEmailVerified: true },
      });
      await tx.organizationMember.create({
        data: { userId: newUser.id, organizationId: invite.organizationId, role: invite.role },
      });
      if (invite.allowedModules.length > 0) {
        await tx.userModuleAccess.createMany({
          data: invite.allowedModules.map((moduleKey) => ({
            userId: newUser.id, organizationId: invite.organizationId, moduleKey, grantedById: invite.invitedById,
          })),
          skipDuplicates: true,
        });
      }
      await tx.orgInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
      return newUser;
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email, isSuperAdmin: false });
    const tokenId = uuidv4();
    const refreshToken = signRefreshToken({ userId: user.id, tokenId });
    await prisma.refreshToken.create({
      data: { id: tokenId, token: hashToken(refreshToken), userId: user.id, expiresAt: getRefreshExpiryDate() },
    });

    created(res, {
      accessToken, refreshToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: null, isSuperAdmin: false },
      organizations: [{ ...invite.organization, role: invite.role }],
    }, "Account created — welcome aboard!");
  } catch (err) {
    serverError(res, err);
  }
}

// ── List Pending Invites ─────────────────────────────────────
export async function listPendingInvites(req: OrgRequest, res: Response): Promise<void> {
  try {
    if (req.memberRole !== MemberRole.OWNER && req.memberRole !== MemberRole.ADMIN) {
      forbidden(res, "Only Owner or Admin can view invites"); return;
    }
    const invites = await prisma.orgInvite.findMany({
      where: { organizationId: req.organizationId!, status: "PENDING" },
      include: { invitedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    ok(res, invites.map(i => ({
      id: i.id, email: i.email, role: i.role,
      allowedModules: i.allowedModules, expiresAt: i.expiresAt,
      createdAt: i.createdAt, invitedBy: i.invitedBy?.name,
      expired: i.expiresAt < new Date(),
    })));
  } catch (err) { serverError(res, err); }
}

// ── Resend Invite ────────────────────────────────────────────
export async function resendInvite(req: OrgRequest, res: Response): Promise<void> {
  try {
    if (req.memberRole !== MemberRole.OWNER && req.memberRole !== MemberRole.ADMIN) {
      forbidden(res, "Only Owner or Admin can resend invites"); return;
    }
    const invite = await prisma.orgInvite.findFirst({
      where: { id: req.params.inviteId as string, organizationId: req.organizationId!, status: "PENDING" },
    });
    if (!invite) { notFound(res, "Invite not found"); return; }

    // Extend expiry by another 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await prisma.orgInvite.update({ where: { id: invite.id }, data: { expiresAt } });

    const org = await prisma.organization.findUnique({ where: { id: req.organizationId }, select: { name: true } });
    const inviter = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } });

    const subject = `Reminder: You're invited to join ${org!.name} on FlowCRM`;
    const html = inviteEmailTemplate(org!.name, inviter!.name, invite.token, invite.role, invite.allowedModules);

    const sentViaGmail = await sendInviteViaGmail(req.userId!, invite.email, subject, html);
    if (!sentViaGmail) await sendEmail({ to: invite.email, subject, html });

    ok(res, null, "Invite resent successfully");
  } catch (err) { serverError(res, err); }
}

// ── Cancel Invite ────────────────────────────────────────────
export async function cancelInvite(req: OrgRequest, res: Response): Promise<void> {
  try {
    if (req.memberRole !== MemberRole.OWNER && req.memberRole !== MemberRole.ADMIN) {
      forbidden(res, "Only Owner or Admin can cancel invites"); return;
    }
    const deleted = await prisma.orgInvite.deleteMany({
      where: { id: req.params.inviteId as string, organizationId: req.organizationId!, status: "PENDING" },
    });
    if (!deleted.count) { notFound(res, "Invite not found"); return; }
    ok(res, null, "Invite cancelled");
  } catch (err) { serverError(res, err); }
}

// ── List & Remove Members ────────────────────────────────────
export async function listMembers(req: OrgRequest, res: Response): Promise<void> {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.organizationId!, isActive: true },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, lastLoginAt: true } } },
    });
    ok(res, members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })));
  } catch (err) {
    serverError(res, err);
  }
}

export async function updateMemberRole(req: OrgRequest, res: Response): Promise<void> {
  try {
    if (req.memberRole !== MemberRole.OWNER && req.memberRole !== MemberRole.ADMIN) {
      forbidden(res, "Only Owner or Admin can change roles"); return;
    }
    const memberId = req.params.memberId as string;
    const parsed = updateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Invalid role"); return; }

    // Prevent changing owner's role
    const target = await prisma.organizationMember.findFirst({
      where: { userId: memberId, organizationId: req.organizationId! },
    });
    if (!target) { notFound(res, "Member not found"); return; }
    if (target.role === MemberRole.OWNER) { forbidden(res, "Cannot change the owner's role"); return; }

    await prisma.organizationMember.update({
      where: { userId_organizationId: { userId: memberId, organizationId: req.organizationId! } },
      data: { role: parsed.data.role },
    });
    ok(res, null, "Role updated");
  } catch (err) {
    serverError(res, err);
  }
}

export async function removeMember(req: OrgRequest, res: Response): Promise<void> {
  try {
    if (req.memberRole !== MemberRole.OWNER && req.memberRole !== MemberRole.ADMIN) {
      forbidden(res, "Only Owner or Admin can remove members"); return;
    }
    const memberId = req.params.memberId as string;
    if (memberId === req.userId) { badRequest(res, "You cannot remove yourself"); return; }

    const target = await prisma.organizationMember.findFirst({
      where: { userId: memberId, organizationId: req.organizationId! },
    });
    if (!target) { notFound(res, "Member not found"); return; }
    if (target.role === MemberRole.OWNER) { forbidden(res, "Cannot remove the organization owner"); return; }

    await prisma.organizationMember.update({
      where: { userId_organizationId: { userId: memberId, organizationId: req.organizationId! } },
      data: { isActive: false },
    });
    ok(res, null, "Member removed");
  } catch (err) {
    serverError(res, err);
  }
}

// ── Module requests — an org's own admin can no longer just enable a new
// module for themselves; they ask the platform's super admin instead. ──────
export async function requestOrgModule(req: OrgRequest, res: Response): Promise<void> {
  try {
    if (req.memberRole !== MemberRole.OWNER && req.memberRole !== MemberRole.ADMIN) {
      forbidden(res, "Only Owner or Admin can request a module"); return;
    }

    const { moduleKey, message } = req.body as { moduleKey?: string; message?: string };
    if (!moduleKey) { badRequest(res, "moduleKey is required"); return; }

    const org = await prisma.organization.findUnique({ where: { id: req.organizationId! }, select: { enabledModules: true } });
    if (org?.enabledModules.includes(moduleKey)) { badRequest(res, "This module is already enabled"); return; }

    const request = await prisma.orgModuleRequest.upsert({
      where: { organizationId_moduleKey: { organizationId: req.organizationId!, moduleKey } },
      create: { organizationId: req.organizationId!, moduleKey, requestedById: req.userId!, message: message || null },
      update: { status: "PENDING", message: message || null, requestedById: req.userId!, responseNote: null, resolvedAt: null, resolvedById: null, requestedAt: new Date() },
    });

    created(res, request);
  } catch (err) {
    serverError(res, err);
  }
}

export async function listOrgModuleRequests(req: OrgRequest, res: Response): Promise<void> {
  try {
    const requests = await prisma.orgModuleRequest.findMany({
      where: { organizationId: req.organizationId! },
      orderBy: { requestedAt: "desc" },
    });
    ok(res, requests);
  } catch (err) {
    serverError(res, err);
  }
}
