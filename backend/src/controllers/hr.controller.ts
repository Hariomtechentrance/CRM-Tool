import { Response } from "express";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { z } from "zod";
import { ok, created, badRequest, notFound, serverError } from "../utils/response";

const employeeSchema = z.object({
  employeeCode: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  joiningDate: z.string(),
  basicSalary: z.number().min(0).default(0),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  panNumber: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const attendanceSchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"]).default("PRESENT"),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  notes: z.string().optional(),
});

const payrollSchema = z.object({
  employeeId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  workingDays: z.number().int().default(26),
  presentDays: z.number().default(0),
  hra: z.number().min(0).default(0),
  allowances: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const leaveSchema = z.object({
  employeeId: z.string(),
  leaveType: z.string().default("Annual"),
  fromDate: z.string(),
  toDate: z.string(),
  reason: z.string().optional(),
});

export async function listEmployees(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { search, department, status = "ACTIVE", page = "1", limit = "50" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { organizationId: req.organizationId!, status };
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
      ];
    }
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({ where, skip, take: parseInt(limit), orderBy: { name: "asc" } }),
      prisma.employee.count({ where }),
    ]);
    ok(res, { employees, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { serverError(res, e); }
}

export async function getEmployee(req: OrgRequest, res: Response): Promise<void> {
  try {
    const emp = await prisma.employee.findFirst({
      where: { id: (req.params.id as string), organizationId: req.organizationId! },
      include: {
        attendances: { orderBy: { date: "desc" }, take: 30 },
        payrolls: { orderBy: { year: "desc" }, take: 12 },
        leaveRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!emp) { notFound(res, "Employee not found"); return; }
    ok(res, emp);
  } catch (e) { serverError(res, e); }
}

export async function createEmployee(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = employeeSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }

    const exists = await prisma.employee.findUnique({
      where: { organizationId_employeeCode: { organizationId: req.organizationId!, employeeCode: data.data.employeeCode } },
    });
    if (exists) { badRequest(res, "Employee code already exists"); return; }

    const emp = await prisma.employee.create({
      data: { ...data.data, joiningDate: new Date(data.data.joiningDate), organizationId: req.organizationId! },
    });
    created(res, emp);
  } catch (e) { serverError(res, e); }
}

export async function updateEmployee(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = employeeSchema.partial().safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const existing = await prisma.employee.findFirst({ where: { id: (req.params.id as string), organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Employee not found"); return; }
    const emp = await prisma.employee.update({
      where: { id: (req.params.id as string) },
      data: { ...data.data, ...(data.data.joiningDate && { joiningDate: new Date(data.data.joiningDate) }) },
    });
    ok(res, emp);
  } catch (e) { serverError(res, e); }
}

export async function markAttendance(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = attendanceSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }

    const emp = await prisma.employee.findFirst({ where: { id: data.data.employeeId, organizationId: req.organizationId! } });
    if (!emp) { notFound(res, "Employee not found"); return; }

    const date = new Date(data.data.date);
    const att = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: data.data.employeeId, date } },
      create: {
        organizationId: req.organizationId!,
        employeeId: data.data.employeeId,
        date,
        status: data.data.status,
        checkIn: data.data.checkIn ? new Date(data.data.checkIn) : undefined,
        checkOut: data.data.checkOut ? new Date(data.data.checkOut) : undefined,
        notes: data.data.notes,
      },
      update: {
        status: data.data.status,
        checkIn: data.data.checkIn ? new Date(data.data.checkIn) : undefined,
        checkOut: data.data.checkOut ? new Date(data.data.checkOut) : undefined,
        notes: data.data.notes,
      },
    });
    ok(res, att);
  } catch (e) { serverError(res, e); }
}

export async function listAttendance(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { employeeId, month, year } = req.query as Record<string, string>;
    const where: any = { organizationId: req.organizationId! };
    if (employeeId) where.employeeId = employeeId;
    if (month && year) {
      const from = new Date(parseInt(year), parseInt(month) - 1, 1);
      const to = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = { gte: from, lte: to };
    }
    const records = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeCode: true } } },
      orderBy: { date: "desc" },
    });
    ok(res, records);
  } catch (e) { serverError(res, e); }
}

export async function generatePayroll(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = payrollSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }

    const emp = await prisma.employee.findFirst({ where: { id: data.data.employeeId, organizationId: req.organizationId! } });
    if (!emp) { notFound(res, "Employee not found"); return; }

    const perDaySalary = emp.basicSalary / data.data.workingDays;
    const basicEarned = perDaySalary * data.data.presentDays;
    const grossSalary = basicEarned + data.data.hra + data.data.allowances;
    const pfDeduction = basicEarned * 0.12;
    const esiDeduction = grossSalary > 21000 ? 0 : grossSalary * 0.0075;
    const netSalary = grossSalary - pfDeduction - esiDeduction - data.data.deductions;

    const payroll = await prisma.payroll.upsert({
      where: { employeeId_month_year: { employeeId: data.data.employeeId, month: data.data.month, year: data.data.year } },
      create: {
        organizationId: req.organizationId!,
        employeeId: data.data.employeeId,
        month: data.data.month, year: data.data.year,
        workingDays: data.data.workingDays,
        presentDays: data.data.presentDays,
        basicSalary: basicEarned,
        hra: data.data.hra, allowances: data.data.allowances,
        deductions: data.data.deductions, pfDeduction, esiDeduction,
        grossSalary, netSalary, notes: data.data.notes,
      },
      update: {
        workingDays: data.data.workingDays,
        presentDays: data.data.presentDays,
        basicSalary: basicEarned,
        hra: data.data.hra, allowances: data.data.allowances,
        deductions: data.data.deductions, pfDeduction, esiDeduction,
        grossSalary, netSalary, notes: data.data.notes,
      },
    });
    ok(res, payroll);
  } catch (e) { serverError(res, e); }
}

export async function listPayrolls(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { month, year, employeeId } = req.query as Record<string, string>;
    const where: any = { organizationId: req.organizationId! };
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (employeeId) where.employeeId = employeeId;
    const payrolls = await prisma.payroll.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeCode: true, designation: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    ok(res, payrolls);
  } catch (e) { serverError(res, e); }
}

export async function createLeaveRequest(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = leaveSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const from = new Date(data.data.fromDate);
    const to = new Date(data.data.toDate);
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 86400)) + 1;
    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId: req.organizationId!,
        employeeId: data.data.employeeId,
        leaveType: data.data.leaveType,
        fromDate: from, toDate: to, days,
        reason: data.data.reason,
      },
    });
    created(res, leave);
  } catch (e) { serverError(res, e); }
}

export async function updateLeaveStatus(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { status } = req.body;
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: (req.params.id as string), organizationId: req.organizationId! },
    });
    if (!leave) { notFound(res, "Leave request not found"); return; }
    const updated = await prisma.leaveRequest.update({ where: { id: (req.params.id as string) }, data: { status } });
    ok(res, updated);
  } catch (e) { serverError(res, e); }
}

export async function listLeaveRequests(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { employeeId, status } = req.query as Record<string, string>;
    const where: any = { organizationId: req.organizationId! };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeCode: true } } },
      orderBy: { createdAt: "desc" },
    });
    ok(res, leaves);
  } catch (e) { serverError(res, e); }
}

export async function getHRSummary(req: OrgRequest, res: Response): Promise<void> {
  try {
    const [total, active, onLeave, depts] = await Promise.all([
      prisma.employee.count({ where: { organizationId: req.organizationId! } }),
      prisma.employee.count({ where: { organizationId: req.organizationId!, status: "ACTIVE" } }),
      prisma.leaveRequest.count({
        where: { organizationId: req.organizationId!, status: "APPROVED", fromDate: { lte: new Date() }, toDate: { gte: new Date() } },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        where: { organizationId: req.organizationId!, status: "ACTIVE" },
        _count: true,
      }),
    ]);
    ok(res, { total, active, onLeave, departments: depts });
  } catch (e) { serverError(res, e); }
}

