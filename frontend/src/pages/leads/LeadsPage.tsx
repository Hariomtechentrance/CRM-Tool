import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Megaphone, Plus, Search, X, TrendingUp } from "lucide-react";

const S = {
  page: { padding: "24px 28px", background: "#07071A", minHeight: "100vh" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#505070", marginTop: 2 } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 } as React.CSSProperties,
  kpi: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: "18px 20px" } as React.CSSProperties,
  kpiValue: { fontSize: 24, fontWeight: 700, color: "#EEEEF5", margin: "4px 0 0" } as React.CSSProperties,
  kpiLabel: { fontSize: 12, color: "#505070", fontWeight: 500 } as React.CSSProperties,
  card: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: 20 } as React.CSSProperties,
  toolbar: { display: "flex", gap: 10, marginBottom: 16 } as React.CSSProperties,
  searchWrap: { position: "relative" as const, flex: 1, maxWidth: 300 },
  searchInput: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "8px 12px 8px 34px", color: "#EEEEF5", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  searchIcon: { position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", color: "#505070" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#404060", textTransform: "uppercase" as const, borderBottom: "1px solid #1C1C35" },
  td: { padding: "12px 12px", fontSize: 13, color: "#CCCCEE", borderBottom: "1px solid #131327" },
  modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modalBox: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 16, padding: 28, width: 460, maxHeight: "90vh", overflowY: "auto" as const },
  input: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#505070", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 },
  select: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as React.CSSProperties,
};

const STATUS_COLORS: Record<string, string> = { NEW: "#818cf8", CONTACTED: "#60a5fa", QUALIFIED: "#34d399", PROPOSAL: "#f59e0b", NEGOTIATION: "#fb923c", WON: "#10b981", LOST: "#ef4444" };
const SOURCE_COLORS: Record<string, string> = { WEBSITE: "#6366f1", REFERRAL: "#10b981", SOCIAL_MEDIA: "#f59e0b", EMAIL: "#60a5fa", PHONE: "#a78bfa", EXHIBITION: "#fb923c", OTHER: "#6b7280" };

interface Stats { total: number; won: number; lost: number; pipeline: number; byStatus: Array<{ status: string; _count: number }>; }
interface Lead { id: string; name: string; company?: string; email?: string; phone?: string; source: string; status: string; value?: number; createdAt: string; }

const emptyForm = { name: "", company: "", email: "", phone: "", source: "OTHER", status: "NEW", value: "", notes: "" };

export default function LeadsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...emptyForm });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes] = await Promise.all([
        api.get("/leads/stats"),
        api.get(`/leads?search=${search}&status=${statusFilter}&limit=100`),
      ]);
      setStats(statsRes.data.data);
      setLeads(leadsRes.data.data.leads);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (l: Lead) => {
    setEditId(l.id);
    setForm({ name: l.name, company: l.company || "", email: l.email || "", phone: l.phone || "", source: l.source, status: l.status, value: l.value ? String(l.value) : "", notes: "" });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const payload = { ...form, value: form.value ? parseFloat(form.value) : undefined, company: form.company || undefined, email: form.email || undefined, phone: form.phone || undefined, notes: form.notes || undefined };
      if (editId) await api.patch(`/leads/${editId}`, payload);
      else await api.post("/leads", payload);
      setShowModal(false); load();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed"); }
    setSaving(false);
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Leads & Marketing</h1>
          <p style={S.subtitle}>Lead pipeline, follow-ups, and campaign tracking</p>
        </div>
        <button style={S.btn} onClick={() => { setEditId(null); setForm({ ...emptyForm }); setError(""); setShowModal(true); }}><Plus size={15} /> Add Lead</button>
      </div>

      <div style={S.kpiGrid}>
        {[
          { label: "Total Leads", value: stats?.total ?? "—", color: "#6366f1" },
          { label: "Pipeline Value", value: stats ? `₹${(stats.pipeline / 100000).toFixed(1)}L` : "—", color: "#f59e0b" },
          { label: "Won", value: stats?.won ?? "—", color: "#10b981" },
          { label: "Lost", value: stats?.lost ?? "—", color: "#ef4444" },
        ].map(k => (
          <div key={k.label} style={S.kpi}>
            <span style={S.kpiLabel}>{k.label}</span>
            <div style={{ ...S.kpiValue as object, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Board */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto" as const }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const count = leads.filter(l => l.status === status).length;
          return (
            <button key={status} onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${statusFilter === status ? color : color + "40"}`, background: statusFilter === status ? color + "25" : "transparent", color: statusFilter === status ? color : color, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const }}>
              {status} ({count})
            </button>
          );
        })}
      </div>

      <div style={S.card}>
        <div style={S.toolbar}>
          <div style={S.searchWrap}>
            <Search size={14} style={S.searchIcon} />
            <input style={S.searchInput} placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#505070", fontSize: 12 }}>
            <TrendingUp size={14} /> {leads.length} leads
          </div>
        </div>

        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#505070" }}>Loading...</div> : (
          <table style={S.table}>
            <thead><tr>{["Name", "Company", "Contact", "Source", "Value", "Status", "Added"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {leads.length === 0 ? <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#505070", padding: 32 }}>No leads yet.</td></tr> : leads.map(l => (
                <tr key={l.id} onClick={() => openEdit(l)} style={{ cursor: "pointer" }}>
                  <td style={{ ...S.td, color: "#EEEEF5", fontWeight: 500 }}>{l.name}</td>
                  <td style={S.td}>{l.company || "—"}</td>
                  <td style={S.td}>{l.email || l.phone || "—"}</td>
                  <td style={S.td}><span style={{ padding: "2px 6px", borderRadius: 5, fontSize: 10, background: (SOURCE_COLORS[l.source] || "#818cf8") + "20", color: SOURCE_COLORS[l.source] || "#818cf8", fontWeight: 600 }}>{l.source}</span></td>
                  <td style={{ ...S.td, color: "#10b981" }}>{l.value ? `₹${l.value.toLocaleString("en-IN")}` : "—"}</td>
                  <td style={S.td}><span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: (STATUS_COLORS[l.status] || "#818cf8") + "20", color: STATUS_COLORS[l.status] || "#818cf8" }}>{l.status}</span></td>
                  <td style={S.td}>{new Date(l.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={S.modal} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={S.modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "#EEEEF5", margin: 0, fontSize: 16, fontWeight: 700 }}>{editId ? "Edit Lead" : "Add Lead"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#505070", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {error && <div style={{ background: "#ef444420", border: "1px solid #ef4444", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: 12, marginBottom: 14 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={S.g2}>
                <div><label style={S.label}>Name *</label><input style={S.input} value={form.name} onChange={(e) => f("name", e.target.value)} /></div>
                <div><label style={S.label}>Company</label><input style={S.input} value={form.company} onChange={(e) => f("company", e.target.value)} /></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Email</label><input type="email" style={S.input} value={form.email} onChange={(e) => f("email", e.target.value)} /></div>
                <div><label style={S.label}>Phone</label><input style={S.input} value={form.phone} onChange={(e) => f("phone", e.target.value)} /></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Source</label>
                  <select style={S.select} value={form.source} onChange={(e) => f("source", e.target.value)}>
                    {Object.keys(SOURCE_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Status</label>
                  <select style={S.select} value={form.status} onChange={(e) => f("status", e.target.value)}>
                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={S.label}>Estimated Value ₹</label><input type="number" style={S.input} value={form.value} onChange={(e) => f("value", e.target.value)} /></div>
              <div><label style={S.label}>Notes</label><textarea style={{ ...S.input, minHeight: 60, resize: "vertical" as const }} value={form.notes} onChange={(e) => f("notes", e.target.value)} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ ...S.btn, background: "#1C1C35", color: "#CCCCEE" }}>Cancel</button>
              <button onClick={save} style={S.btn} disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Add Lead"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
