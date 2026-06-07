import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Search, Eye, X, CheckCircle, XCircle, Package,
  ChevronDown, ChevronUp, Save, ToggleLeft, ToggleRight,
} from "lucide-react";

const S = {
  page:        { padding: "24px 28px", background: "var(--bg-main)", minHeight: "100vh" } as React.CSSProperties,
  title:       { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle:    { fontSize: 13, color: "var(--text-ghost)", marginTop: 2, marginBottom: 24 } as React.CSSProperties,
  card:        { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" } as React.CSSProperties,
  toolbar:     { display: "flex", gap: 10, padding: "14px 16px", alignItems: "center", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  searchWrap:  { position: "relative" as const, flex: 1, maxWidth: 320 },
  searchInput: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px 8px 34px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  searchIcon:  { position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)", pointerEvents: "none" as const },
  table:       { width: "100%", borderCollapse: "collapse" as const },
  th:          { textAlign: "left" as const, padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)" },
  td:          { padding: "12px 14px", fontSize: 13, color: "var(--text-sec)", borderBottom: "1px solid var(--bg-hover)", verticalAlign: "middle" as const },
  modal:       { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 },
  modalBox:    { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto" as const, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" },
  input:       { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" },
  label:       { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 } as React.CSSProperties,
  select:      { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const, fontFamily: "inherit" },
  btn:         { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" } as React.CSSProperties,
  sectionHead: { fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 10 } as React.CSSProperties,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "#6b7280", STARTER: "#6366f1", PRO: "#f59e0b", ENTERPRISE: "#10b981",
};

const ALL_MODULES = [
  { key: "CRM",                 label: "CRM",            desc: "Customers & suppliers" },
  { key: "INVENTORY",           label: "Inventory",      desc: "Products & stock" },
  { key: "PURCHASE",            label: "Purchase",       desc: "Purchase orders" },
  { key: "STORE",               label: "Store",          desc: "Store management" },
  { key: "DISPATCH",            label: "Dispatch",       desc: "Sales orders & dispatch" },
  { key: "ACCOUNTS",            label: "Accounts",       desc: "Invoicing & payments" },
  { key: "POS",                 label: "POS",            desc: "Point of sale" },
  { key: "WAREHOUSE",           label: "Warehouse",      desc: "Warehouse management" },
  { key: "HR",                  label: "HR",             desc: "Employees & payroll" },
  { key: "PROJECTS",            label: "Projects",       desc: "IT & project tracking" },
  { key: "MARKETING",           label: "Marketing",      desc: "Leads & campaigns" },
  { key: "SUPPORT",             label: "Support",        desc: "Help desk & tickets" },
  { key: "ECOMMERCE",           label: "E-commerce",     desc: "Online store" },
  { key: "REPORTS",             label: "Reports",        desc: "Analytics & reporting" },
  { key: "IMPORT_EXPORT_SUITE", label: "Import/Export",  desc: "Trade documentation" },
  { key: "RETAIL_FASHION",      label: "Retail/Fashion", desc: "Retail & fashion ops" },
  { key: "TELECALLING",         label: "Tele-calling",   desc: "Call center operations" },
  { key: "SERVICES",            label: "Services",       desc: "Service catalog & contracts" },
  { key: "STOCK_MARKET",        label: "Stock Market",   desc: "Advisory & trade calls" },
  { key: "HEALTH",              label: "Health",         desc: "Clinic & patient management" },
];

interface Org {
  id: string; name: string; slug: string; email?: string; businessType: string;
  isActive: boolean; plan: string; planExpiresAt?: string; adminNotes?: string;
  enabledModules: string[]; createdAt: string;
  _count: { members: number; parties: number; invoices: number };
}

interface EditForm {
  isActive: boolean;
  plan: string;
  planExpiresAt: string;
  adminNotes: string;
  enabledModules: string[];
}

export default function SuperAdminOrgsPage() {
  const [orgs,      setOrgs]      = useState<Org[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState<Org | null>(null);
  const [editForm,  setEditForm]  = useState<EditForm>({ isActive: true, plan: "FREE", planExpiresAt: "", adminNotes: "", enabledModules: [] });
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState("");
  const [modOpen,   setModOpen]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/super-admin/organizations?search=${encodeURIComponent(search)}&limit=100`);
      setOrgs(r.data.data.orgs);
      setTotal(r.data.data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (o: Org) => {
    setSelected(o);
    setSaveMsg("");
    setEditForm({
      isActive:      o.isActive,
      plan:          o.plan,
      planExpiresAt: o.planExpiresAt ? o.planExpiresAt.slice(0, 10) : "",
      adminNotes:    o.adminNotes || "",
      enabledModules: o.enabledModules || [],
    });
  };

  const toggleModule = (key: string) => {
    setEditForm(p => ({
      ...p,
      enabledModules: p.enabledModules.includes(key)
        ? p.enabledModules.filter(m => m !== key)
        : [...p.enabledModules, key],
    }));
  };

  const enableAll  = () => setEditForm(p => ({ ...p, enabledModules: ALL_MODULES.map(m => m.key) }));
  const disableAll = () => setEditForm(p => ({ ...p, enabledModules: [] }));

  const save = async () => {
    if (!selected) return;
    setSaving(true); setSaveMsg("");
    try {
      await api.patch(`/super-admin/organizations/${selected.id}`, {
        ...editForm,
        planExpiresAt: editForm.planExpiresAt || null,
      });
      setSaveMsg("Saved successfully.");
      load();
      setTimeout(() => setSaveMsg(""), 2500);
    } catch { setSaveMsg("Save failed."); }
    setSaving(false);
  };

  const quickToggle = async (id: string, isActive: boolean) => {
    try { await api.patch(`/super-admin/organizations/${id}`, { isActive }); load(); } catch { /* ignore */ }
  };

  const trialExpired = (org: Org) => {
    if (!org.planExpiresAt) return false;
    return new Date(org.planExpiresAt) < new Date();
  };

  return (
    <div style={S.page}>
      <h1 style={S.title}>Organizations</h1>
      <p style={S.subtitle}>Manage all organizations, their modules and access on the platform ({total} total)</p>

      <div style={S.card}>
        {/* Toolbar */}
        <div style={S.toolbar}>
          <div style={S.searchWrap}>
            <Search size={14} style={S.searchIcon} />
            <input
              style={S.searchInput}
              placeholder="Search by name, email, slug…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-ghost)", marginLeft: "auto" }}>
            {total} organization{total !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-ghost)" }}>Loading organizations…</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Organization", "Plan", "Modules", "Members", "Invoices", "Joined", "Status", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "var(--text-ghost)", padding: 40 }}>No organizations found.</td></tr>
              ) : orgs.map(o => (
                <tr key={o.id} style={{ background: !o.isActive ? "rgba(239,68,68,0.03)" : "transparent" }}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 1 }}>{o.slug}</div>
                    {o.email && <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{o.email}</div>}
                    {trialExpired(o) && (
                      <span style={{ fontSize: 10, color: "#f59e0b", background: "#f59e0b15", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>TRIAL EXPIRED</span>
                    )}
                  </td>
                  <td style={S.td}>
                    <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: (PLAN_COLORS[o.plan] || "#6b7280") + "20", color: PLAN_COLORS[o.plan] || "#6b7280" }}>
                      {o.plan}
                    </span>
                    {o.planExpiresAt && (
                      <div style={{ fontSize: 10, color: "var(--text-ghost)", marginTop: 3 }}>
                        Exp: {new Date(o.planExpiresAt).toLocaleDateString("en-IN")}
                      </div>
                    )}
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 200 }}>
                      {(o.enabledModules || []).length === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>None</span>
                      ) : (o.enabledModules || []).slice(0, 4).map(m => (
                        <span key={m} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "#6366f120", color: "#818cf8", fontWeight: 500 }}>
                          {ALL_MODULES.find(x => x.key === m)?.label || m}
                        </span>
                      ))}
                      {(o.enabledModules || []).length > 4 && (
                        <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>+{(o.enabledModules || []).length - 4} more</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...S.td, textAlign: "center" as const }}>{o._count.members}</td>
                  <td style={{ ...S.td, textAlign: "center" as const }}>{o._count.invoices}</td>
                  <td style={{ ...S.td, fontSize: 11 }}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: o.isActive ? "#10b98118" : "#ef444418", color: o.isActive ? "#10b981" : "#ef4444" }}>
                      {o.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(o)} style={{ background: "#6366f120", color: "#818cf8", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <Eye size={11} /> Manage
                      </button>
                      <button onClick={() => quickToggle(o.id, !o.isActive)} style={{ background: o.isActive ? "#ef444418" : "#10b98118", color: o.isActive ? "#ef4444" : "#10b981", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        {o.isActive ? <><XCircle size={11} /> Restrict</> : <><CheckCircle size={11} /> Enable</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {selected && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={S.modalBox}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1 }}>
              <div>
                <h3 style={{ color: "var(--text-primary)", margin: 0, fontSize: 16, fontWeight: 700 }}>{selected.name}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-ghost)" }}>{selected.slug} · {selected._count.members} member{selected._count.members !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[["Members", selected._count.members, "#818cf8"], ["Parties", selected._count.parties, "#34d399"], ["Invoices", selected._count.invoices, "#fbbf24"]].map(([k, v, c]) => (
                  <div key={String(k)} style={{ background: "var(--bg-hover)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: String(c) }}>{v}</div>
                    <div style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 2 }}>{k}</div>
                  </div>
                ))}
              </div>

              {/* Status & Plan */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={S.label}>Access Status</label>
                  <select style={S.select} value={editForm.isActive ? "active" : "inactive"} onChange={e => setEditForm(p => ({ ...p, isActive: e.target.value === "active" }))}>
                    <option value="active">✅ Active — Full Access</option>
                    <option value="inactive">🚫 Restricted — No Access</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Subscription Plan</label>
                  <select style={S.select} value={editForm.plan} onChange={e => setEditForm(p => ({ ...p, plan: e.target.value }))}>
                    <option value="FREE">FREE</option>
                    <option value="STARTER">STARTER</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={S.label}>Plan / Trial Expiry Date</label>
                <input type="date" style={S.input} value={editForm.planExpiresAt} onChange={e => setEditForm(p => ({ ...p, planExpiresAt: e.target.value }))} />
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-ghost)" }}>Leave blank for no expiry. When expired, you can restrict access via the Status field above.</p>
              </div>

              {/* ── Module Management ── */}
              <div>
                <button
                  onClick={() => setModOpen(v => !v)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", marginBottom: modOpen ? 10 : 0 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Package size={14} color="#818cf8" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Module Access</span>
                    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "#6366f120", color: "#818cf8", fontWeight: 600 }}>
                      {editForm.enabledModules.length} / {ALL_MODULES.length} enabled
                    </span>
                  </div>
                  {modOpen ? <ChevronUp size={14} color="var(--text-ghost)" /> : <ChevronDown size={14} color="var(--text-ghost)" />}
                </button>

                {modOpen && (
                  <div>
                    {/* Quick actions */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <button onClick={enableAll} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, background: "#10b98118", color: "#10b981", border: "1px solid #10b98130", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <ToggleRight size={12} /> Enable All
                      </button>
                      <button onClick={disableAll} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, background: "#ef444418", color: "#ef4444", border: "1px solid #ef444430", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <ToggleLeft size={12} /> Disable All
                      </button>
                    </div>

                    {/* Module grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {ALL_MODULES.map(mod => {
                        const enabled = editForm.enabledModules.includes(mod.key);
                        return (
                          <button
                            key={mod.key}
                            onClick={() => toggleModule(mod.key)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                              border: `1px solid ${enabled ? "#6366f140" : "var(--border)"}`,
                              background: enabled ? "#6366f112" : "var(--bg-hover)",
                              transition: "all 0.12s", textAlign: "left" as const,
                              fontFamily: "inherit",
                            }}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: enabled ? "#6366f1" : "#44445a", flexShrink: 0, transition: "background 0.12s" }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: enabled ? "var(--text-primary)" : "var(--text-ghost)" }}>{mod.label}</div>
                              <div style={{ fontSize: 10, color: "var(--text-ghost)", marginTop: 1 }}>{mod.desc}</div>
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: enabled ? "#10b981" : "#ef4444", flexShrink: 0 }}>
                              {enabled ? "ON" : "OFF"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <label style={S.label}>Internal Notes</label>
                <textarea
                  style={{ ...S.input, minHeight: 70, resize: "vertical" as const }}
                  value={editForm.adminNotes}
                  onChange={e => setEditForm(p => ({ ...p, adminNotes: e.target.value }))}
                  placeholder="Internal notes about this organization (not visible to org members)…"
                />
              </div>

              {/* Footer actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", paddingTop: 4 }}>
                {saveMsg && (
                  <span style={{ fontSize: 12, color: saveMsg.includes("fail") ? "#ef4444" : "#10b981", fontWeight: 500 }}>{saveMsg}</span>
                )}
                <button onClick={() => setSelected(null)} style={{ ...S.btn, background: "var(--bg-hover)", color: "var(--text-sec)" }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ ...S.btn, display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.7 : 1 }}>
                  <Save size={13} />
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
