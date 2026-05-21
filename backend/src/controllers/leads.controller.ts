import { Response } from "express";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { z } from "zod";
import { ok, created, badRequest, notFound, serverError } from "../utils/response";

const leadSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.enum(["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "EMAIL", "PHONE", "EXHIBITION", "OTHER"]).default("OTHER"),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).default("NEW"),
  value: z.number().optional(),
  campaignId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

const activitySchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
});

const campaignSchema = z.object({
  name: z.string().min(1),
  type: z.string().default("Email"),
  status: z.string().default("Draft"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  description: z.string().optional(),
});

export async function listLeads(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { status, source, search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { organizationId: req.organizationId! };
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where, skip, take: parseInt(limit),
        include: { _count: { select: { activities: true } }, campaign: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count({ where }),
    ]);
    ok(res, { leads, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { serverError(res, e); }
}

export async function getLead(req: OrgRequest, res: Response): Promise<void> {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: (req.params.id as string), organizationId: req.organizationId! },
      include: { activities: { orderBy: { createdAt: "desc" } }, campaign: true },
    });
    if (!lead) { notFound(res, "Lead not found"); return; }
    ok(res, lead);
  } catch (e) { serverError(res, e); }
}

export async function createLead(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = leadSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const lead = await prisma.lead.create({ data: { ...data.data, organizationId: req.organizationId! } });
    created(res, lead);
  } catch (e) { serverError(res, e); }
}

export async function updateLead(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = leadSchema.partial().safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const existing = await prisma.lead.findFirst({ where: { id: (req.params.id as string), organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Lead not found"); return; }
    const lead = await prisma.lead.update({ where: { id: (req.params.id as string) }, data: data.data });
    ok(res, lead);
  } catch (e) { serverError(res, e); }
}

export async function addLeadActivity(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = activitySchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const lead = await prisma.lead.findFirst({ where: { id: (req.params.id as string), organizationId: req.organizationId! } });
    if (!lead) { notFound(res, "Lead not found"); return; }
    const act = await prisma.leadActivity.create({ data: { leadId: (req.params.id as string), ...data.data, createdById: req.userId } });
    created(res, act);
  } catch (e) { serverError(res, e); }
}

export async function listCampaigns(req: OrgRequest, res: Response): Promise<void> {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: req.organizationId! },
      include: { _count: { select: { leads: true } } },
      orderBy: { createdAt: "desc" },
    });
    ok(res, campaigns);
  } catch (e) { serverError(res, e); }
}

export async function createCampaign(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = campaignSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const campaign = await prisma.campaign.create({
      data: {
        ...data.data,
        organizationId: req.organizationId!,
        startDate: data.data.startDate ? new Date(data.data.startDate) : undefined,
        endDate: data.data.endDate ? new Date(data.data.endDate) : undefined,
      },
    });
    created(res, campaign);
  } catch (e) { serverError(res, e); }
}

export async function getLeadStats(req: OrgRequest, res: Response): Promise<void> {
  try {
    const [total, won, lost, byStatus] = await Promise.all([
      prisma.lead.count({ where: { organizationId: req.organizationId! } }),
      prisma.lead.count({ where: { organizationId: req.organizationId!, status: "WON" } }),
      prisma.lead.count({ where: { organizationId: req.organizationId!, status: "LOST" } }),
      prisma.lead.groupBy({ by: ["status"], where: { organizationId: req.organizationId! }, _count: true }),
    ]);
    const pipeline = await prisma.lead.aggregate({
      where: { organizationId: req.organizationId!, status: { notIn: ["WON", "LOST"] } },
      _sum: { value: true },
    });
    ok(res, { total, won, lost, pipeline: pipeline._sum.value || 0, byStatus });
  } catch (e) { serverError(res, e); }
}

