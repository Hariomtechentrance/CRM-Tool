import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Search, CheckCircle, XCircle, Eye, X } from "lucide-react";

const S = {
  page: { padding: "24px 28px", background: "#07071A", minHeight: "100vh" } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#505070", marginTop: 2, marginBottom: 24 } as React.CSSProperties,
  card: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: 20 } as React.CSSProperties,
  toolbar: { display: "flex", gap: 10, marginBottom: 16, alignItems: "center" } as React.CSSProperties,
  searchWrap: { position: "relative" as const, flex: 1, maxWidth: 340 },
  searchInput: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "8px 12px 8px 34px", color: "#EEEEF5", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  searchIcon: { position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", color: "#505070" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#404060", textTransform: "uppercase" as const, borderBottom: "1px solid #1C1C35" },
  td: { padding: "12px 12px", fontSize: 13, color: "#CCCCEE", borderBottom: "1px solid #131327" },
  modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modalBox: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 16, padding: 28, width: 600, maxHeight: "90vh", overflowY: "auto" as const },
  input: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#505070", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 } as React.CSSProperties,
  select: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const },
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 } as React.CSSProperties,
};

const PLAN_COLORS: Record<string, string> = { FREE: "#6b7280", STARTER: "#6366f1", PRO: "#f59e0b", ENTERPRISE: "#10b981" };

interface Org {
  id: string; name: string; slug: string; email?: string; businessType: string;
  isActive: boolean; plan: string; planExpiresAt?: string; adminNotes?: string;
  enabledModules: string[]; createdAt: string;
  _count: { members: number; parties: number; invoices: number };
}

export default function SuperAdminOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Org | null>(null);
  const [editForm, setEditForm] = useState({ isActive: true, plan: "FREE", planExpiresAt: "", adminNotes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/super-admin/organizations?search=${search}&limit=50`);
      setOrgs(r.data.data.orgs);
      setTotal(r.data.data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (o: Org) => {
    setSelected(o);
    setEditForm({ isActive: o.isActive, plan: o.plan, planExpiresAt: o.planExpiresAt ? o.planExpiresAt.slice(0, 10) : "", adminNotes: o.adminNotes || "" });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/super-admin/organizations/${selected.id}`, { ...editForm, planExpiresAt: editForm.planExpiresAt || null });
      setSelected(null); load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const quickToggle = async (id: string, isActive: boolean) => {
    try { await api.patch(`/super-admin/organizations/${id}`, { isActive }); load(); } catch { /* ignore */ }
  };

  return (
    <div style={S.page}>
      <h1 style={S.title}>Organizations</h1>
      <p style={S.subtitle}>Manage all organizations on the platform ({total} total)</p>

      <div style={S.card}>
        <div style={S.toolbar}>
          <div style={S.searchWrap}>
            <Search size={14} style={S.searchIcon} />
            <input style={S.searchInput} placeholder="Search by name, email, slug..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 12, color: "#505070" }}>{total} organizations</span>
        </div>

        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#505070" }}>Loading...</div> : (
          <table style={S.table}>
            <thead><tr>{["Organization", "Type", "Plan", "Members", "Parties", "Joined", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {orgs.length === 0 ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#505070", padding: 32 }}>No organizations found.</td></tr>
              ) : orgs.map(o => (
                <tr key={o.id}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600, color: "#EEEEF5" }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: "#505070" }}>{o.slug}</div>
                    {o.email && <div style={{ fontSize: 11, color: "#505070" }}>{o.email}</div>}
                  </td>
                  <td style={{ ...S.td, fontSize: 11 }}>{o.businessType.replace(/_/g, " ")}</td>
                  <td style={S.td}><span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, background: (PLAN_COLORS[o.plan] || "#6b7280") + "20", color: PLAN_COLORS[o.plan] || "#6b7280", fontWeight: 600 }}>{o.plan}</span></td>
                  <td style={S.td}>{o._count.members}</td>
                  <td style={S.td}>{o._count.parties}</td>
                  <td style={{ ...S.td, fontSize: 11 }}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: o.isActive ? "#10b98120" : "#ef444420", color: o.isActive ? "#10b981" : "#ef4444" }}>{o.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(o)} style={{ background: "#6366f120", color: "#818cf8", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Eye size={11} /> Edit</button>
                      <button onClick={() => quickToggle(o.id, !o.isActive)} style={{ background: o.isActive ? "#ef444420" : "#10b98120", color: o.isActive ? "#ef4444" : "#10b981", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>
                        {o.isActive ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={S.modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "#EEEEF5", margin: 0, fontSize: 16, fontWeight: 700 }}>Edit: {selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#505070", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={S.label}>Status</label>
                  <select style={S.select} value={editForm.isActive ? "active" : "inactive"} onChange={e => setEditForm(p => ({ ...p, isActive: e.target.value === "active" }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive (Disabled)</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Plan</label>
                  <select style={S.select} value={editForm.plan} onChange={e => setEditForm(p => ({ ...p, plan: e.target.value }))}>
                    {["FREE", "STARTER", "PRO", "ENTERPRISE"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>Plan Expiry Date</label>
                <input type="date" style={S.input} value={editForm.planExpiresAt} onChange={e => setEditForm(p => ({ ...p, planExpiresAt: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Admin Notes (internal)</label>
                <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" as const }} value={editForm.adminNotes} onChange={e => setEditForm(p => ({ ...p, adminNotes: e.target.value }))} placeholder="Internal notes about this organization..." />
              </div>
              <div style={{ background: "#131327", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#505070", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Organization Stats</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[["Members", selected._count.members], ["Parties", selected._count.parties], ["Invoices", selected._count.invoices]].map(([k, v]) => (
                    <div key={String(k)} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#EEEEF5" }}>{v}</div>
                      <div style={{ fontSize: 10, color: "#505070" }}>{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setSelected(null)} style={{ ...S.btn, background: "#1C1C35", color: "#CCCCEE" }}>Cancel</button>
              <button onClick={save} style={S.btn} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
