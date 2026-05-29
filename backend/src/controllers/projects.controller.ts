import { Response } from "express";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { z } from "zod";
import { ok, created, badRequest, notFound, serverError } from "../utils/response";

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  partyId: z.string().optional(),
});

const taskSchema = z.object({
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
  storyPoints: z.number().int().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
});

export async function listProjects(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { status, search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { organizationId: req.organizationId! };
    if (status) where.status = status;
    if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }];
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, skip, take: parseInt(limit),
        include: {
          _count: { select: { tasks: true } },
          party: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.count({ where }),
    ]);
    ok(res, { projects, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { serverError(res, e); }
}

export async function getProject(req: OrgRequest, res: Response): Promise<void> {
  try {
    const project = await prisma.project.findFirst({
      where: { id: (req.params.id as string), organizationId: req.organizationId! },
      include: {
        tasks: { orderBy: { createdAt: "desc" } },
        party: true,
      },
    });
    if (!project) { notFound(res, "Project not found"); return; }
    ok(res, project);
  } catch (e) { serverError(res, e); }
}

export async function createProject(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = projectSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const project = await prisma.project.create({
      data: {
        ...data.data,
        organizationId: req.organizationId!,
        startDate: data.data.startDate ? new Date(data.data.startDate) : undefined,
        endDate: data.data.endDate ? new Date(data.data.endDate) : undefined,
      },
    });
    created(res, project);
  } catch (e) { serverError(res, e); }
}

export async function updateProject(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = projectSchema.partial().safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const existing = await prisma.project.findFirst({ where: { id: (req.params.id as string), organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Project not found"); return; }
    const project = await prisma.project.update({
      where: { id: (req.params.id as string) },
      data: {
        ...data.data,
        ...(data.data.startDate && { startDate: new Date(data.data.startDate) }),
        ...(data.data.endDate && { endDate: new Date(data.data.endDate) }),
      },
    });
    ok(res, project);
  } catch (e) { serverError(res, e); }
}

export async function listTasks(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { projectId, status, priority, page = "1", limit = "100" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { organizationId: req.organizationId! };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take: parseInt(limit),
        include: { project: { select: { id: true, name: true } }, _count: { select: { comments: true } } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      }),
      prisma.task.count({ where }),
    ]);
    ok(res, { tasks, total });
  } catch (e) { serverError(res, e); }
}

export async function createTask(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = taskSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const task = await prisma.task.create({
      data: {
        ...data.data,
        organizationId: req.organizationId!,
        dueDate: data.data.dueDate ? new Date(data.data.dueDate) : undefined,
      },
    });
    created(res, task);
  } catch (e) { serverError(res, e); }
}

export async function updateTask(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = taskSchema.partial().safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const existing = await prisma.task.findFirst({ where: { id: (req.params.id as string), organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Task not found"); return; }
    const task = await prisma.task.update({
      where: { id: (req.params.id as string) },
      data: {
        ...data.data,
        ...(data.data.dueDate && { dueDate: new Date(data.data.dueDate) }),
        ...(data.data.status === "DONE" && { completedAt: new Date() }),
      },
    });
    ok(res, task);
  } catch (e) { serverError(res, e); }
}

export async function addTaskComment(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { comment } = req.body;
    if (!comment) { badRequest(res, "Comment required"); return; }
    const task = await prisma.task.findFirst({ where: { id: (req.params.id as string), organizationId: req.organizationId! } });
    if (!task) { notFound(res, "Task not found"); return; }
    const c = await prisma.taskComment.create({ data: { taskId: (req.params.id as string), comment, authorId: req.userId } });
    created(res, c);
  } catch (e) { serverError(res, e); }
}

