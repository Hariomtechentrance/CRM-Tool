// WhatsApp appointment-booking bot. Called from handleWebhook() in
// whatsapp.controller.ts for inbound messages. Each webhook call is
// stateless, so WhatsAppBookingSession is the bot's only memory of where a
// phone number is mid-conversation — sessions older than 15 minutes are
// treated as expired and the flow restarts.
import { prisma } from "./prisma";
import { sendViaApi } from "../controllers/whatsapp.controller";
import { computeAvailableSlots } from "./clinicSlots";
import { bookAppointment } from "../controllers/publicHealth.controller";

const db = () => (prisma as any);

const SESSION_TTL_MS = 15 * 60 * 1000;
const TRIGGER_WORDS = ["book", "appointment", "hi", "hello", "hey"];

async function reply(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<void> {
  try {
    await sendViaApi(phoneNumberId, accessToken, to, { type: "text", text: { body: text, preview_url: false } });
  } catch (e) {
    console.error("[clinicBot] reply failed:", e);
  }
}

async function clearSession(organizationId: string, phone: string): Promise<void> {
  await db().whatsAppBookingSession.deleteMany({ where: { organizationId, phone } });
}

function parseDateInput(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  const today = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  if (s === "today") return toISO(today);
  if (s === "tomorrow") return toISO(new Date(today.getTime() + 86400000));

  // DD-MM-YYYY or DD/MM/YYYY
  let m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

interface Config { phoneNumberId: string; accessToken: string; organizationId: string }

// Returns true if this message was handled by the booking bot (caller should
// not also log/process it as a plain inbound message), false if it wasn't
// bot-related at all.
export async function handleClinicBotMessage(config: Config, fromPhone: string, text: string): Promise<boolean> {
  const { organizationId } = config;
  const trimmed = (text || "").trim();
  const lower = trimmed.toLowerCase();

  let session = await db().whatsAppBookingSession.findUnique({
    where: { organizationId_phone: { organizationId, phone: fromPhone } },
  });
  if (session && Date.now() - new Date(session.updatedAt).getTime() > SESSION_TTL_MS) {
    await clearSession(organizationId, fromPhone);
    session = null;
  }

  if (lower === "cancel" && session) {
    await clearSession(organizationId, fromPhone);
    await reply(config.phoneNumberId, config.accessToken, fromPhone, "Booking cancelled. Send \"book\" any time to start again.");
    return true;
  }

  if (!session) {
    if (!TRIGGER_WORDS.includes(lower)) return false; // not a booking-related message at all

    const doctors = await db().doctor.findMany({
      where: { organizationId, isActive: true, isVerified: true, isPubliclyBookable: true },
      select: { id: true, name: true, specialization: true },
      orderBy: { name: "asc" },
    });
    if (doctors.length === 0) {
      await reply(config.phoneNumberId, config.accessToken, fromPhone, "Sorry, online booking isn't available right now. Please call us directly.");
      return true;
    }

    session = await db().whatsAppBookingSession.create({
      data: { organizationId, phone: fromPhone, step: "CHOOSE_DOCTOR" },
    });
    const list = doctors.map((d: any, i: number) => `${i + 1}. ${d.name} — ${d.specialization}`).join("\n");
    await reply(config.phoneNumberId, config.accessToken, fromPhone,
      `Welcome! Let's book your appointment.\n\nWhich doctor would you like to see?\n${list}\n\nReply with a number.`);
    return true;
  }

  // ── CHOOSE_DOCTOR ──────────────────────────────────────────
  if (session.step === "CHOOSE_DOCTOR") {
    const doctors = await db().doctor.findMany({
      where: { organizationId, isActive: true, isVerified: true, isPubliclyBookable: true },
      select: { id: true, name: true, specialization: true },
      orderBy: { name: "asc" },
    });
    const idx = parseInt(trimmed, 10) - 1;
    const chosen = doctors[idx];
    if (!chosen) {
      await reply(config.phoneNumberId, config.accessToken, fromPhone, `Please reply with a number from 1 to ${doctors.length}.`);
      return true;
    }
    await db().whatsAppBookingSession.update({ where: { id: session.id }, data: { step: "CHOOSE_DATE", doctorId: chosen.id } });
    await reply(config.phoneNumberId, config.accessToken, fromPhone,
      `Great, ${chosen.name}. Which date? (e.g. 25-10-2026, or "today" / "tomorrow")`);
    return true;
  }

  // ── CHOOSE_DATE ────────────────────────────────────────────
  if (session.step === "CHOOSE_DATE") {
    const dateStr = parseDateInput(trimmed);
    if (!dateStr) {
      await reply(config.phoneNumberId, config.accessToken, fromPhone, "I didn't understand that date. Try DD-MM-YYYY, \"today\" or \"tomorrow\".");
      return true;
    }
    const doctor = await db().doctor.findUnique({ where: { id: session.doctorId } });
    const existing = await db().healthAppointment.findMany({
      where: { doctorId: session.doctorId, appointmentDate: new Date(dateStr + "T00:00:00Z"), status: { in: ["SCHEDULED", "CONFIRMED"] } },
      select: { timeSlot: true },
    });
    const slots = computeAvailableSlots(doctor, dateStr, existing.map((a: { timeSlot: string }) => a.timeSlot));
    if (slots.length === 0) {
      await reply(config.phoneNumberId, config.accessToken, fromPhone, `No open slots on ${dateStr} for ${doctor.name}. Try another date.`);
      return true;
    }
    await db().whatsAppBookingSession.update({ where: { id: session.id }, data: { step: "CHOOSE_SLOT", date: dateStr } });
    const list = slots.map((s, i) => `${i + 1}. ${s}`).join("\n");
    await reply(config.phoneNumberId, config.accessToken, fromPhone,
      `Available slots on ${dateStr}:\n${list}\n\nReply with a number, or send a different date to see other days.`);
    return true;
  }

  // ── CHOOSE_SLOT ────────────────────────────────────────────
  if (session.step === "CHOOSE_SLOT") {
    // A fresh date also lands here (switching days without restarting) —
    // only treat a bare number as a slot pick, anything else as a new date.
    const asNumber = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
    const doctor = await db().doctor.findUnique({ where: { id: session.doctorId } });

    if (asNumber === null) {
      const dateStr = parseDateInput(trimmed);
      if (!dateStr) {
        await reply(config.phoneNumberId, config.accessToken, fromPhone, "Reply with a slot number, or send a date like DD-MM-YYYY to see another day.");
        return true;
      }
      const existing = await db().healthAppointment.findMany({
        where: { doctorId: session.doctorId, appointmentDate: new Date(dateStr + "T00:00:00Z"), status: { in: ["SCHEDULED", "CONFIRMED"] } },
        select: { timeSlot: true },
      });
      const slots = computeAvailableSlots(doctor, dateStr, existing.map((a: { timeSlot: string }) => a.timeSlot));
      if (slots.length === 0) {
        await reply(config.phoneNumberId, config.accessToken, fromPhone, `No open slots on ${dateStr} for ${doctor.name}. Try another date.`);
        return true;
      }
      await db().whatsAppBookingSession.update({ where: { id: session.id }, data: { date: dateStr } });
      const list = slots.map((s, i) => `${i + 1}. ${s}`).join("\n");
      await reply(config.phoneNumberId, config.accessToken, fromPhone, `Available slots on ${dateStr}:\n${list}\n\nReply with a number.`);
      return true;
    }

    const existing = await db().healthAppointment.findMany({
      where: { doctorId: session.doctorId, appointmentDate: new Date(session.date + "T00:00:00Z"), status: { in: ["SCHEDULED", "CONFIRMED"] } },
      select: { timeSlot: true },
    });
    const slots = computeAvailableSlots(doctor, session.date, existing.map((a: { timeSlot: string }) => a.timeSlot));
    const chosenSlot = slots[asNumber - 1];
    if (!chosenSlot) {
      await reply(config.phoneNumberId, config.accessToken, fromPhone, `Please reply with a number from 1 to ${slots.length}.`);
      return true;
    }

    const patient = await db().patient.findFirst({ where: { organizationId, phone: fromPhone } });
    if (patient) {
      await db().whatsAppBookingSession.update({ where: { id: session.id }, data: { step: "CONFIRM", timeSlot: chosenSlot, name: patient.name } });
      await reply(config.phoneNumberId, config.accessToken, fromPhone,
        `Confirm booking:\nDoctor: ${doctor.name}\nDate: ${session.date}\nTime: ${chosenSlot}\nName: ${patient.name}\n\nReply YES to confirm or NO to cancel.`);
    } else {
      await db().whatsAppBookingSession.update({ where: { id: session.id }, data: { step: "ENTER_NAME", timeSlot: chosenSlot } });
      await reply(config.phoneNumberId, config.accessToken, fromPhone, "What's your full name for the booking?");
    }
    return true;
  }

  // ── ENTER_NAME ─────────────────────────────────────────────
  if (session.step === "ENTER_NAME") {
    if (!trimmed) {
      await reply(config.phoneNumberId, config.accessToken, fromPhone, "Please send your full name.");
      return true;
    }
    const doctor = await db().doctor.findUnique({ where: { id: session.doctorId } });
    await db().whatsAppBookingSession.update({ where: { id: session.id }, data: { step: "CONFIRM", name: trimmed } });
    await reply(config.phoneNumberId, config.accessToken, fromPhone,
      `Confirm booking:\nDoctor: ${doctor.name}\nDate: ${session.date}\nTime: ${session.timeSlot}\nName: ${trimmed}\n\nReply YES to confirm or NO to cancel.`);
    return true;
  }

  // ── CONFIRM ────────────────────────────────────────────────
  if (session.step === "CONFIRM") {
    if (lower === "no") {
      await clearSession(organizationId, fromPhone);
      await reply(config.phoneNumberId, config.accessToken, fromPhone, "No problem, booking cancelled. Send \"book\" any time to start again.");
      return true;
    }
    if (lower !== "yes" && lower !== "y") {
      await reply(config.phoneNumberId, config.accessToken, fromPhone, "Reply YES to confirm or NO to cancel.");
      return true;
    }

    const org = await db().organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const result = await bookAppointment(organizationId, org.name, {
      doctorId: session.doctorId, date: session.date, timeSlot: session.timeSlot, name: session.name, phone: fromPhone,
    });
    await clearSession(organizationId, fromPhone);

    if (!result.ok) {
      await reply(config.phoneNumberId, config.accessToken, fromPhone, `Sorry, that didn't go through: ${result.message} Send "book" to try again.`);
      return true;
    }
    await reply(config.phoneNumberId, config.accessToken, fromPhone,
      `Appointment confirmed! Your appointment number is ${result.appointmentNo} with ${result.doctorName}. See you then!`);
    return true;
  }

  return false;
}
