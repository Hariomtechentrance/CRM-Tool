// Public, unauthenticated clinic booking — the website page (/book/:orgSlug)
// and the WhatsApp bot (clinicBot.ts) both go through bookAppointment() here,
// so a slot booked one way is instantly reflected as taken on the other.
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ok, created, notFound, badRequest, serverError } from "../utils/response";
import { sendEmail } from "../utils/email";
import { computeAvailableSlots } from "../lib/clinicSlots";

const db = () => (prisma as any);

async function getOrgBySlug(slug: string) {
  return db().organization.findUnique({ where: { slug }, select: { id: true, name: true } });
}

// ── GET /api/public/clinic/:orgSlug — doctors open for self-booking ───────
export async function listPublicDoctors(req: Request, res: Response): Promise<void> {
  try {
    const org = await getOrgBySlug(req.params.orgSlug as string);
    if (!org) { notFound(res, "Clinic not found"); return; }

    const doctors = await db().doctor.findMany({
      where: { organizationId: org.id, isActive: true, isVerified: true, isPubliclyBookable: true },
      select: {
        id: true, name: true, specialization: true, qualification: true,
        consultationFee: true, availableDays: true, slotDuration: true,
        workStartTime: true, workEndTime: true, bio: true,
      },
      orderBy: { name: "asc" },
    });
    ok(res, { clinicName: org.name, doctors });
  } catch (err) { serverError(res, err); }
}

// ── GET /api/public/clinic/:orgSlug/slots?doctorId=&date= ─────────────────
export async function getPublicSlots(req: Request, res: Response): Promise<void> {
  try {
    const org = await getOrgBySlug(req.params.orgSlug as string);
    if (!org) { notFound(res, "Clinic not found"); return; }

    const { doctorId, date } = req.query as Record<string, string>;
    if (!doctorId || !date) { badRequest(res, "doctorId and date are required"); return; }

    const doctor = await db().doctor.findFirst({
      where: { id: doctorId, organizationId: org.id, isActive: true, isVerified: true, isPubliclyBookable: true },
    });
    if (!doctor) { notFound(res, "Doctor not found"); return; }

    const existing = await db().healthAppointment.findMany({
      where: { doctorId, appointmentDate: new Date(date + "T00:00:00Z"), status: { in: ["SCHEDULED", "CONFIRMED"] } },
      select: { timeSlot: true },
    });

    const slots = computeAvailableSlots(doctor, date, existing.map((a: { timeSlot: string }) => a.timeSlot));
    ok(res, { slots });
  } catch (err) { serverError(res, err); }
}

// Shared by the website booking endpoint and the WhatsApp bot — find-or-
// create the Patient by phone, re-check the slot (race safety against the
// GET the caller based their choice on), create the appointment, email a
// confirmation if we have an address to send it to.
export async function bookAppointment(
  orgId: string,
  orgName: string,
  input: { doctorId: string; date: string; timeSlot: string; name: string; phone: string; email?: string; chiefComplaint?: string },
): Promise<{ ok: true; appointmentNo: string; doctorName: string } | { ok: false; message: string }> {
  const doctor = await db().doctor.findFirst({
    where: { id: input.doctorId, organizationId: orgId, isActive: true, isVerified: true, isPubliclyBookable: true },
  });
  if (!doctor) return { ok: false, message: "Doctor not found or not open for booking" };

  const appointmentDate = new Date(input.date + "T00:00:00Z");
  const conflict = await db().healthAppointment.findFirst({
    where: { doctorId: input.doctorId, appointmentDate, timeSlot: input.timeSlot, status: { in: ["SCHEDULED", "CONFIRMED"] } },
  });
  if (conflict) return { ok: false, message: "That slot was just taken — please pick another." };

  let patient = await db().patient.findFirst({ where: { organizationId: orgId, phone: input.phone } });
  if (!patient) {
    const count = await db().patient.count({ where: { organizationId: orgId } });
    patient = await db().patient.create({
      data: {
        organizationId: orgId,
        patientCode: `PT-${String(count + 1).padStart(5, "0")}`,
        name: input.name.trim(),
        phone: input.phone,
        email: input.email || null,
      },
    });
  }

  const apptCount = await db().healthAppointment.count({ where: { organizationId: orgId } });
  const appointmentNo = `APT-${String(apptCount + 1).padStart(5, "0")}`;

  const appointment = await db().healthAppointment.create({
    data: {
      organizationId: orgId,
      appointmentNo,
      patientId: patient.id,
      doctorId: input.doctorId,
      appointmentDate,
      timeSlot: input.timeSlot,
      chiefComplaint: input.chiefComplaint || null,
      fee: doctor.consultationFee ? Number(doctor.consultationFee) : null,
    },
  });

  const emailTo = input.email || patient.email;
  if (emailTo) {
    const apptDateStr = appointmentDate.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
    sendEmail({
      to: emailTo,
      subject: `Appointment Confirmed — ${appointmentNo}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
          <div style="background:linear-gradient(135deg,#0f766e,#10b981);padding:20px 24px;border-radius:8px;margin-bottom:20px">
            <h2 style="color:white;margin:0;font-size:20px">Appointment Confirmed</h2>
            <p style="color:#d1fae5;margin:6px 0 0;font-size:13px">${orgName}</p>
          </div>
          <p style="color:#374151;font-size:14px">Dear <strong>${input.name}</strong>,</p>
          <p style="color:#374151;font-size:14px">Your appointment has been successfully booked.</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
            <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#6b7280;width:140px">Appointment No</td><td><strong>${appointmentNo}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Doctor</td><td><strong>${doctor.name}</strong> — ${doctor.specialization}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Date</td><td><strong>${apptDateStr}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Time</td><td><strong>${input.timeSlot}</strong></td></tr>
              ${input.chiefComplaint ? `<tr><td style="padding:6px 0;color:#6b7280">Complaint</td><td>${input.chiefComplaint}</td></tr>` : ""}
            </table>
          </div>
          <p style="color:#6b7280;font-size:12px;margin-top:16px">Your patient code: <strong>${patient.patientCode}</strong></p>
          <p style="color:#9ca3af;font-size:11px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px">${orgName} · Please arrive 10 minutes early.</p>
        </div>`,
    }).catch(() => {});
  }

  return { ok: true, appointmentNo, doctorName: doctor.name };
}

// ── POST /api/public/clinic/:orgSlug/book ──────────────────────────────────
export async function publicBookAppointment(req: Request, res: Response): Promise<void> {
  try {
    const org = await getOrgBySlug(req.params.orgSlug as string);
    if (!org) { notFound(res, "Clinic not found"); return; }

    const { doctorId, date, timeSlot, name, phone, email, chiefComplaint } = req.body as Record<string, string>;
    if (!doctorId || !date || !timeSlot || !name?.trim() || !phone?.trim()) {
      badRequest(res, "doctorId, date, timeSlot, name and phone are required"); return;
    }

    const result = await bookAppointment(org.id, org.name, { doctorId, date, timeSlot, name, phone, email, chiefComplaint });
    if (!result.ok) { badRequest(res, result.message); return; }
    created(res, { appointmentNo: result.appointmentNo, doctorName: result.doctorName }, "Appointment booked successfully");
  } catch (err) { serverError(res, err); }
}
