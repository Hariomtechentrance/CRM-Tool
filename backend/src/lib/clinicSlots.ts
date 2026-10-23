// Shared slot-availability logic for clinic self-booking — the public
// website page and the WhatsApp bot both call this, so what's "free" can
// never drift between the two channels.

const WEEKDAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export interface DoctorSlotConfig {
  availableDays: string[];
  slotDuration: number;
  workStartTime: string | null;
  workEndTime: string | null;
}

// dateStr: "YYYY-MM-DD". Returns "HH:MM" slots in ascending order, e.g.
// ["10:00", "10:30", ...], already filtered down to what's actually bookable
// (right weekday, inside working hours, not already taken, not in the past
// if the date is today — "today" compared in UTC, same as the date string
// this expects, so it's internally consistent even where it's not exactly
// midnight IST).
export function computeAvailableSlots(doctor: DoctorSlotConfig, dateStr: string, bookedTimeSlots: string[]): string[] {
  if (!doctor.workStartTime || !doctor.workEndTime || !doctor.slotDuration) return [];

  const date = new Date(dateStr + "T00:00:00Z");
  if (isNaN(date.getTime())) return [];
  const weekday = WEEKDAY_NAMES[date.getUTCDay()];
  if (!doctor.availableDays.map(d => d.toUpperCase()).includes(weekday)) return [];

  const [startH, startM] = doctor.workStartTime.split(":").map(Number);
  const [endH, endM] = doctor.workEndTime.split(":").map(Number);
  if ([startH, startM, endH, endM].some(n => Number.isNaN(n))) return [];

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const booked = new Set(bookedTimeSlots);

  const now = new Date();
  const isToday = dateStr === now.toISOString().slice(0, 10);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const slots: string[] = [];
  for (let m = startMinutes; m + doctor.slotDuration <= endMinutes; m += doctor.slotDuration) {
    if (isToday && m <= nowMinutes) continue;
    const slot = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    if (!booked.has(slot)) slots.push(slot);
  }
  return slots;
}
