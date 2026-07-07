import { Response } from "express";
import { randomInt } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { ok, created, serverError, badRequest } from "../utils/response";
import { uniqueOrgSlug } from "../utils/slug";
import { sendEmail } from "../utils/email";

const updateOrgSchema = z.object({
  isActive:       z.boolean().optional(),
  plan:           z.enum(["FREE","PRO","ENTERPRISE","CUSTOM"]).optional(),
  planExpiresAt:  z.string().datetime().nullable().optional(),
  adminNotes:     z.string().max(500).optional(),
  enabledModules: z.array(z.string().max(50)).max(50).optional(),
});

const superAdminFlagSchema = z.object({
  isSuperAdmin: z.boolean(),
});

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100).optional(),
  isSuperAdmin: z.boolean().optional(),
  sendWelcomeEmail: z.boolean().optional(),
  organization: z.object({
    name: z.string().trim().min(2).max(100),
    businessType: z.string().optional(),
    currency: z.string().max(10).optional(),
    country: z.string().max(60).optional(),
  }).optional(),
});

export async function getSuperAdminStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [totalOrgs, activeOrgs, totalUsers, recentOrgs] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, createdAt: true, isActive: true, plan: true, _count: { select: { members: true } } },
      }),
    ]);

    const planCounts = await prisma.organization.groupBy({
      by: ["plan"],
      _count: { _all: true },
    });

    ok(res, { totalOrgs, activeOrgs, inactiveOrgs: totalOrgs - activeOrgs, totalUsers, recentOrgs, planCounts });
  } catch (e) { serverError(res, e); }
}

export async function listAllOrganizations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const search = (req.query.search as string) || "";
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");
    const skip = (page - 1) * limit;
    const where: any = search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] } : {};

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true, name: true, slug: true, email: true, phone: true, businessType: true,
          isActive: true, plan: true, planExpiresAt: true, adminNotes: true,
          enabledModules: true, createdAt: true, updatedAt: true,
          _count: { select: { members: true, parties: true, invoices: true } },
          members: {
            where: { role: "OWNER" },
            take: 1,
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    ok(res, { orgs, total, page, limit });
  } catch (e) { serverError(res, e); }
}

export async function getOrganizationDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true, isActive: true, isSuperAdmin: true } } } },
        _count: { select: { parties: true, invoices: true, products: true, leads: true, supportTickets: true, projects: true } },
      },
    });
    if (!org) { res.status(404).json({ success: false, message: "Organization not found" }); return; }
    ok(res, { org });
  } catch (e) { serverError(res, e); }
}

export async function updateOrganization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = updateOrgSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Invalid data", parsed.error.flatten().fieldErrors); return; }

    const { isActive, plan, planExpiresAt, adminNotes, enabledModules } = parsed.data;
    const data: any = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (plan !== undefined) data.plan = plan;
    if (planExpiresAt !== undefined) data.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;
    if (enabledModules !== undefined) data.enabledModules = enabledModules;

    const org = await prisma.organization.update({ where: { id }, data });
    ok(res, { org });
  } catch (e) { serverError(res, e); }
}

export async function listAllUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const search = (req.query.search as string) || "";
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");
    const skip = (page - 1) * limit;
    const where: any = search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true, name: true, email: true, isActive: true, isSuperAdmin: true,
          lastLoginAt: true, createdAt: true,
          memberships: {
            select: {
              role: true,
              isActive: true,
              joinedAt: true,
              organization: {
                select: {
                  id: true, name: true, slug: true,
                  enabledModules: true,
                  _count: { select: { members: true } },
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    ok(res, { users, total, page, limit });
  } catch (e) { serverError(res, e); }
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[randomInt(chars.length)];
  return pw;
}

// Regular users have no self-signup flow (see LoginPage's "Request access" —
// that only logs a lead, it doesn't create an account). This is the actual
// account-creation path: a super admin creates the User directly, optionally
// bootstrapping an Organization + OWNER membership for them in one step.
export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Invalid data", parsed.error.flatten().fieldErrors); return; }
    const { name, email, isSuperAdmin, sendWelcomeEmail, organization } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { badRequest(res, "A user with this email already exists"); return; }

    const plainPassword = parsed.data.password || generateTempPassword();
    const hash = await bcrypt.hash(plainPassword, 12);
    // Computed before the transaction opens — uniqueOrgSlug queries via the
    // plain `prisma` client, which conflicts with the transaction's reserved
    // connection if called from inside the $transaction callback below.
    const orgSlug = organization?.name ? await uniqueOrgSlug(organization.name) : null;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name, email, password: hash,
          isActive: true, isEmailVerified: true,
          isSuperAdmin: isSuperAdmin || false,
        },
      });

      let org = null;
      if (organization?.name && orgSlug) {
        org = await tx.organization.create({
          data: {
            name: organization.name,
            slug: orgSlug,
            businessType: (organization.businessType as any) || "OTHER",
            currency: organization.currency || "INR",
            country: organization.country || "India",
            email,
            members: { create: { userId: user.id, role: "OWNER" } },
          },
        });
      }

      return { user, org };
    });

    if (sendWelcomeEmail) {
      sendEmail({
        to: email,
        subject: "Your FlowCRM account has been created",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
            <h2 style="color:#111827;margin:0 0 8px">Welcome to FlowCRM${result.org ? ` — ${result.org.name}` : ""}</h2>
            <p style="color:#374151;font-size:14px">An administrator has created an account for you.</p>
            <table style="font-size:14px;color:#374151;border-collapse:collapse">
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email</td><td><strong>${email}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Password</td><td><strong>${plainPassword}</strong></td></tr>
            </table>
            <p style="color:#6b7280;font-size:12px;margin-top:16px">Please log in and change your password after your first login.</p>
          </div>`,
      }).catch(() => {});
    }

    created(res, {
      user: { id: result.user.id, name: result.user.name, email: result.user.email, isSuperAdmin: result.user.isSuperAdmin },
      organization: result.org ? { id: result.org.id, name: result.org.name, slug: result.org.slug } : null,
      temporaryPassword: plainPassword,
    }, "User created successfully");
  } catch (e) { serverError(res, e); }
}

export async function toggleUserActive(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    ok(res, { user: updated });
  } catch (e) { serverError(res, e); }
}

export async function makeSuperAdmin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = superAdminFlagSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "isSuperAdmin must be a boolean"); return; }

    // Prevent super-admin from revoking their own super-admin status
    if (id === req.userId && !parsed.data.isSuperAdmin) {
      badRequest(res, "You cannot revoke your own super admin status"); return;
    }

    const updated = await prisma.user.update({ where: { id }, data: { isSuperAdmin: parsed.data.isSuperAdmin } });
    ok(res, { user: updated });
  } catch (e) { serverError(res, e); }
}
