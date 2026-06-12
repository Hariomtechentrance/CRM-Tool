import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { ok, serverError, badRequest } from "../utils/response";

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
