import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Heart, Plus, X, User, Activity, Clipboard, TestTube } from "lucide-react";

const S = {
  page: { padding: "24px 28px", background: "var(--bg-main)", minHeight: "100vh" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "var(--text-ghost)", marginTop: 2 } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", color: "white", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 } as React.CSSProperties,
  kpi: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 } as React.CSSProperties,
  tabs: { display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, borderBottom: "1px solid var(--border)" },
  td: { padding: "12px 12px", fontSize: 13, color: "var(--text-sec)", borderBottom: "1px solid #131327" },
  modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 },
  modalBox: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 560, maxHeight: "90vh", overflowY: "auto" as const },
  input: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  textarea: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 80 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 },
  select: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as React.CSSProperties,
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 } as React.CSSProperties,
};

type TabType = "patients" | "visits" | "prescriptions" | "labs";

const EMPTY_PATIENT = { name: "", phone: "", email: "", dob: "", gender: "", bloodGroup: "", address: "", allergies: "", notes: "" };
const EMPTY_VISIT = { patientId: "", visitType: "OPD", chiefComplaint: "", diagnosis: "", vitalsBP: "", vitalsPulse: "", vitalsTemp: "", vitalsWeight: "", notes: "", followUpDate: "" };

export default function HealthPage() {
  const [tab, setTab] = useState<TabType>("patients");
  const [patients, setPatients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
  const [visitForm, setVisitForm] = useState(EMPTY_VISIT);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${search}` : "";
      const [pRes, vRes, prRes, lRes, sRes] = await Promise.all([
        api.get(`/health/patients${params}`),
        api.get("/health/visits?limit=50"),
        api.get("/health/prescriptions?limit=50"),
        api.get("/health/lab-reports?limit=50"),
        api.get("/health/stats"),
      ]);
      setPatients(pRes.data.data?.patients || []);
      setVisits(vRes.data.data || []);
      setPrescriptions(prRes.data.data || []);
      setLabReports(lRes.data.data || []);
      setStats(sRes.data.data);
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const savePatient = async () => {
    if (!patientForm.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/health/patients", {
        ...patientForm,
        dob: patientForm.dob || null,
        gender: patientForm.gender || null,
        bloodGroup: patientForm.bloodGroup || null,
        allergies: patientForm.allergies ? patientForm.allergies.split(",").map(s => s.trim()).filter(Boolean) : [],
      });
      setShowModal(false);
      setPatientForm(EMPTY_PATIENT);
      load();
    } catch {}
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
      setShowModal(false);
      setVisitForm(EMPTY_VISIT);
      load();
    } catch {}
    setSaving(false);
  };

  const TabBtn = ({ id, label, icon: Icon }: { id: TabType; label: string; icon: any }) => (
    <button onClick={() => setTab(id)} style={{ padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 700 : 400, color: tab === id ? "var(--text-primary)" : "var(--text-ghost)", borderBottom: tab === id ? "2px solid #ef4444" : "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}>
      <Icon size={13} />{label}
    </button>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}><Heart size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />Health Management</h1>
          <p style={S.subtitle}>Patients, visits, prescriptions, and lab reports</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}><Plus size={15} />
          {tab === "patients" ? "New Patient" : tab === "visits" ? "New Visit" : "New Entry"}
        </button>
      </div>

      {stats && (
        <div style={S.kpiGrid}>
          {[
            { label: "Total Patients", value: stats.totalPatients, color: "#ef4444", icon: User },
            { label: "Today's Visits", value: stats.todayVisits, color: "#818cf8", icon: Activity },
            { label: "Prescriptions", value: stats.totalPrescriptions, color: "#10b981", icon: Clipboard },
            { label: "Follow-ups Due", value: stats.pendingFollowUps, color: "#f59e0b", icon: Heart },
          ].map(k => (
            <div key={k.label} style={S.kpi}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-ghost)", fontWeight: 500 }}>{k.label}</span>
                <k.icon size={15} color={k.color} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={S.tabs}>
        <TabBtn id="patients" label="Patients" icon={User} />
        <TabBtn id="visits" label="Visits" icon={Activity} />
        <TabBtn id="prescriptions" label="Prescriptions" icon={Clipboard} />
        <TabBtn id="labs" label="Lab Reports" icon={TestTube} />
      </div>

      {tab === "patients" && (
        <div style={S.card}>
          <div style={{ marginBottom: 14 }}>
            <input style={{ ...S.input, maxWidth: 300 }} placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <table style={S.table}>
            <thead><tr>{["Patient Code", "Name", "Phone", "Blood Group", "Visits", "Allergies"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>Loading...</td></tr>
              : patients.length === 0 ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>No patients registered</td></tr>
              : patients.map((p: any) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelectedPatient(p)}>
                  <td style={S.td}><span style={{ fontFamily: "monospace", color: "#818cf8" }}>{p.patientCode}</span></td>
                  <td style={S.td}><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</span></td>
                  <td style={S.td}>{p.phone ?? "—"}</td>
                  <td style={S.td}>{p.bloodGroup ? p.bloodGroup.replace("_", " ").replace("POS", "+").replace("NEG", "-") : "—"}</td>
                  <td style={S.td}>{p._count?.visits ?? 0}</td>
                  <td style={S.td}>{p.allergies?.length > 0 ? p.allergies.join(", ") : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "visits" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Patient", "Visit Date", "Type", "Diagnosis", "Vitals", "Follow-up"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>Loading...</td></tr>
              : visits.length === 0 ? <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 32 }}>No visits recorded</td></tr>
              : visits.map((v: any) => (
                <tr key={v.id}>
                  <td style={S.td}><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{v.patient?.name}</div><div style={{ fontSize: 11, color: "#818cf8" }}>{v.patient?.patientCode}</div></td>
                  <td style={S.td}>{new Date(v.visitDate).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}><span style={{ background: "#818cf822", color: "#818cf8", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{v.visitType}</span></td>
                  <td style={S.td}>{v.diagnosis ?? "—"}</td>
                  <td style={S.td}>{v.vitalsBP ? `BP: ${v.vitalsBP}` : v.vitalsTemp ? `Temp: ${v.vitalsTemp}°` : "—"}</td>
                  <td style={S.td}>{v.followUpDate ? new Date(v.followUpDate).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "prescriptions" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Patient", "Date", "Instructions", "Follow-up Days", "Valid Until"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {prescriptions.length === 0 ? <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: 32 }}>No prescriptions</td></tr>
              : prescriptions.map((p: any) => (
                <tr key={p.id}>
                  <td style={S.td}><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.patient?.name}</span></td>
                  <td style={S.td}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}>{p.instructions ?? "—"}</td>
                  <td style={S.td}>{p.followUpDays ? `${p.followUpDays} days` : "—"}</td>
                  <td style={S.td}>{p.validUntil ? new Date(p.validUntil).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "labs" && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>{["Patient", "Test", "Category", "Conducted", "Interpretation"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
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

      {/* Patient Detail Modal */}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Phone", val: selectedPatient.phone ?? "—" },
                { label: "Blood Group", val: selectedPatient.bloodGroup ?? "—" },
                { label: "Gender", val: selectedPatient.gender ?? "—" },
                { label: "DOB", val: selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString("en-IN") : "—" },
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

      {/* Create Modal */}
      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                {tab === "patients" ? "Register Patient" : "Record Visit"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer" }}><X size={18} /></button>
            </div>

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
                      <option value="">Select</option>
                      <option>MALE</option><option>FEMALE</option><option>OTHER</option>
                    </select>
                  </div>
                  <div><label style={S.label}>Blood Group</label>
                    <select style={S.select} value={patientForm.bloodGroup} onChange={e => setPatientForm(p => ({ ...p, bloodGroup: e.target.value }))}>
                      <option value="">Unknown</option>
                      {["A_POS","A_NEG","B_POS","B_NEG","AB_POS","AB_NEG","O_POS","O_NEG"].map(bg => <option key={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={S.label}>Allergies (comma separated)</label><input style={S.input} placeholder="Penicillin, Peanuts" value={patientForm.allergies} onChange={e => setPatientForm(p => ({ ...p, allergies: e.target.value }))} /></div>
                <div><label style={S.label}>Address</label><textarea style={{ ...S.textarea, minHeight: 60 }} value={patientForm.address} onChange={e => setPatientForm(p => ({ ...p, address: e.target.value }))} /></div>
                <button onClick={savePatient} disabled={saving} style={{ ...S.btn, justifyContent: "center" }}>{saving ? "Saving..." : "Register Patient"}</button>
              </div>
            )}

            {tab === "visits" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={S.g2}>
                  <div><label style={S.label}>Patient *</label>
                    <select style={S.select} value={visitForm.patientId} onChange={e => setVisitForm(p => ({ ...p, patientId: e.target.value }))}>
                      <option value="">Select patient...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.patientCode})</option>)}
                    </select>
                  </div>
                  <div><label style={S.label}>Visit Type</label>
                    <select style={S.select} value={visitForm.visitType} onChange={e => setVisitForm(p => ({ ...p, visitType: e.target.value }))}>
                      {["OPD","IPD","EMERGENCY","FOLLOW_UP","TELECONSULTATION"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={S.label}>Chief Complaint</label><textarea style={{ ...S.textarea, minHeight: 60 }} value={visitForm.chiefComplaint} onChange={e => setVisitForm(p => ({ ...p, chiefComplaint: e.target.value }))} /></div>
                <div style={S.g3}>
                  <div><label style={S.label}>BP</label><input style={S.input} placeholder="120/80" value={visitForm.vitalsBP} onChange={e => setVisitForm(p => ({ ...p, vitalsBP: e.target.value }))} /></div>
                  <div><label style={S.label}>Pulse</label><input type="number" style={S.input} value={visitForm.vitalsPulse} onChange={e => setVisitForm(p => ({ ...p, vitalsPulse: e.target.value }))} /></div>
                  <div><label style={S.label}>Temp (°C)</label><input type="number" step="0.1" style={S.input} value={visitForm.vitalsTemp} onChange={e => setVisitForm(p => ({ ...p, vitalsTemp: e.target.value }))} /></div>
                </div>
                <div><label style={S.label}>Diagnosis</label><input style={S.input} value={visitForm.diagnosis} onChange={e => setVisitForm(p => ({ ...p, diagnosis: e.target.value }))} /></div>
                <div style={S.g2}>
                  <div><label style={S.label}>Notes</label><input style={S.input} value={visitForm.notes} onChange={e => setVisitForm(p => ({ ...p, notes: e.target.value }))} /></div>
                  <div><label style={S.label}>Follow-up Date</label><input type="date" style={S.input} value={visitForm.followUpDate} onChange={e => setVisitForm(p => ({ ...p, followUpDate: e.target.value }))} /></div>
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
