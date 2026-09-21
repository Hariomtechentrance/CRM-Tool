import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { ok, created, badRequest, notFound, serverError, conflict } from "../utils/response";
import { bustCache } from "../middleware/cacheMiddleware";

const db = () => (prisma as any);

// Zod's `.partial()` does NOT re-wrap a `.default(...)` field in `.optional()`
// — it already reports itself as optional, since it accepts a missing value.
// That means a key the caller never sent still gets filled in with its
// schema default on a PATCH (e.g. omitting `status` on an order update,
// which defaults to ORDER_PLACED, would silently reset it). Filtering the
// parsed result down to keys actually present on the raw request body keeps
// a partial update genuinely partial. Same fix as cars.controller.ts /
// projects.controller.ts.
function onlyProvided<T extends Record<string, unknown>>(body: Record<string, unknown>, parsed: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(body)) {
    if (key in parsed) out[key as keyof T] = parsed[key as keyof T];
  }
  return out;
}

async function generateOrderNumber(organizationId: string): Promise<string> {
  const rows = await db().tailorOrder.findMany({ where: { organizationId }, select: { orderNumber: true } });
  const taken = new Set(rows.map((r: { orderNumber: string }) => r.orderNumber));
  let max = 0;
  for (const r of rows) {
    const m = /^ORD-(\d+)$/i.exec(r.orderNumber.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  let n = max + 1;
  while (taken.has(`ORD-${String(n).padStart(4, "0")}`)) n += 1;
  return `ORD-${String(n).padStart(4, "0")}`;
}

// ── Validators ───────────────────────────────────────────────
const GARMENT_TYPES = ["SHIRT", "TROUSER", "BLOUSE", "LEHENGA", "SHERWANI", "KURTA", "SUIT", "SAREE_FALL", "ALTERATION", "OTHER"] as const;

const customerSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const measurementProfileSchema = z.object({
  customerId: z.string().min(1),
  garmentType: z.enum(GARMENT_TYPES),
  label: z.string().optional(),
  chest: z.number().optional(),
  waist: z.number().optional(),
  hip: z.number().optional(),
  shoulder: z.number().optional(),
  sleeveLength: z.number().optional(),
  length: z.number().optional(),
  extraMeasurements: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  customerId: z.string().min(1),
  orderNumber: z.string().optional(), // blank → auto-generated (ORD-####)
  garmentType: z.enum(GARMENT_TYPES),
  measurementProfileId: z.string().optional(),
  measurements: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  quantity: z.number().int().min(1).default(1),
  fabricProvidedBy: z.enum(["CUSTOMER", "SHOP"]).default("CUSTOMER"),
  fabricDetails: z.string().optional(),
  styleNotes: z.string().optional(),
  price: z.number().min(0).optional(),
  advancePaid: z.number().min(0).optional(),
  status: z.enum(["ORDER_PLACED", "CUTTING", "STITCHING", "TRIAL", "ALTERATION", "READY", "DELIVERED", "CANCELLED"]).default("ORDER_PLACED"),
  orderDate: z.string().optional(),
  trialDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  deliveredAt: z.string().optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════
// Customers
// ═══════════════════════════════════════════════════════════════

export async function listCustomers(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { organizationId: req.organizationId! };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    const [customers, total] = await Promise.all([
      db().tailorCustomer.findMany({
        where, skip, take: parseInt(limit),
        include: { _count: { select: { orders: true, measurementProfiles: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db().tailorCustomer.count({ where }),
    ]);
    ok(res, { customers, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { serverError(res, e); }
}

export async function getCustomer(req: OrgRequest, res: Response): Promise<void> {
  try {
    const customer = await db().tailorCustomer.findFirst({
      where: { id: req.params.id, organizationId: req.organizationId! },
      include: {
        measurementProfiles: { orderBy: { createdAt: "desc" } },
        orders: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!customer) { notFound(res, "Customer not found"); return; }
    ok(res, customer);
  } catch (e) { serverError(res, e); }
}

export async function createCustomer(req: OrgRequest, res: Response): Promise<void> {
  try {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }
    const v = parsed.data;
    const customer = await db().tailorCustomer.create({
      data: {
        organizationId: req.organizationId!,
        name: v.name, gender: v.gender, phone: v.phone, email: v.email || undefined, address: v.address, notes: v.notes,
      },
    });
    bustCache(req.organizationId!, "/api/tailoring");
    created(res, customer, "Customer added");
  } catch (e) { serverError(res, e); }
}

export async function updateCustomer(req: OrgRequest, res: Response): Promise<void> {
  try {
    const existing = await db().tailorCustomer.findFirst({ where: { id: req.params.id, organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Customer not found"); return; }
    const parsed = customerSchema.partial().safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }
    const data = onlyProvided(req.body, parsed.data);
    const customer = await db().tailorCustomer.update({
      where: { id: existing.id },
      data: { ...data, email: data.email === "" ? null : data.email },
    });
    bustCache(req.organizationId!, "/api/tailoring");
    ok(res, customer, "Customer updated");
  } catch (e) { serverError(res, e); }
}

export async function deleteCustomer(req: OrgRequest, res: Response): Promise<void> {
  try {
    const existing = await db().tailorCustomer.findFirst({ where: { id: req.params.id, organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Customer not found"); return; }
    const orderCount = await db().tailorOrder.count({ where: { customerId: existing.id } });
    if (orderCount > 0) { conflict(res, `Cannot delete — this customer has ${orderCount} order(s) on record. Remove those first if you really need to delete the customer.`); return; }
    await db().tailorCustomer.delete({ where: { id: existing.id } });
    bustCache(req.organizationId!, "/api/tailoring");
    ok(res, null, "Customer deleted");
  } catch (e) { serverError(res, e); }
}

// ═══════════════════════════════════════════════════════════════
// Measurement Profiles
// ═══════════════════════════════════════════════════════════════

export async function listMeasurementProfiles(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { customerId } = req.query as Record<string, string>;
    const where: any = { organizationId: req.organizationId! };
    if (customerId) where.customerId = customerId;
    const profiles = await db().tailorMeasurementProfile.findMany({ where, orderBy: { createdAt: "desc" } });
    ok(res, { profiles });
  } catch (e) { serverError(res, e); }
}

export async function createMeasurementProfile(req: OrgRequest, res: Response): Promise<void> {
  try {
    const parsed = measurementProfileSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }
    const v = parsed.data;
    const customer = await db().tailorCustomer.findFirst({ where: { id: v.customerId, organizationId: req.organizationId! } });
    if (!customer) { badRequest(res, "Customer not found"); return; }
    const profile = await db().tailorMeasurementProfile.create({
      data: {
        organizationId: req.organizationId!,
        customerId: v.customerId, garmentType: v.garmentType, label: v.label,
        chest: v.chest, waist: v.waist, hip: v.hip, shoulder: v.shoulder,
        sleeveLength: v.sleeveLength, length: v.length,
        extraMeasurements: v.extraMeasurements ?? undefined,
        notes: v.notes,
      },
    });
    bustCache(req.organizationId!, "/api/tailoring");
    created(res, profile, "Measurement profile saved");
  } catch (e) { serverError(res, e); }
}

export async function updateMeasurementProfile(req: OrgRequest, res: Response): Promise<void> {
  try {
    const existing = await db().tailorMeasurementProfile.findFirst({ where: { id: req.params.id, organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Measurement profile not found"); return; }
    const parsed = measurementProfileSchema.partial().safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }
    const data = onlyProvided(req.body, parsed.data);
    const profile = await db().tailorMeasurementProfile.update({ where: { id: existing.id }, data });
    bustCache(req.organizationId!, "/api/tailoring");
    ok(res, profile, "Measurement profile updated");
  } catch (e) { serverError(res, e); }
}

export async function deleteMeasurementProfile(req: OrgRequest, res: Response): Promise<void> {
  try {
    const existing = await db().tailorMeasurementProfile.findFirst({ where: { id: req.params.id, organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Measurement profile not found"); return; }
    await db().tailorMeasurementProfile.delete({ where: { id: existing.id } });
    bustCache(req.organizationId!, "/api/tailoring");
    ok(res, null, "Measurement profile deleted");
  } catch (e) { serverError(res, e); }
}

// ═══════════════════════════════════════════════════════════════
// Orders
// ═══════════════════════════════════════════════════════════════

export async function listOrders(req: OrgRequest, res: Response): Promise<void> {
  try {
    const { status, customerId, search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { organizationId: req.organizationId! };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search } } },
      ];
    }
    const [orders, total] = await Promise.all([
      db().tailorOrder.findMany({
        where, skip, take: parseInt(limit),
        include: { customer: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db().tailorOrder.count({ where }),
    ]);
    ok(res, { orders, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { serverError(res, e); }
}

export async function getOrder(req: OrgRequest, res: Response): Promise<void> {
  try {
    const order = await db().tailorOrder.findFirst({
      where: { id: req.params.id, organizationId: req.organizationId! },
      include: { customer: true, measurementProfile: true },
    });
    if (!order) { notFound(res, "Order not found"); return; }
    ok(res, order);
  } catch (e) { serverError(res, e); }
}

export async function createOrder(req: OrgRequest, res: Response): Promise<void> {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }
    const v = parsed.data;
    const orgId = req.organizationId!;

    const customer = await db().tailorCustomer.findFirst({ where: { id: v.customerId, organizationId: orgId } });
    if (!customer) { badRequest(res, "Customer not found"); return; }

    // Snapshot measurements at order time — from the given profile if one
    // was picked (so a later edit to the saved profile never silently
    // changes this order's record), else whatever was typed directly.
    let measurements = v.measurements;
    if (v.measurementProfileId && !measurements) {
      const profile = await db().tailorMeasurementProfile.findFirst({ where: { id: v.measurementProfileId, organizationId: orgId } });
      if (profile) {
        measurements = {
          ...(profile.chest != null && { chest: profile.chest }),
          ...(profile.waist != null && { waist: profile.waist }),
          ...(profile.hip != null && { hip: profile.hip }),
          ...(profile.shoulder != null && { shoulder: profile.shoulder }),
          ...(profile.sleeveLength != null && { sleeveLength: profile.sleeveLength }),
          ...(profile.length != null && { length: profile.length }),
          ...(profile.extraMeasurements as object || {}),
        };
      }
    }

    const orderNumber = v.orderNumber?.trim() || await generateOrderNumber(orgId);
    const exists = await db().tailorOrder.findFirst({ where: { organizationId: orgId, orderNumber } });
    if (exists) { conflict(res, `Order number ${orderNumber} already exists.`); return; }

    const order = await db().tailorOrder.create({
      data: {
        organizationId: orgId,
        orderNumber, customerId: v.customerId, garmentType: v.garmentType,
        measurementProfileId: v.measurementProfileId || undefined,
        measurements: measurements ?? undefined,
        quantity: v.quantity, fabricProvidedBy: v.fabricProvidedBy, fabricDetails: v.fabricDetails,
        styleNotes: v.styleNotes, price: v.price, advancePaid: v.advancePaid, status: v.status,
        orderDate: v.orderDate ? new Date(v.orderDate) : undefined,
        trialDate: v.trialDate ? new Date(v.trialDate) : undefined,
        expectedDeliveryDate: v.expectedDeliveryDate ? new Date(v.expectedDeliveryDate) : undefined,
        deliveredAt: v.deliveredAt ? new Date(v.deliveredAt) : undefined,
        assignedToId: v.assignedToId || undefined, notes: v.notes,
      },
    });
    bustCache(req.organizationId!, "/api/tailoring");
    created(res, order, "Order created");
  } catch (e) { serverError(res, e); }
}

export async function updateOrder(req: OrgRequest, res: Response): Promise<void> {
  try {
    const existing = await db().tailorOrder.findFirst({ where: { id: req.params.id, organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Order not found"); return; }
    const parsed = orderSchema.partial().safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }
    const data = onlyProvided(req.body, parsed.data);

    if (data.orderNumber && data.orderNumber !== existing.orderNumber) {
      const dupe = await db().tailorOrder.findFirst({ where: { organizationId: req.organizationId!, orderNumber: data.orderNumber, id: { not: existing.id } } });
      if (dupe) { conflict(res, `Order number ${data.orderNumber} already exists.`); return; }
    }

    // Auto-stamp deliveredAt the moment status flips to DELIVERED, if the
    // caller didn't explicitly set one themselves.
    const deliveredAt = data.deliveredAt !== undefined
      ? (data.deliveredAt ? new Date(data.deliveredAt) : null)
      : (data.status === "DELIVERED" && !existing.deliveredAt ? new Date() : undefined);

    const order = await db().tailorOrder.update({
      where: { id: existing.id },
      data: {
        ...data,
        orderDate: data.orderDate !== undefined ? (data.orderDate ? new Date(data.orderDate) : null) : undefined,
        trialDate: data.trialDate !== undefined ? (data.trialDate ? new Date(data.trialDate) : null) : undefined,
        expectedDeliveryDate: data.expectedDeliveryDate !== undefined ? (data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null) : undefined,
        deliveredAt,
      },
    });
    bustCache(req.organizationId!, "/api/tailoring");
    ok(res, order, "Order updated");
  } catch (e) { serverError(res, e); }
}

export async function deleteOrder(req: OrgRequest, res: Response): Promise<void> {
  try {
    const existing = await db().tailorOrder.findFirst({ where: { id: req.params.id, organizationId: req.organizationId! } });
    if (!existing) { notFound(res, "Order not found"); return; }
    await db().tailorOrder.delete({ where: { id: existing.id } });
    bustCache(req.organizationId!, "/api/tailoring");
    ok(res, null, "Order deleted");
  } catch (e) { serverError(res, e); }
}

// ═══════════════════════════════════════════════════════════════
// Dashboard / reminders
// ═══════════════════════════════════════════════════════════════

export async function getTailoringStats(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const in7Days = new Date(Date.now() + 7 * 86400_000);
    const [totalOrders, pending, trialsDue, deliveriesDue, totalCustomers, revenueAgg] = await Promise.all([
      db().tailorOrder.count({ where: { organizationId: orgId } }),
      db().tailorOrder.count({ where: { organizationId: orgId, status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
      db().tailorOrder.count({ where: { organizationId: orgId, trialDate: { lte: in7Days }, status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
      db().tailorOrder.count({ where: { organizationId: orgId, expectedDeliveryDate: { lte: in7Days }, status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
      db().tailorCustomer.count({ where: { organizationId: orgId } }),
      db().tailorOrder.aggregate({ where: { organizationId: orgId, status: { not: "CANCELLED" } }, _sum: { price: true, advancePaid: true } }),
    ]);
    const totalRevenue = revenueAgg._sum.price || 0;
    const totalCollected = revenueAgg._sum.advancePaid || 0;
    ok(res, {
      totalOrders, pending, trialsDue, deliveriesDue, totalCustomers,
      totalRevenue, totalCollected, totalOutstanding: Math.max(0, totalRevenue - totalCollected),
    });
  } catch (e) { serverError(res, e); }
}

// Trials/deliveries due within 7 days or already overdue — drives the
// reminder panel, same "due" convention as Cars' insurance-expiry panel.
export async function listDueOrders(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const in7Days = new Date(Date.now() + 7 * 86400_000);
    const [trialsDue, deliveriesDue] = await Promise.all([
      db().tailorOrder.findMany({
        where: { organizationId: orgId, trialDate: { lte: in7Days, not: null }, status: { notIn: ["DELIVERED", "CANCELLED"] } },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { trialDate: "asc" },
      }),
      db().tailorOrder.findMany({
        where: { organizationId: orgId, expectedDeliveryDate: { lte: in7Days, not: null }, status: { notIn: ["DELIVERED", "CANCELLED"] } },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { expectedDeliveryDate: "asc" },
      }),
    ]);
    ok(res, { trialsDue, deliveriesDue });
  } catch (e) { serverError(res, e); }
}
