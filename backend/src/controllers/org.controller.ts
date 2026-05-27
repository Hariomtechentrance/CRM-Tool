import { Response } from "express";
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
import { MemberRole } from "@prisma/client";

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
    ok(res, org);
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
    const parsed = updateOrgSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }

    const org = await prisma.organization.update({ where: { id: req.organizationId }, data: parsed.data });
    ok(res, org, "Organization updated");
  } catch (err) {
    serverError(res, err);
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

    await sendEmail({
      to: email,
      subject: `You're invited to join ${org!.name} on FlowCRM`,
      html: inviteEmailTemplate(org!.name, inviter!.name, invite.token),
    });

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
