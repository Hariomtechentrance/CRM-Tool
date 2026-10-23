import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

interface Doctor {
  id: string; name: string; specialization: string; qualification: string;
  consultationFee?: number | null; bio?: string | null;
}

type Step = "doctors" | "slots" | "details" | "confirmed";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BookAppointmentPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [step, setStep] = useState<Step>("doctors");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [timeSlot, setTimeSlot] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [appointmentNo, setAppointmentNo] = useState("");

  useEffect(() => {
    axios.get(`${API}/public/clinic/${orgSlug}`)
      .then(r => { setClinicName(r.data.data.clinicName); setDoctors(r.data.data.doctors); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [orgSlug]);

  useEffect(() => {
    if (step !== "slots" || !doctor) return;
    setSlotsLoading(true);
    setTimeSlot("");
    axios.get(`${API}/public/clinic/${orgSlug}/slots`, { params: { doctorId: doctor.id, date } })
      .then(r => setSlots(r.data.data.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [step, doctor, date, orgSlug]);

  function pickDoctor(d: Doctor) {
    setDoctor(d);
    setError("");
    setStep("slots");
  }

  function confirmSlot() {
    if (!timeSlot) return;
    setError("");
    setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required"); return; }
    setSubmitting(true);
    setError("");
    try {
      const r = await axios.post(`${API}/public/clinic/${orgSlug}/book`, {
        doctorId: doctor!.id, date, timeSlot, name: name.trim(), phone: phone.trim(),
        email: email.trim() || undefined, chiefComplaint: chiefComplaint.trim() || undefined,
      });
      setAppointmentNo(r.data.data.appointmentNo);
      setStep("confirmed");
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not book this appointment. Please try again.");
    } finally { setSubmitting(false); }
  }

  const bg = { background: "linear-gradient(135deg,#f0f4ff,#faf5ff)" };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={bg}>
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center" style={bg}>
      <div className="text-center p-8 max-w-sm">
        <h2 className="text-xl font-bold mb-2" style={{ color: "#111" }}>Clinic Not Found</h2>
        <p className="text-sm" style={{ color: "#6b7280" }}>This booking link doesn't exist.</p>
      </div>
    </div>
  );

  if (step === "confirmed") return (
    <div className="min-h-screen flex items-center justify-center" style={bg}>
      <div className="text-center p-8 max-w-sm">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <span className="text-4xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: "#111" }}>Appointment Confirmed!</h2>
        <p className="text-base" style={{ color: "#374151" }}>
          {doctor?.name} · {new Date(date + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" })} · {timeSlot}
        </p>
        <p className="text-sm mt-3" style={{ color: "#6b7280" }}>Appointment No: <strong>{appointmentNo}</strong></p>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>A confirmation has been emailed if you provided an address.</p>
        <p className="text-sm mt-4" style={{ color: "#9ca3af" }}>Powered by BusinessOS</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-10 px-4" style={bg}>
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: "#fff" }}>
          <div className="h-1.5" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)" }} />
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {clinicName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "#6b7280" }}>{clinicName}</p>
                <h1 className="text-xl font-bold" style={{ color: "#111" }}>Book an Appointment</h1>
              </div>
            </div>

            {step === "doctors" && (
              <div className="space-y-3">
                {doctors.length === 0 && (
                  <p className="text-sm text-center py-6" style={{ color: "#6b7280" }}>Online booking isn't available right now. Please call us directly.</p>
                )}
                {doctors.map(d => (
                  <button key={d.id} onClick={() => pickDoctor(d)}
                    className="w-full text-left p-4 rounded-xl border transition-all hover:border-indigo-400"
                    style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                    <p className="font-semibold text-sm" style={{ color: "#111" }}>{d.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{d.specialization} · {d.qualification}</p>
                    {d.consultationFee != null && (
                      <p className="text-xs mt-1 font-medium" style={{ color: "#4f46e5" }}>₹{d.consultationFee} consultation fee</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {step === "slots" && doctor && (
              <div>
                <button onClick={() => setStep("doctors")} className="text-xs mb-4" style={{ color: "#6366f1" }}>← Choose a different doctor</button>
                <p className="text-sm font-semibold mb-3" style={{ color: "#111" }}>{doctor.name} — {doctor.specialization}</p>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Date</label>
                <input type="date" value={date} min={todayISO()} onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none mb-5"
                  style={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111" }} />

                {slotsLoading ? (
                  <p className="text-sm text-center py-4" style={{ color: "#6b7280" }}>Loading slots…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: "#6b7280" }}>No open slots on this date. Try another day.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {slots.map(s => (
                      <button key={s} onClick={() => setTimeSlot(s)}
                        className="py-2.5 rounded-lg text-sm font-medium border transition-all"
                        style={timeSlot === s
                          ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "1px solid transparent" }
                          : { background: "#fff", color: "#374151", border: "1px solid #e5e7eb" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <button onClick={confirmSlot} disabled={!timeSlot}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: timeSlot ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#c7c9f5", boxShadow: timeSlot ? "0 4px 15px rgba(99,102,241,0.4)" : "none" }}>
                  Continue
                </button>
              </div>
            )}

            {step === "details" && doctor && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <button type="button" onClick={() => setStep("slots")} className="text-xs" style={{ color: "#6366f1" }}>← Choose a different time</button>
                <p className="text-sm font-semibold" style={{ color: "#111" }}>
                  {doctor.name} · {new Date(date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" })} · {timeSlot}
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Full Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                    style={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Phone *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                    style={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Email (optional, for confirmation)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                    style={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Reason for visit (optional)</label>
                  <textarea rows={2} value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
                    style={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111" }} />
                </div>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <button type="submit" disabled={submitting}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: submitting ? "#818cf8" : "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 15px rgba(99,102,241,0.4)" }}>
                  {submitting ? "Booking…" : "Confirm Booking"}
                </button>
              </form>
            )}
          </div>
          <div className="px-8 py-4 text-center" style={{ borderTop: "1px solid #f3f4f6" }}>
            <p className="text-xs" style={{ color: "#d1d5db" }}>Powered by BusinessOS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
