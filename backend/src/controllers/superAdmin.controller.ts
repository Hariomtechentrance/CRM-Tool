import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { ok, serverError } from "../utils/response";

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
    const { isActive, plan, planExpiresAt, adminNotes, enabledModules } = req.body;
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
          memberships: { select: { role: true, organization: { select: { id: true, name: true, slug: true } } } },
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
    const { isSuperAdmin } = req.body;
    const updated = await prisma.user.update({ where: { id }, data: { isSuperAdmin } });
    ok(res, { user: updated });
  } catch (e) { serverError(res, e); }
}
