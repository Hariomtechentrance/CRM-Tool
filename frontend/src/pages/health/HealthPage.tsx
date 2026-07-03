import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Heart, Plus, X, User, Activity, Clipboard, TestTube,
  Stethoscope, Calendar, CheckCircle, XCircle, Clock,
  AlertTriangle, Search, FileText, Shield,
} from "lucide-react";

const S = {
  page: { padding: "24px 28px", background: "var(--bg-main)", minHeight: "100vh" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "var(--text-ghost)", marginTop: 2 } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", color: "white", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  btnSm: { border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 } as React.CSSProperties,
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 } as React.CSSProperties,
  kpi: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 } as React.CSSProperties,
  tabs: { display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", flexWrap: "wrap" as const } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, borderBottom: "1px solid var(--border)" },
  td: { padding: "12px 12px", fontSize: 13, color: "var(--text-sec)", borderBottom: "1px solid var(--bg-hover)" },
  modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 },
  modalBox: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 600, maxHeight: "90vh", overflowY: "auto" as const },
  input: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  textarea: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 72 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 },
  select: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as React.CSSProperties,
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 } as React.CSSProperties,
};

type TabType = "patients" | "doctors" | "appointments" | "visits" | "prescriptions" | "labs";

const VERIFY_COLORS: Record<string, string> = { PENDING: "#f59e0b", VERIFIED: "#10b981", REJECTED: "#ef4444" };
const STATUS_COLORS: Record<string, string> = { SCHEDULED: "#818cf8", CONFIRMED: "#10b981", COMPLETED: "#6b7280", CANCELLED: "#ef4444", NO_SHOW: "#f59e0b" };
const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const DOC_TYPES = ["MEDICAL_LICENSE","AADHAAR","PAN","DEGREE","GOVT_ID","OTHER"];

const EMPTY_PATIENT = { name: "", phone: "", email: "", dob: "", gender: "", bloodGroup: "", address: "", allergies: "", notes: "" };
const EMPTY_DOCTOR = { name: "", email: "", phone: "", specialization: "", qualification: "", registrationNo: "", experience: "", department: "", consultationFee: "", bio: "", availableDays: [] as string[], slotDuration: "30", documents: [] as any[] };
const EMPTY_APPT = { patientId: "", doctorId: "", appointmentDate: "", timeSlot: "", type: "CONSULTATION", chiefComplaint: "", notes: "" };
const EMPTY_VISIT = { patientId: "", visitType: "OPD", chiefComplaint: "", diagnosis: "", vitalsBP: "", vitalsPulse: "", vitalsTemp: "", vitalsWeight: "", notes: "", followUpDate: "" };

function badge(label: string, color: string) {
  return <span style={{ background: color + "20", color, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{label}</span>;
}

export default function HealthPage() {
  const [tab, setTab] = useState<TabType>("patients");
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR);
  const [apptForm, setApptForm] = useState(EMPTY_APPT);
  const [visitForm, setVisitForm] = useState(EMPTY_VISIT);
  const [newDoc, setNewDoc] = useState({ docType: "MEDICAL_LICENSE", docNumber: "", fileName: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const [pRes, dRes, aRes, vRes, prRes, lRes, sRes] = await Promise.allSettled([
        api.get(`/health/patients${q}`),
        api.get("/health/doctors"),
        api.get("/health/appointments"),
        api.get("/health/visits?limit=50"),
        api.get("/health/prescriptions?limit=50"),
        api.get("/health/lab-reports?limit=50"),
        api.get("/health/stats"),
      ]);
      if (pRes.status === "fulfilled") setPatients(pRes.value.data.data?.patients || []);
      if (dRes.status === "fulfilled") setDoctors(dRes.value.data.data || []);
      if (aRes.status === "fulfilled") setAppointments(aRes.value.data.data || []);
      if (vRes.status === "fulfilled") setVisits(vRes.value.data.data || []);
      if (prRes.status === "fulfilled") setPrescriptions(prRes.value.data.data || []);
      if (lRes.status === "fulfilled") setLabReports(lRes.value.data.data || []);
      if (sRes.status === "fulfilled") setStats(sRes.value.data.data);
      setError("");
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to load data."); }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // ── Save handlers ──────────────────────────────────────────
  const savePatient = async () => {
    if (!patientForm.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/health/patients", {
        ...patientForm,
        dob: patientForm.dob || null,
        gender: patientForm.gender || null,
        bloodGroup: patientForm.bloodGroup || null,
        allergies: patientForm.allergies ? patientForm.allergies.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      });
      setShowModal(false); setPatientForm(EMPTY_PATIENT); load();
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to save"); }
    setSaving(false);
  };

  const saveDoctor = async () => {
    if (!doctorForm.name.trim() || !doctorForm.registrationNo.trim()) return;
    setSaving(true);
    try {
      await api.post("/health/doctors", {
        ...doctorForm,
        experience: doctorForm.experience ? Number(doctorForm.experience) : null,
        consultationFee: doctorForm.consultationFee ? Number(doctorForm.consultationFee) : null,
        slotDuration: Number(doctorForm.slotDuration),
        documents: doctorForm.documents,
      });
      setShowModal(false); setDoctorForm(EMPTY_DOCTOR); load();
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to register doctor"); }
    setSaving(false);
  };

  const saveAppointment = async () => {
    if (!apptForm.patientId || !apptForm.doctorId || !apptForm.appointmentDate || !apptForm.timeSlot) return;
    setSaving(true);
    try {
      await api.post("/health/appointments", apptForm);
      setShowModal(false); setApptForm(EMPTY_APPT); load();
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to book appointment"); }
    setSaving(false);
  };

  const saveVisit = async () => {
    if (!visitForm.patientId) return;
    setSaving(true);
    try {
      await api.post("/health/visits", {
        ...visitForm,
        vitalsPulse: visitForm.vitalsPulse ? Number(visitForm.vitalsPulse) : null,
        vitalsTemp: visitForm.vitalsTemp ? Number(visitForm.vitalsTemp) : null,
        vitalsWeight: visitForm.vitalsWeight ? Number(visitForm.vitalsWeight) : null,
        followUpDate: visitForm.followUpDate || null,
      });
      setShowModal(false); setVisitForm(EMPTY_VISIT); load();
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to save"); }
    setSaving(false);
  };

  const updateApptStatus = async (id: string, status: string) => {
    try { await api.patch(`/health/appointments/${id}`, { status }); load(); } catch { /* ignore */ }
  };

  const doVerify = async (id: string, status: "VERIFIED" | "REJECTED") => {
    setVerifying(id);
    try { await api.post(`/health/doctors/${id}/verify`, { status }); load(); } catch { /* ignore */ }
    setVerifying(null);
  };

  const addDocToForm = () => {
    if (!newDoc.docType) return;
    setDoctorForm(f => ({ ...f, documents: [...f.documents, { ...newDoc }] }));
    setNewDoc({ docType: "MEDICAL_LICENSE", docNumber: "", fileName: "" });
  };

  const toggleDay = (day: string) => {
    setDoctorForm(f => ({
      ...f,
      availableDays: f.availableDays.includes(day) ? f.availableDays.filter(d => d !== day) : [...f.availableDays, day],
    }));
  };

  const TabBtn = ({ id, label, icon: Icon, count }: { id: TabType; label: string; icon: any; count?: number }) => (
    <button onClick={() => setTab(id)} style={{ padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 700 : 400, color: tab === id ? "var(--text-primary)" : "var(--text-ghost)", borderBottom: tab === id ? "2px solid #ef4444" : "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
      <Icon size={13} />{label}
      {count !== undefined && count > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{count}</span>}
    </button>
  );

  const pendingDoctors = doctors.filter(d => d.verificationStatus === "PENDING").length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}><Heart size={20} style={{ verticalAlign: "middle", marginRight: 8, color: "#ef4444" }} />Health & Clinic</h1>
          <p style={S.subtitle}>Doctors, patients, appointments, prescriptions, and lab reports</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>
          <Plus size={15} />
          {tab === "patients" ? "New Patient" : tab === "doctors" ? "Register Doctor" : tab === "appointments" ? "Book Appointment" : tab === "visits" ? "New Visit" : "New Entry"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#ef444420", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div style={S.kpiGrid}>
          {[
            { label: "Total Patients", value: stats.totalPatients, color: "#ef4444", icon: User },
            { label: "Today's Visits", value: stats.todayVisits, color: "#818cf8", icon: Activity },
            { label: "Prescriptions", value: stats.totalPrescriptions, color: "#10b981", icon: Clipboard },
            { label: "Follow-ups Due", value: stats.pendingFollowUps, color: "#f59e0b", icon: Calendar },
          ].map(k => (
            <div key={k.label} style={S.kpi}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-ghost)", fontWeight: 500 }}>{k.label}</span>
                <k.icon size={15} color={k.color} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.value ?? "—"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={S.tabs}>
        <TabBtn id="patients"     label="Patients"     icon={User} />
        <TabBtn id="doctors"      label="Doctors"      icon={Stethoscope} count={pendingDoctors} />
        <TabBtn id="appointments" label="Appointments" icon={Calendar} />
        <TabBtn id="visits"       label="Visits"       icon={Activity} />
        <TabBtn id="prescriptions" label="Prescriptions" icon={Clipboard} />
        <TabBtn id="labs"         label="Lab Reports"  icon={TestTube} />
      </div>

      {/* Search bar for patients/doctors */}
      {(tab === "patients" || tab === "doctors") && (
        <div style={{ marginBottom: 14, position: "relative", maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" }} />
          <input style={{ ...S.input, paddingLeft: 32 }} placeholder={`Search ${tab}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* ── PATIENTS ── */}
      {tab === "patients" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Code","Name","Phone","Blood","Visits","Allergies"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>Loading...</td></tr>
              : patients.length === 0 ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>No patients registered yet</td></tr>
              : patients.map((p: any) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelectedPatient(p)}>
                  <td style={S.td}><span style={{ fontFamily: "monospace", color: "#818cf8", fontWeight: 700 }}>{p.patientCode}</span></td>
                  <td style={S.td}><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</span></td>
                  <td style={S.td}>{p.phone ?? "—"}</td>
                  <td style={S.td}>{p.bloodGroup ? p.bloodGroup.replace("_","").replace("POS","+").replace("NEG","-") : "—"}</td>
                  <td style={S.td}>{p._count?.visits ?? 0}</td>
                  <td style={S.td}>{p.allergies?.length > 0 ? p.allergies.join(", ") : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DOCTORS ── */}
      {tab === "doctors" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Name","Specialization","Reg. No.","Experience","Verification","Documents","Action"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", padding: 32 }}>Loading...</td></tr>
              : doctors.length === 0 ? <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", padding: 32 }}>No doctors registered yet</td></tr>
              : doctors.map((d: any) => (
                <tr key={d.id} onClick={() => setSelectedDoctor(d)} style={{ cursor: "pointer" }}>
                  <td style={S.td}><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</div><div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{d.email}</div></td>
                  <td style={S.td}>{d.specialization}</td>
                  <td style={S.td}><span style={{ fontFamily: "monospace", fontSize: 12 }}>{d.registrationNo}</span></td>
                  <td style={S.td}>{d.experience ? `${d.experience} yrs` : "—"}</td>
                  <td style={S.td}>{badge(d.verificationStatus, VERIFY_COLORS[d.verificationStatus] || "#818cf8")}</td>
                  <td style={S.td}>{d.documents?.length ?? 0} doc(s)</td>
                  <td style={S.td} onClick={e => e.stopPropagation()}>
                    {d.verificationStatus === "PENDING" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button disabled={verifying === d.id} onClick={() => doVerify(d.id, "VERIFIED")} style={{ ...S.btnSm, background: "#10b98120", color: "#10b981", border: "1px solid #10b98140" }}>
                          <CheckCircle size={11} style={{ display: "inline", marginRight: 3 }} />Verify
                        </button>
                        <button disabled={verifying === d.id} onClick={() => doVerify(d.id, "REJECTED")} style={{ ...S.btnSm, background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" }}>
                          <XCircle size={11} style={{ display: "inline", marginRight: 3 }} />Reject
                        </button>
                      </div>
                    )}
                    {d.verificationStatus === "VERIFIED" && <span style={{ fontSize: 12, color: "#10b981" }}>✓ Verified</span>}
                    {d.verificationStatus === "REJECTED" && <span style={{ fontSize: 12, color: "#ef4444" }}>✗ Rejected</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── APPOINTMENTS ── */}
      {tab === "appointments" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Appt No","Patient","Doctor","Date","Slot","Type","Status","Action"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 32 }}>Loading...</td></tr>
              : appointments.length === 0 ? <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 32 }}>No appointments booked yet</td></tr>
              : appointments.map((a: any) => (
                <tr key={a.id}>
                  <td style={S.td}><span style={{ fontFamily: "monospace", color: "#818cf8", fontWeight: 700 }}>{a.appointmentNo}</span></td>
                  <td style={S.td}><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.patient?.name}</div><div style={{ fontSize: 11, color: "#818cf8" }}>{a.patient?.patientCode}</div></td>
                  <td style={S.td}><div style={{ fontWeight: 600 }}>{a.doctor?.name}</div><div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{a.doctor?.specialization}</div></td>
                  <td style={S.td}>{new Date(a.appointmentDate).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}><Clock size={11} style={{ display: "inline", marginRight: 3 }} />{a.timeSlot}</td>
                  <td style={S.td}>{badge(a.type, "#818cf8")}</td>
                  <td style={S.td}>{badge(a.status, STATUS_COLORS[a.status] || "#818cf8")}</td>
                  <td style={S.td}>
                    {a.status === "SCHEDULED" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => updateApptStatus(a.id, "COMPLETED")} style={{ ...S.btnSm, background: "#10b98115", color: "#10b981", border: "1px solid #10b98130" }}>Done</button>
                        <button onClick={() => updateApptStatus(a.id, "CANCELLED")} style={{ ...S.btnSm, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430" }}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VISITS ── */}
      {tab === "visits" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Patient","Date","Type","Diagnosis","Vitals","Follow-up"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>Loading...</td></tr>
              : visits.length === 0 ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>No visits recorded</td></tr>
              : visits.map((v: any) => (
                <tr key={v.id}>
                  <td style={S.td}><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{v.patient?.name}</div><div style={{ fontSize: 11, color: "#818cf8" }}>{v.patient?.patientCode}</div></td>
                  <td style={S.td}>{new Date(v.visitDate).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}>{badge(v.visitType, "#818cf8")}</td>
                  <td style={S.td}>{v.diagnosis ?? "—"}</td>
                  <td style={S.td}>{v.vitalsBP ? `BP: ${v.vitalsBP}` : v.vitalsTemp ? `${v.vitalsTemp}°C` : "—"}</td>
                  <td style={S.td}>{v.followUpDate ? new Date(v.followUpDate).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PRESCRIPTIONS ── */}
      {tab === "prescriptions" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Patient","Date","Medicines","Instructions","Follow-up","Valid Until"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {prescriptions.length === 0 ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>No prescriptions</td></tr>
              : prescriptions.map((p: any) => (
                <tr key={p.id}>
                  <td style={S.td}><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.patient?.name}</span></td>
                  <td style={S.td}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}>{Array.isArray(p.medicines) ? `${p.medicines.length} medicine(s)` : "—"}</td>
                  <td style={S.td}>{p.instructions ?? "—"}</td>
                  <td style={S.td}>{p.followUpDays ? `${p.followUpDays} days` : "—"}</td>
                  <td style={S.td}>{p.validUntil ? new Date(p.validUntil).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LAB REPORTS ── */}
      {tab === "labs" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Patient","Test","Category","Conducted","Interpretation"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {labReports.length === 0 ? <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: 32 }}>No lab reports</td></tr>
              : labReports.map((r: any) => (
                <tr key={r.id}>
                  <td style={S.td}><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.patient?.name}</span></td>
                  <td style={S.td}>{r.testName}</td>
                  <td style={S.td}>{r.testCategory ?? "—"}</td>
                  <td style={S.td}>{new Date(r.conductedAt).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}>{r.interpretation ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PATIENT DETAIL MODAL ── */}
      {selectedPatient && (
        <div style={S.modal} onClick={() => setSelectedPatient(null)}>
          <div style={{ ...S.modalBox, width: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{selectedPatient.name}</h2>
                <span style={{ fontFamily: "monospace", color: "#818cf8", fontSize: 12 }}>{selectedPatient.patientCode}</span>
              </div>
              <button onClick={() => setSelectedPatient(null)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Phone", val: selectedPatient.phone ?? "—" },
                { label: "Email", val: selectedPatient.email ?? "—" },
                { label: "Blood Group", val: selectedPatient.bloodGroup ? selectedPatient.bloodGroup.replace("_","").replace("POS","+").replace("NEG","-") : "—" },
                { label: "Gender", val: selectedPatient.gender ?? "—" },
                { label: "DOB", val: selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString("en-IN") : "—" },
                { label: "Address", val: selectedPatient.address ?? "—" },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: "var(--bg-hover)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-ghost)", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600, marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
            {selectedPatient.allergies?.length > 0 && (
              <div style={{ marginTop: 12, background: "#ef444411", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>⚠ ALLERGIES</div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 4 }}>{selectedPatient.allergies.join(", ")}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DOCTOR DETAIL MODAL ── */}
      {selectedDoctor && (
        <div style={S.modal} onClick={() => setSelectedDoctor(null)}>
          <div style={{ ...S.modalBox, width: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Dr. {selectedDoctor.name}</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-ghost)" }}>{selectedDoctor.specialization}</span>
                  {badge(selectedDoctor.verificationStatus, VERIFY_COLORS[selectedDoctor.verificationStatus] || "#818cf8")}
                </div>
              </div>
              <button onClick={() => setSelectedDoctor(null)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Qualification", val: selectedDoctor.qualification },
                { label: "Reg. No.", val: selectedDoctor.registrationNo },
                { label: "Experience", val: selectedDoctor.experience ? `${selectedDoctor.experience} yrs` : "—" },
                { label: "Department", val: selectedDoctor.department ?? "—" },
                { label: "Phone", val: selectedDoctor.phone ?? "—" },
                { label: "Email", val: selectedDoctor.email ?? "—" },
                { label: "Consultation Fee", val: selectedDoctor.consultationFee ? `₹${selectedDoctor.consultationFee}` : "—" },
                { label: "Slot Duration", val: `${selectedDoctor.slotDuration} min` },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: "var(--bg-hover)", borderRadius: 8, padding: "9px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-ghost)", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
            {selectedDoctor.availableDays?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text-ghost)", fontWeight: 700, marginBottom: 6 }}>AVAILABLE DAYS</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DAYS.map(d => <span key={d} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: selectedDoctor.availableDays.includes(d) ? "#10b98120" : "var(--bg-hover)", color: selectedDoctor.availableDays.includes(d) ? "#10b981" : "var(--text-ghost)", border: `1px solid ${selectedDoctor.availableDays.includes(d) ? "#10b98140" : "var(--border)"}` }}>{d}</span>)}
                </div>
              </div>
            )}
            {selectedDoctor.documents?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "var(--text-ghost)", fontWeight: 700, marginBottom: 8 }}>DOCUMENTS</div>
                {selectedDoctor.documents.map((doc: any) => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-hover)", borderRadius: 8, marginBottom: 6 }}>
                    <FileText size={13} color="#818cf8" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{doc.docType}</div>
                      {doc.docNumber && <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{doc.docNumber}</div>}
                    </div>
                    {doc.isVerified ? <CheckCircle size={13} color="#10b981" /> : <Clock size={13} color="#f59e0b" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                {tab === "patients" ? "Register Patient" : tab === "doctors" ? "Register Doctor" : tab === "appointments" ? "Book Appointment" : "Record Visit"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer" }}><X size={18} /></button>
            </div>

            {/* PATIENT FORM */}
            {tab === "patients" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={S.g2}>
                  <div><label style={S.label}>Full Name *</label><input style={S.input} value={patientForm.name} onChange={e => setPatientForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><label style={S.label}>Phone</label><input style={S.input} value={patientForm.phone} onChange={e => setPatientForm(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div style={S.g3}>
                  <div><label style={S.label}>Date of Birth</label><input type="date" style={S.input} value={patientForm.dob} onChange={e => setPatientForm(p => ({ ...p, dob: e.target.value }))} /></div>
                  <div><label style={S.label}>Gender</label>
                    <select style={S.select} value={patientForm.gender} onChange={e => setPatientForm(p => ({ ...p, gender: e.target.value }))}>
                      <option value="">Select</option><option>MALE</option><option>FEMALE</option><option>OTHER</option>
                    </select>
                  </div>
                  <div><label style={S.label}>Blood Group</label>
                    <select style={S.select} value={patientForm.bloodGroup} onChange={e => setPatientForm(p => ({ ...p, bloodGroup: e.target.value }))}>
                      <option value="">Unknown</option>
                      {["A_POS","A_NEG","B_POS","B_NEG","AB_POS","AB_NEG","O_POS","O_NEG"].map(bg => <option key={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={S.label}>Email</label><input type="email" style={S.input} value={patientForm.email} onChange={e => setPatientForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div><label style={S.label}>Allergies (comma-separated)</label><input style={S.input} placeholder="Penicillin, Peanuts" value={patientForm.allergies} onChange={e => setPatientForm(p => ({ ...p, allergies: e.target.value }))} /></div>
                <div><label style={S.label}>Address</label><textarea style={{ ...S.textarea, minHeight: 60 }} value={patientForm.address} onChange={e => setPatientForm(p => ({ ...p, address: e.target.value }))} /></div>
                <button onClick={savePatient} disabled={saving} style={{ ...S.btn, justifyContent: "center" }}>{saving ? "Saving..." : "Register Patient"}</button>
              </div>
            )}

            {/* DOCTOR FORM */}
            {tab === "doctors" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <AlertTriangle size={14} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#f59e0b" }}>Doctor registration requires government-issued documents. The account will be active only after admin verification.</span>
                </div>
                <div style={S.g2}>
                  <div><label style={S.label}>Full Name *</label><input style={S.input} value={doctorForm.name} onChange={e => setDoctorForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label style={S.label}>Phone</label><input style={S.input} value={doctorForm.phone} onChange={e => setDoctorForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>
                <div style={S.g2}>
                  <div><label style={S.label}>Email</label><input type="email" style={S.input} value={doctorForm.email} onChange={e => setDoctorForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label style={S.label}>Specialization *</label><input style={S.input} placeholder="Cardiology, Orthopedics…" value={doctorForm.specialization} onChange={e => setDoctorForm(f => ({ ...f, specialization: e.target.value }))} /></div>
                </div>
                <div style={S.g2}>
                  <div><label style={S.label}>Qualification *</label><input style={S.input} placeholder="MBBS, MD, MS…" value={doctorForm.qualification} onChange={e => setDoctorForm(f => ({ ...f, qualification: e.target.value }))} /></div>
                  <div><label style={S.label}>Medical Reg. No. *</label><input style={S.input} placeholder="MCI/State Council number" value={doctorForm.registrationNo} onChange={e => setDoctorForm(f => ({ ...f, registrationNo: e.target.value }))} /></div>
                </div>
                <div style={S.g3}>
                  <div><label style={S.label}>Experience (yrs)</label><input type="number" style={S.input} value={doctorForm.experience} onChange={e => setDoctorForm(f => ({ ...f, experience: e.target.value }))} /></div>
                  <div><label style={S.label}>Department</label><input style={S.input} value={doctorForm.department} onChange={e => setDoctorForm(f => ({ ...f, department: e.target.value }))} /></div>
                  <div><label style={S.label}>Consultation Fee (₹)</label><input type="number" style={S.input} value={doctorForm.consultationFee} onChange={e => setDoctorForm(f => ({ ...f, consultationFee: e.target.value }))} /></div>
                </div>
                <div>
                  <label style={S.label}>Available Days</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {DAYS.map(d => (
                      <button key={d} type="button" onClick={() => toggleDay(d)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${doctorForm.availableDays.includes(d) ? "#10b981" : "var(--border)"}`, background: doctorForm.availableDays.includes(d) ? "#10b98120" : "var(--bg-hover)", color: doctorForm.availableDays.includes(d) ? "#10b981" : "var(--text-ghost)" }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Documents section */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Shield size={13} color="#818cf8" />
                    <label style={{ ...S.label, margin: 0 }}>Government Documents</label>
                  </div>
                  <div style={S.g3}>
                    <div>
                      <label style={S.label}>Document Type</label>
                      <select style={S.select} value={newDoc.docType} onChange={e => setNewDoc(d => ({ ...d, docType: e.target.value }))}>
                        {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label style={S.label}>Doc Number</label><input style={S.input} placeholder="Number/ID" value={newDoc.docNumber} onChange={e => setNewDoc(d => ({ ...d, docNumber: e.target.value }))} /></div>
                    <div><label style={S.label}>File Name</label><input style={S.input} placeholder="e.g. license.pdf" value={newDoc.fileName} onChange={e => setNewDoc(d => ({ ...d, fileName: e.target.value }))} /></div>
                  </div>
                  <button type="button" onClick={addDocToForm} style={{ marginTop: 8, ...S.btnSm, background: "#818cf820", color: "#818cf8", border: "1px solid #818cf840" }}>
                    + Add Document
                  </button>
                  {doctorForm.documents.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {doctorForm.documents.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg-hover)", borderRadius: 7 }}>
                          <FileText size={12} color="#818cf8" />
                          <span style={{ fontSize: 12, flex: 1 }}>{d.docType}{d.docNumber ? ` — ${d.docNumber}` : ""}</span>
                          <button type="button" onClick={() => setDoctorForm(f => ({ ...f, documents: f.documents.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div><label style={S.label}>Bio / Notes</label><textarea style={S.textarea} value={doctorForm.bio} onChange={e => setDoctorForm(f => ({ ...f, bio: e.target.value }))} /></div>
                <button onClick={saveDoctor} disabled={saving} style={{ ...S.btn, justifyContent: "center" }}>{saving ? "Registering..." : "Register Doctor (Pending Verification)"}</button>
              </div>
            )}

            {/* APPOINTMENT FORM */}
            {tab === "appointments" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={S.g2}>
                  <div><label style={S.label}>Patient *</label>
                    <select style={S.select} value={apptForm.patientId} onChange={e => setApptForm(f => ({ ...f, patientId: e.target.value }))}>
                      <option value="">Select patient…</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.patientCode})</option>)}
                    </select>
                  </div>
                  <div><label style={S.label}>Doctor *</label>
                    <select style={S.select} value={apptForm.doctorId} onChange={e => setApptForm(f => ({ ...f, doctorId: e.target.value }))}>
                      <option value="">Select doctor…</option>
                      {doctors.filter(d => d.isVerified).map(d => <option key={d.id} value={d.id}>Dr. {d.name} — {d.specialization}</option>)}
                    </select>
                  </div>
                </div>
                <div style={S.g3}>
                  <div><label style={S.label}>Date *</label><input type="date" style={S.input} value={apptForm.appointmentDate} onChange={e => setApptForm(f => ({ ...f, appointmentDate: e.target.value }))} /></div>
                  <div><label style={S.label}>Time Slot *</label><input style={S.input} placeholder="10:00-10:30" value={apptForm.timeSlot} onChange={e => setApptForm(f => ({ ...f, timeSlot: e.target.value }))} /></div>
                  <div><label style={S.label}>Type</label>
                    <select style={S.select} value={apptForm.type} onChange={e => setApptForm(f => ({ ...f, type: e.target.value }))}>
                      {["CONSULTATION","FOLLOW_UP","EMERGENCY","PROCEDURE"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={S.label}>Chief Complaint</label><textarea style={{ ...S.textarea, minHeight: 60 }} value={apptForm.chiefComplaint} onChange={e => setApptForm(f => ({ ...f, chiefComplaint: e.target.value }))} /></div>
                <div><label style={S.label}>Notes</label><input style={S.input} value={apptForm.notes} onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <button onClick={saveAppointment} disabled={saving} style={{ ...S.btn, justifyContent: "center" }}>{saving ? "Booking…" : "Book Appointment"}</button>
              </div>
            )}

            {/* VISIT FORM */}
            {(tab === "visits" || tab === "prescriptions" || tab === "labs") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={S.g2}>
                  <div><label style={S.label}>Patient *</label>
                    <select style={S.select} value={visitForm.patientId} onChange={e => setVisitForm(f => ({ ...f, patientId: e.target.value }))}>
                      <option value="">Select patient…</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.patientCode})</option>)}
                    </select>
                  </div>
                  <div><label style={S.label}>Visit Type</label>
                    <select style={S.select} value={visitForm.visitType} onChange={e => setVisitForm(f => ({ ...f, visitType: e.target.value }))}>
                      {["OPD","IPD","EMERGENCY","FOLLOW_UP","TELECONSULTATION"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={S.label}>Chief Complaint</label><textarea style={{ ...S.textarea, minHeight: 60 }} value={visitForm.chiefComplaint} onChange={e => setVisitForm(f => ({ ...f, chiefComplaint: e.target.value }))} /></div>
                <div style={S.g3}>
                  <div><label style={S.label}>BP</label><input style={S.input} placeholder="120/80" value={visitForm.vitalsBP} onChange={e => setVisitForm(f => ({ ...f, vitalsBP: e.target.value }))} /></div>
                  <div><label style={S.label}>Pulse</label><input type="number" style={S.input} value={visitForm.vitalsPulse} onChange={e => setVisitForm(f => ({ ...f, vitalsPulse: e.target.value }))} /></div>
                  <div><label style={S.label}>Temp (°C)</label><input type="number" step="0.1" style={S.input} value={visitForm.vitalsTemp} onChange={e => setVisitForm(f => ({ ...f, vitalsTemp: e.target.value }))} /></div>
                </div>
                <div style={S.g2}>
                  <div><label style={S.label}>Diagnosis</label><input style={S.input} value={visitForm.diagnosis} onChange={e => setVisitForm(f => ({ ...f, diagnosis: e.target.value }))} /></div>
                  <div><label style={S.label}>Follow-up Date</label><input type="date" style={S.input} value={visitForm.followUpDate} onChange={e => setVisitForm(f => ({ ...f, followUpDate: e.target.value }))} /></div>
                </div>
                <button onClick={saveVisit} disabled={saving} style={{ ...S.btn, justifyContent: "center" }}>{saving ? "Saving..." : "Record Visit"}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
