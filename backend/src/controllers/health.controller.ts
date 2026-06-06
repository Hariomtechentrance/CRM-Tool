import { Response } from "express";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { ok, created, notFound, badRequest, serverError } from "../utils/response";

const db = () => (prisma as any);

// ────────────────────────────────────────────────────────
//  PATIENTS
// ────────────────────────────────────────────────────────

export async function listPatients(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      organizationId: orgId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { patientCode: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [patients, total] = await Promise.all([
      db().patient.findMany({
        where,
        include: {
          _count: { select: { visits: true, prescriptions: true, labReports: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db().patient.count({ where }),
    ]);

    ok(res, { patients, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    serverError(res, err);
  }
}

export async function getPatient(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;

    const patient = await db().patient.findFirst({
      where: { id, organizationId: orgId },
      include: {
        visits: { orderBy: { visitDate: "desc" }, take: 10 },
        prescriptions: { orderBy: { createdAt: "desc" }, take: 5 },
        labReports: { orderBy: { conductedAt: "desc" }, take: 5 },
      },
    });

    if (!patient) { notFound(res, "Patient not found"); return; }
    ok(res, patient);
  } catch (err) {
    serverError(res, err);
  }
}

export async function createPatient(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { name, dob, gender, bloodGroup, phone, email, address,
            emergencyName, emergencyPhone, allergies, chronicConds, notes } = req.body;

    if (!name?.trim()) { badRequest(res, "Patient name is required"); return; }

    // Auto-generate patient code
    const count = await db().patient.count({ where: { organizationId: orgId } });
    const patientCode = `PT-${String(count + 1).padStart(5, "0")}`;

    const patient = await db().patient.create({
      data: {
        organizationId: orgId,
        patientCode,
        name: name.trim(),
        dob: dob ? new Date(dob) : null,
        gender: gender ?? null,
        bloodGroup: bloodGroup ?? null,
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
        emergencyName: emergencyName ?? null,
        emergencyPhone: emergencyPhone ?? null,
        allergies: Array.isArray(allergies) ? allergies : [],
        chronicConds: Array.isArray(chronicConds) ? chronicConds : [],
        notes: notes ?? null,
      },
    });

    created(res, patient);
  } catch (err) {
    serverError(res, err);
  }
}

export async function updatePatient(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;
    const existing = await db().patient.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) { notFound(res, "Patient not found"); return; }

    const fields = ["name", "dob", "gender", "bloodGroup", "phone", "email", "address",
      "emergencyName", "emergencyPhone", "allergies", "chronicConds", "notes", "isActive"];
    const data: Record<string, any> = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        data[f] = f === "dob" ? (req.body[f] ? new Date(req.body[f]) : null) : req.body[f];
      }
    }

    const updated = await db().patient.update({ where: { id }, data });
    ok(res, updated);
  } catch (err) {
    serverError(res, err);
  }
}

// ────────────────────────────────────────────────────────
//  PATIENT VISITS
// ────────────────────────────────────────────────────────

export async function listVisits(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { patientId, doctorId, from, to } = req.query as Record<string, string>;

    const visits = await db().patientVisit.findMany({
      where: {
        organizationId: orgId,
        ...(patientId && { patientId }),
        ...(doctorId && { doctorId }),
        ...(from || to ? { visitDate: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true, phone: true } },
        prescriptions: { select: { id: true, createdAt: true } },
      },
      orderBy: { visitDate: "desc" },
    });

    ok(res, visits);
  } catch (err) {
    serverError(res, err);
  }
}

export async function createVisit(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { patientId, visitDate, visitType, doctorId, chiefComplaint, diagnosis,
            vitalsBP, vitalsPulse, vitalsTemp, vitalsWeight, vitalsHeight, vitalsSpO2,
            notes, followUpDate } = req.body;

    if (!patientId) { badRequest(res, "patientId is required"); return; }

    const patient = await db().patient.findFirst({ where: { id: patientId, organizationId: orgId } });
    if (!patient) { notFound(res, "Patient not found"); return; }

    const visit = await db().patientVisit.create({
      data: {
        organizationId: orgId,
        patientId,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        visitType: visitType ?? "OPD",
        doctorId: doctorId ?? null,
        chiefComplaint: chiefComplaint ?? null,
        diagnosis: diagnosis ?? null,
        vitalsBP: vitalsBP ?? null,
        vitalsPulse: vitalsPulse ? Number(vitalsPulse) : null,
        vitalsTemp: vitalsTemp ? Number(vitalsTemp) : null,
        vitalsWeight: vitalsWeight ? Number(vitalsWeight) : null,
        vitalsHeight: vitalsHeight ? Number(vitalsHeight) : null,
        vitalsSpO2: vitalsSpO2 ? Number(vitalsSpO2) : null,
        notes: notes ?? null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });

    created(res, visit);
  } catch (err) {
    serverError(res, err);
  }
}

export async function updateVisit(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;
    const existing = await db().patientVisit.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) { notFound(res, "Visit not found"); return; }

    const fields = ["visitType", "doctorId", "chiefComplaint", "diagnosis",
      "vitalsBP", "vitalsPulse", "vitalsTemp", "vitalsWeight", "vitalsHeight", "vitalsSpO2",
      "notes", "followUpDate"];
    const data: Record<string, any> = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "followUpDate") data[f] = req.body[f] ? new Date(req.body[f]) : null;
        else if (["vitalsPulse", "vitalsSpO2"].includes(f)) data[f] = req.body[f] ? Number(req.body[f]) : null;
        else if (["vitalsTemp", "vitalsWeight", "vitalsHeight"].includes(f)) data[f] = req.body[f] ? Number(req.body[f]) : null;
        else data[f] = req.body[f];
      }
    }

    const updated = await db().patientVisit.update({ where: { id }, data });
    ok(res, updated);
  } catch (err) {
    serverError(res, err);
  }
}

// ────────────────────────────────────────────────────────
//  PRESCRIPTIONS
// ────────────────────────────────────────────────────────

export async function listPrescriptions(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { patientId } = req.query as Record<string, string>;

    const prescriptions = await db().prescription.findMany({
      where: {
        organizationId: orgId,
        ...(patientId && { patientId }),
      },
      include: { patient: { select: { id: true, name: true, patientCode: true } } },
      orderBy: { createdAt: "desc" },
    });
    ok(res, prescriptions);
  } catch (err) {
    serverError(res, err);
  }
}

export async function createPrescription(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { patientId, visitId, medicines, instructions, diet, followUpDays, validUntil } = req.body;

    if (!patientId) { badRequest(res, "patientId is required"); return; }

    const patient = await db().patient.findFirst({ where: { id: patientId, organizationId: orgId } });
    if (!patient) { notFound(res, "Patient not found"); return; }

    const prescription = await db().prescription.create({
      data: {
        organizationId: orgId,
        patientId,
        visitId: visitId ?? null,
        doctorId: req.userId ?? null,
        medicines: medicines ?? [],
        instructions: instructions ?? null,
        diet: diet ?? null,
        followUpDays: followUpDays ? Number(followUpDays) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    created(res, prescription);
  } catch (err) {
    serverError(res, err);
  }
}

// ────────────────────────────────────────────────────────
//  LAB REPORTS
// ────────────────────────────────────────────────────────

export async function listLabReports(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { patientId } = req.query as Record<string, string>;

    const reports = await db().labReport.findMany({
      where: {
        organizationId: orgId,
        ...(patientId && { patientId }),
      },
      include: { patient: { select: { id: true, name: true, patientCode: true } } },
      orderBy: { conductedAt: "desc" },
    });
    ok(res, reports);
  } catch (err) {
    serverError(res, err);
  }
}

export async function createLabReport(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { patientId, visitId, testName, testCategory, results, normalRange, interpretation, conductedAt, fileUrl } = req.body;

    if (!patientId || !testName?.trim()) { badRequest(res, "patientId and testName are required"); return; }

    const patient = await db().patient.findFirst({ where: { id: patientId, organizationId: orgId } });
    if (!patient) { notFound(res, "Patient not found"); return; }

    const report = await db().labReport.create({
      data: {
        organizationId: orgId,
        patientId,
        visitId: visitId ?? null,
        testName: testName.trim(),
        testCategory: testCategory ?? null,
        results: results ?? {},
        normalRange: normalRange ?? null,
        interpretation: interpretation ?? null,
        technicianId: req.userId ?? null,
        conductedAt: conductedAt ? new Date(conductedAt) : new Date(),
        fileUrl: fileUrl ?? null,
      },
    });

    created(res, report);
  } catch (err) {
    serverError(res, err);
  }
}

// ────────────────────────────────────────────────────────
//  HEALTH DASHBOARD STATS
// ────────────────────────────────────────────────────────

export async function getHealthStats(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalPatients, todayVisits, totalPrescriptions, pendingFollowUps] = await Promise.all([
      db().patient.count({ where: { organizationId: orgId, isActive: true } }),
      db().patientVisit.count({ where: { organizationId: orgId, visitDate: { gte: today, lt: tomorrow } } }),
      db().prescription.count({ where: { organizationId: orgId } }),
      db().patientVisit.count({
        where: { organizationId: orgId, followUpDate: { gte: today }, followUpDate_lte: new Date(today.getTime() + 7 * 86400000) },
      }).catch(() => 0),
    ]);

    ok(res, { totalPatients, todayVisits, totalPrescriptions, pendingFollowUps });
  } catch (err) {
    serverError(res, err);
  }
}
