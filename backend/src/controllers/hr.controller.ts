import { Response } from "express";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { z } from "zod";
import { ok, created, badRequest, notFound, serverError } from "../utils/response";

const employeeSchema = z.object({
  employeeCode:  z.string().min(1),
  name:          z.string().min(1),
  email:         z.string().email().optional(),
  phone:         z.string().optional(),
  designation:   z.string().optional(),
  department:    z.string().optional(),
  employmentType:z.enum(["FULL_TIME","PART_TIME","CONTRACT","INTERN"]).default("FULL_TIME"),
  joiningDate:   z.string(),
  salaryType:    z.enum(["MONTHLY","DAILY"]).default("MONTHLY"),
  basicSalary:   z.number().min(0).default(0),
  dailyRate:     z.number().min(0).optional(),
  hra:           z.number().min(0).default(0),
  allowances:    z.number().min(0).default(0),
  bankAccount:   z.string().optional(),
  bankIfsc:      z.string().optional(),
  panNumber:     z.string().optional(),
  pfNumber:      z.string().optional(),
  esiNumber:     z.string().optional(),
  address:       z.string().optional(),
  notes:         z.string().optional(),
});

const attendanceSchema = z.object({
  employeeId: z.string(),
  date:       z.string(),
  status:     z.enum(["PRESENT","ABSENT","HALF_DAY","LEAVE","HOLIDAY"]).default("PRESENT"),
  checkIn:    z.string().optional(),
  checkOut:   z.string().optional(),
  notes:      z.string().optional(),
});

const payrollSchema = z.object({
  employeeId:  z.string(),
  month:       z.number().int().min(1).max(12),
  year:        z.number().int().min(2020),
  workingDays: z.number().int().default(26),
  presentDays: z.number().default(0),
  hra:         z.number().min(0).optional(),
  allowances:  z.number().min(0).optional(),
  deductions:  z.number().min(0).default(0),
  notes:       z.string().optional(),
});

const leaveSchema = z.object({
  employeeId: z.string(),
  leaveType:  z.string().default("Annual"),
  fromDate:   z.string(),
  toDate:     z.string(),
  reason:     z.string().optional(),
});

// ── Salary calculation helper ────────────────────────────────
function calcPayroll(emp: {
  salaryType: string; basicSalary: number; dailyRate: number | null;
  hra: number; allowances: number;
}, presentDays: number, workingDays: number, extraDeductions = 0) {
  let basicEarned: number;
  if (emp.salaryType === "DAILY") {
    const rate = emp.dailyRate ?? emp.basicSalary;
    basicEarned = rate * presentDays;
  } else {
    // MONTHLY — prorate by attendance
    const perDay = workingDays > 0 ? emp.basicSalary / workingDays : 0;
    basicEarned = perDay * presentDays;
  }
  const hraEarned    = emp.hra       * (presentDays / Math.max(workingDays, 1));
  const allowEarned  = emp.allowances * (presentDays / Math.max(workingDays, 1));
  const grossSalary  = basicEarned + hraEarned + allowEarned;
  const pfDeduction  = basicEarned * 0.12;
  const esiDeduction = grossSalary <= 21000 ? grossSalary * 0.0075 : 0;
  const netSalary    = grossSalary - pfDeduction - esiDeduction - extraDeductions;
  return { basicEarned, hraEarned, allowEarned, grossSalary, pfDeduction, esiDeduction, netSalary };
}

// ── Count attendance days for a month ────────────────────────
async function countAttendanceDays(employeeId: string, month: number, year: number) {
  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59);
  const rows = await prisma.attendance.findMany({
    where: { employeeId, date: { gte: from, lte: to } },
    select: { status: true },
  });
  let present = 0;
  for (const r of rows) {
    if (r.status === "PRESENT") present += 1;
    else if (r.status === "HALF_DAY") present += 0.5;
    else if (r.status === "LEAVE") present += 1; // paid leave counts as present
  }
  return { presentDays: present, totalMarked: rows.length };
}

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
      where: { id: req.params.id as string, organizationId: req.organizationId! },
      include: {
        attendances:   { orderBy: { date: "desc" }, take: 60 },
        payrolls:      { orderBy: [{ year: "desc" }, { month: "desc" }], take: 24 },
        leaveRequests: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!emp) { notFound(res, "Employee not found"); return; }

    // Compute this-month attendance summary
    const now = new Date();
    const { presentDays, totalMarked } = await countAttendanceDays(emp.id, now.getMonth() + 1, now.getFullYear());

    ok(res, { ...emp, thisMonthPresent: presentDays, thisMonthMarked: totalMarked });
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
    const existing = await prisma.employee.findFirst({ where: { id: req.params.id as string, organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Employee not found"); return; }
    const emp = await prisma.employee.update({
      where: { id: req.params.id as string },
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
    const att  = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: data.data.employeeId, date } },
      create: {
        organizationId: req.organizationId!,
        employeeId: data.data.employeeId, date,
        status: data.data.status,
        checkIn:  data.data.checkIn  ? new Date(`${data.data.date}T${data.data.checkIn}`)  : undefined,
        checkOut: data.data.checkOut ? new Date(`${data.data.date}T${data.data.checkOut}`) : undefined,
        notes: data.data.notes,
      },
      update: {
        status: data.data.status,
        checkIn:  data.data.checkIn  ? new Date(`${data.data.date}T${data.data.checkIn}`)  : undefined,
        checkOut: data.data.checkOut ? new Date(`${data.data.date}T${data.data.checkOut}`) : undefined,
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
      const to   = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
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

// ── Mark attendance in bulk (all employees, one date) ───────
export async function bulkMarkAttendance(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { date, records } = req.body as {
      date: string;
      records: Array<{ employeeId: string; status: string; checkIn?: string; checkOut?: string }>;
    };
    if (!date || !Array.isArray(records) || records.length === 0) {
      badRequest(res, "date and records[] are required"); return;
    }
    const results = await Promise.all(records.map(async (r) => {
      const emp = await prisma.employee.findFirst({ where: { id: r.employeeId, organizationId: req.organizationId! } });
      if (!emp) return null;
      return prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: r.employeeId, date: new Date(date) } },
        create: {
          organizationId: req.organizationId!, employeeId: r.employeeId, date: new Date(date),
          status: r.status as any,
          checkIn:  r.checkIn  ? new Date(`${date}T${r.checkIn}`)  : undefined,
          checkOut: r.checkOut ? new Date(`${date}T${r.checkOut}`) : undefined,
        },
        update: {
          status: r.status as any,
          checkIn:  r.checkIn  ? new Date(`${date}T${r.checkIn}`)  : undefined,
          checkOut: r.checkOut ? new Date(`${date}T${r.checkOut}`) : undefined,
        },
      });
    }));
    ok(res, { marked: results.filter(Boolean).length });
  } catch (e) { serverError(res, e); }
}

export async function generatePayroll(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = payrollSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }

    const emp = await prisma.employee.findFirst({ where: { id: data.data.employeeId, organizationId: req.organizationId! } });
    if (!emp) { notFound(res, "Employee not found"); return; }

    const hraToUse        = data.data.hra        ?? emp.hra;
    const allowancesToUse = data.data.allowances ?? emp.allowances;
    const { basicEarned, grossSalary, pfDeduction, esiDeduction, netSalary } = calcPayroll(
      { salaryType: emp.salaryType, basicSalary: emp.basicSalary, dailyRate: emp.dailyRate, hra: hraToUse, allowances: allowancesToUse },
      data.data.presentDays, data.data.workingDays, data.data.deductions,
    );

    const payroll = await prisma.payroll.upsert({
      where: { employeeId_month_year: { employeeId: data.data.employeeId, month: data.data.month, year: data.data.year } },
      create: {
        organizationId: req.organizationId!,
        employeeId: data.data.employeeId,
        month: data.data.month, year: data.data.year,
        workingDays: data.data.workingDays, presentDays: data.data.presentDays,
        basicSalary: basicEarned, hra: hraToUse, allowances: allowancesToUse,
        deductions: data.data.deductions, pfDeduction, esiDeduction,
        grossSalary, netSalary, notes: data.data.notes,
      },
      update: {
        workingDays: data.data.workingDays, presentDays: data.data.presentDays,
        basicSalary: basicEarned, hra: hraToUse, allowances: allowancesToUse,
        deductions: data.data.deductions, pfDeduction, esiDeduction,
        grossSalary, netSalary, notes: data.data.notes,
      },
    });
    ok(res, payroll);
  } catch (e) { serverError(res, e); }
}

// ── Auto-generate payroll for ALL active employees ───────────
export async function autoGeneratePayroll(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { month, year, workingDays = 26 } = req.body as { month: number; year: number; workingDays?: number };
    if (!month || !year) { badRequest(res, "month and year are required"); return; }

    const employees = await prisma.employee.findMany({
      where: { organizationId: req.organizationId!, status: "ACTIVE" },
    });

    const results = await Promise.all(employees.map(async (emp) => {
      const { presentDays } = await countAttendanceDays(emp.id, month, year);
      const { basicEarned, grossSalary, pfDeduction, esiDeduction, netSalary } = calcPayroll(
        { salaryType: emp.salaryType, basicSalary: emp.basicSalary, dailyRate: emp.dailyRate, hra: emp.hra, allowances: emp.allowances },
        presentDays, workingDays, 0,
      );
      return prisma.payroll.upsert({
        where: { employeeId_month_year: { employeeId: emp.id, month, year } },
        create: {
          organizationId: req.organizationId!, employeeId: emp.id,
          month, year, workingDays, presentDays,
          basicSalary: basicEarned, hra: emp.hra, allowances: emp.allowances,
          deductions: 0, pfDeduction, esiDeduction, grossSalary, netSalary,
        },
        update: {
          workingDays, presentDays,
          basicSalary: basicEarned, hra: emp.hra, allowances: emp.allowances,
          deductions: 0, pfDeduction, esiDeduction, grossSalary, netSalary,
        },
      });
    }));

    const totalNetSalary = results.reduce((s, p) => s + p.netSalary, 0);
    ok(res, {
      generated: results.length,
      month, year,
      totalNetSalary,
      payrolls: results,
    }, `Payroll auto-generated for ${results.length} employees`);
  } catch (e) { serverError(res, e); }
}

export async function listPayrolls(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { month, year, employeeId } = req.query as Record<string, string>;
    const where: any = { organizationId: req.organizationId! };
    if (month) where.month = parseInt(month);
    if (year)  where.year  = parseInt(year);
    if (employeeId) where.employeeId = employeeId;
    const payrolls = await prisma.payroll.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeCode: true, designation: true, salaryType: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    ok(res, payrolls);
  } catch (e) { serverError(res, e); }
}

export async function markPayrollPaid(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const payroll = await prisma.payroll.findFirst({ where: { id, organizationId: req.organizationId! } });
    if (!payroll) { notFound(res, "Payroll not found"); return; }
    const updated = await prisma.payroll.update({ where: { id }, data: { isPaid: true, paidAt: new Date() } });
    ok(res, updated, "Marked as paid");
  } catch (e) { serverError(res, e); }
}

export async function createLeaveRequest(req: OrgRequest, res: Response): Promise<void> {
  try {
    const data = leaveSchema.safeParse(req.body);
    if (!data.success) { badRequest(res, "Invalid data", data.error.flatten()); return; }
    const from  = new Date(data.data.fromDate);
    const to    = new Date(data.data.toDate);
    const days  = Math.ceil((to.getTime() - from.getTime()) / (1000 * 86400)) + 1;
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
    const leave = await prisma.leaveRequest.findFirst({ where: { id: req.params.id as string, organizationId: req.organizationId! } });
    if (!leave) { notFound(res, "Leave request not found"); return; }
    const updated = await prisma.leaveRequest.update({ where: { id: req.params.id as string }, data: { status } });
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
    const now = new Date();
    const [total, active, onLeave, depts, monthPayrollTotal] = await Promise.all([
      prisma.employee.count({ where: { organizationId: req.organizationId! } }),
      prisma.employee.count({ where: { organizationId: req.organizationId!, status: "ACTIVE" } }),
      prisma.leaveRequest.count({
        where: { organizationId: req.organizationId!, status: "APPROVED", fromDate: { lte: now }, toDate: { gte: now } },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        where: { organizationId: req.organizationId!, status: "ACTIVE" },
        _count: true,
      }),
      prisma.payroll.aggregate({
        where: { organizationId: req.organizationId!, month: now.getMonth() + 1, year: now.getFullYear() },
        _sum: { netSalary: true },
      }),
    ]);
    ok(res, { total, active, onLeave, departments: depts, monthSalaryTotal: monthPayrollTotal._sum.netSalary || 0 });
  } catch (e) { serverError(res, e); }
}
