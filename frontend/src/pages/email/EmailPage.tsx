import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Mail, Send, Plus, Search, X, Trash2, FileText,
  CheckCircle, XCircle, Clock, ChevronDown, Eye,
} from "lucide-react";

const S = {
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "var(--text-ghost)", marginTop: 2 } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  kpi: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" } as React.CSSProperties,
  kpiValue: { fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 0" } as React.CSSProperties,
  kpiLabel: { fontSize: 12, color: "var(--text-ghost)", fontWeight: 500 } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 } as React.CSSProperties,
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" as const },
  td: { padding: "12px", fontSize: 13, color: "var(--text-sec)", borderBottom: "1px solid #131327" },
  input: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 },
  select: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const },
};

const CATEGORIES = ["GENERAL", "SALES", "SUPPORT", "INVOICE", "FOLLOW_UP", "CAMPAIGN", "HR"];
const STATUS_COLORS: Record<string, string> = { SENT: "#10b981", FAILED: "#ef4444", DRAFT: "#818cf8" };

interface Stats { total: number; sent: number; failed: number; draft: number; }
interface EmailLog { id: string; toEmail: string; ccEmail?: string; subject: string; status: string; sentAt?: string; createdAt: string; party?: { id: string; name: string } | null; template?: { id: string; name: string } | null; body: string; }
interface Template { id: string; name: string; subject: string; body: string; category: string; }
interface Party { id: string; name: string; email?: string; }

const emptyCompose = { toEmail: "", ccEmail: "", subject: "", body: "", templateId: "", partyId: "" };
const emptyTemplate = { name: "", subject: "", body: "", category: "GENERAL" };

export default function EmailPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sent" | "templates">("sent");
  const [search, setSearch] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);
  const [compose, setCompose] = useState({ ...emptyCompose });
  const [tplForm, setTplForm] = useState({ ...emptyTemplate });
  const [sending, setSending] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [error, setError] = useState("");
  const [tplError, setTplError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, eRes, tRes, pRes] = await Promise.all([
        api.get("/email/stats"),
        api.get("/email?limit=200"),
        api.get("/email/templates"),
        api.get("/parties?limit=300"),
      ]);
      setStats(sRes.data.data);
      setEmails(eRes.data.data.emails || []);
      setTemplates(tRes.data.data.templates || []);
      setParties(pRes.data.data?.parties || pRes.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyTemplate = (tplId: string) => {
    const t = templates.find(t => t.id === tplId);
    if (t) setCompose(p => ({ ...p, subject: t.subject, body: t.body, templateId: tplId }));
  };

  const applyPartyEmail = (partyId: string) => {
    const p = parties.find(p => p.id === partyId);
    if (p?.email) setCompose(prev => ({ ...prev, toEmail: p.email!, partyId }));
    else setCompose(prev => ({ ...prev, partyId }));
  };

  const sendEmail = async () => {
    if (!compose.toEmail || !compose.subject || !compose.body) {
      setError("To, Subject and Body are required"); return;
    }
    setSending(true); setError("");
    try {
      await api.post("/email/send", {
        ...compose,
        partyId: compose.partyId || undefined,
        templateId: compose.templateId || undefined,
        ccEmail: compose.ccEmail || undefined,
      });
      setShowCompose(false);
      setCompose({ ...emptyCompose });
      load();
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to send"); }
    setSending(false);
  };

  const deleteEmail = async (id: string) => {
    try { await api.delete(`/email/${id}`); load(); } catch { /* ignore */ }
  };

  const saveTemplate = async () => {
    if (!tplForm.name || !tplForm.subject || !tplForm.body) {
      setTplError("Name, Subject and Body are required"); return;
    }
    setSavingTpl(true); setTplError("");
    try {
      if (editTemplateId) await api.put(`/email/templates/${editTemplateId}`, tplForm);
      else await api.post("/email/templates", tplForm);
      setShowTemplate(false);
      setTplForm({ ...emptyTemplate });
      setEditTemplateId(null);
      load();
    } catch (e: any) { setTplError(e?.response?.data?.message || "Failed"); }
    setSavingTpl(false);
  };

  const deleteTemplate = async (id: string) => {
    try { await api.delete(`/email/templates/${id}`); load(); } catch { /* ignore */ }
  };

  const openEditTemplate = (t: Template) => {
    setEditTemplateId(t.id);
    setTplForm({ name: t.name, subject: t.subject, body: t.body, category: t.category });
    setTplError("");
    setShowTemplate(true);
  };

  const filtered = emails.filter(e =>
    !search || e.toEmail.toLowerCase().includes(search.toLowerCase()) ||
    e.subject.toLowerCase().includes(search.toLowerCase()) ||
    (e.party?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-pad">
      {/* Header */}
      <div className="page-hdr">
        <div>
          <h1 style={S.title}>Email & Communications</h1>
          <p style={S.subtitle}>Compose, send and track emails to customers, leads and partners</p>
        </div>
        <button style={S.btn} onClick={() => { setCompose({ ...emptyCompose }); setError(""); setShowCompose(true); }}>
          <Send size={15} /> Compose Email
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { label: "Total Sent", value: stats?.total ?? "—", color: "#6366f1" },
          { label: "Delivered", value: stats?.sent ?? "—", color: "#10b981" },
          { label: "Failed", value: stats?.failed ?? "—", color: "#ef4444" },
          { label: "Templates", value: templates.length, color: "#f59e0b" },
        ].map(k => (
          <div key={k.label} style={S.kpi}>
            <span style={S.kpiLabel}>{k.label}</span>
            <div style={{ ...S.kpiValue, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["sent", "templates"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 16px", borderRadius: 8, border: `1px solid ${tab === t ? "#6366f1" : "#1C1C35"}`,
            background: tab === t ? "#6366f120" : "transparent", color: tab === t ? "#818CF8" : "var(--text-ghost)",
            cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize",
          }}>
            {t === "sent" ? "Sent Emails" : "Templates"}
          </button>
        ))}
        {tab === "templates" && (
          <button style={{ ...S.btn, marginLeft: "auto", padding: "7px 14px", fontSize: 12 }}
            onClick={() => { setEditTemplateId(null); setTplForm({ ...emptyTemplate }); setTplError(""); setShowTemplate(true); }}>
            <Plus size={14} /> New Template
          </button>
        )}
      </div>

      {/* Sent Emails Tab */}
      {tab === "sent" && (
        <div style={S.card}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" }} />
              <input style={{ ...S.input, paddingLeft: 34 }} placeholder="Search by recipient, subject..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-ghost)", fontSize: 12 }}>
              <Mail size={14} /> {filtered.length} emails
            </div>
          </div>

          {loading ? <div style={{ padding: 40, textAlign: "center", color: "var(--text-ghost)" }}>Loading...</div> : (
            <div className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["To", "Subject", "Party", "Template", "Status", "Sent", ""].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "var(--text-ghost)", padding: 40 }}>No emails yet. Compose your first email!</td></tr>
                    : filtered.map(e => (
                      <tr key={e.id}>
                        <td style={{ ...S.td, color: "var(--text-primary)" }}>{e.toEmail}{e.ccEmail && <span style={{ color: "var(--text-ghost)", fontSize: 11 }}> +cc</span>}</td>
                        <td style={{ ...S.td, maxWidth: 240 }}><span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</span></td>
                        <td style={S.td}>{e.party?.name || "—"}</td>
                        <td style={S.td}>{e.template?.name ? <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, background: "#6366f120", color: "#818CF8" }}>{e.template.name}</span> : "—"}</td>
                        <td style={S.td}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: (STATUS_COLORS[e.status] || "#818cf8") + "20", color: STATUS_COLORS[e.status] || "#818cf8" }}>
                            {e.status === "SENT" ? <CheckCircle size={10} /> : e.status === "FAILED" ? <XCircle size={10} /> : <Clock size={10} />}
                            {e.status}
                          </span>
                        </td>
                        <td style={S.td}>{e.sentAt ? new Date(e.sentAt).toLocaleDateString("en-IN") : new Date(e.createdAt).toLocaleDateString("en-IN")}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setPreviewEmail(e)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", padding: 4 }} title="Preview"><Eye size={14} /></button>
                            <button onClick={() => deleteEmail(e.id)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", padding: 4 }} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {tab === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {templates.length === 0 && !loading && (
            <div style={{ gridColumn: "1/-1", ...S.card, textAlign: "center", padding: 48, color: "var(--text-ghost)" }}>
              <FileText size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-sec)" }}>No templates yet</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Create reusable email templates for faster communication</p>
            </div>
          )}
          {templates.map(t => (
            <div key={t.id} style={{ ...S.card, cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{t.name}</p>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "#6366f120", color: "#818CF8" }}>{t.category}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setCompose(p => ({ ...p, subject: t.subject, body: t.body, templateId: t.id })); setShowCompose(true); }}
                    style={{ ...S.btn, padding: "4px 10px", fontSize: 11 }}><Send size={11} /> Use</button>
                  <button onClick={() => openEditTemplate(t)} style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-sec)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Edit</button>
                  <button onClick={() => deleteTemplate(t.id)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", padding: 4 }}><Trash2 size={13} /></button>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#818CF8", fontWeight: 600, marginBottom: 6 }}>Subject: {t.subject}</p>
              <p style={{ fontSize: 12, color: "var(--text-ghost)", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any }}>{t.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal-inner" style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "var(--text-primary)", margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Mail size={18} color="#818CF8" /> Compose Email</h3>
              <button onClick={() => setShowCompose(false)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer" }}><X size={18} /></button>
            </div>

            {error && <div style={{ background: "#ef444420", border: "1px solid #ef4444", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: 12, marginBottom: 14 }}>{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Party picker */}
              <div>
                <label style={S.label}>Customer / Party (optional)</label>
                <select style={S.select} value={compose.partyId} onChange={e => applyPartyEmail(e.target.value)}>
                  <option value="">— Select to auto-fill email —</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}{p.email ? ` (${p.email})` : ""}</option>)}
                </select>
              </div>

              {/* Template picker */}
              <div>
                <label style={S.label}>Use Template (optional)</label>
                <select style={S.select} value={compose.templateId} onChange={e => applyTemplate(e.target.value)}>
                  <option value="">— Select template —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>[{t.category}] {t.name}</option>)}
                </select>
              </div>

              <div className="grid-r2">
                <div>
                  <label style={S.label}>To (Email) *</label>
                  <input style={S.input} type="email" placeholder="recipient@email.com" value={compose.toEmail} onChange={e => setCompose(p => ({ ...p, toEmail: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>CC (optional)</label>
                  <input style={S.input} type="email" placeholder="cc@email.com" value={compose.ccEmail} onChange={e => setCompose(p => ({ ...p, ccEmail: e.target.value }))} />
                </div>
              </div>

              <div>
                <label style={S.label}>Subject *</label>
                <input style={S.input} placeholder="Email subject" value={compose.subject} onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))} />
              </div>

              <div>
                <label style={S.label}>Message *</label>
                <textarea style={{ ...S.input, minHeight: 160, resize: "vertical" }} placeholder="Write your message here..." value={compose.body} onChange={e => setCompose(p => ({ ...p, body: e.target.value }))} />
              </div>

              <div style={{ background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#f59e0b" }}>
                ⚠ Emails are logged in history. For real sending, set SMTP_USER & SMTP_PASS (Gmail App Password) in backend/.env
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCompose(false)} style={{ ...S.btn, background: "var(--bg-hover)", color: "var(--text-sec)" }}>Cancel</button>
              <button onClick={sendEmail} style={S.btn} disabled={sending}>{sending ? "Sending..." : <><Send size={14} /> Send Email</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowTemplate(false)}>
          <div className="modal-inner" style={{ maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "var(--text-primary)", margin: 0, fontSize: 16, fontWeight: 700 }}>{editTemplateId ? "Edit Template" : "New Template"}</h3>
              <button onClick={() => setShowTemplate(false)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {tplError && <div style={{ background: "#ef444420", border: "1px solid #ef4444", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: 12, marginBottom: 14 }}>{tplError}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="grid-r2">
                <div>
                  <label style={S.label}>Template Name *</label>
                  <input style={S.input} placeholder="e.g. Follow-up Email" value={tplForm.name} onChange={e => setTplForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>Category</label>
                  <select style={S.select} value={tplForm.category} onChange={e => setTplForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>Subject *</label>
                <input style={S.input} placeholder="Email subject line" value={tplForm.subject} onChange={e => setTplForm(p => ({ ...p, subject: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Body *</label>
                <textarea style={{ ...S.input, minHeight: 160, resize: "vertical" }} placeholder="Email body content..." value={tplForm.body} onChange={e => setTplForm(p => ({ ...p, body: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowTemplate(false)} style={{ ...S.btn, background: "var(--bg-hover)", color: "var(--text-sec)" }}>Cancel</button>
              <button onClick={saveTemplate} style={S.btn} disabled={savingTpl}>{savingTpl ? "Saving..." : editTemplateId ? "Update" : "Create Template"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewEmail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setPreviewEmail(null)}>
          <div className="modal-inner" style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ color: "var(--text-primary)", margin: 0, fontSize: 15, fontWeight: 700 }}>Email Preview</h3>
              <button onClick={() => setPreviewEmail(null)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ background: "var(--bg-hover)", borderRadius: 8, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-ghost)", marginBottom: 6 }}>
                <strong style={{ color: "var(--text-sec)" }}>To:</strong> {previewEmail.toEmail}
                {previewEmail.ccEmail && <> &nbsp;|&nbsp; <strong style={{ color: "var(--text-sec)" }}>CC:</strong> {previewEmail.ccEmail}</>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>{previewEmail.subject}</div>
              <div style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.7, whiteSpace: "pre-wrap", borderTop: "1px solid var(--border-input)", paddingTop: 12 }}>{previewEmail.body}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-ghost)" }}>{previewEmail.sentAt ? `Sent: ${new Date(previewEmail.sentAt).toLocaleString("en-IN")}` : `Created: ${new Date(previewEmail.createdAt).toLocaleString("en-IN")}`}</span>
              <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: (STATUS_COLORS[previewEmail.status] || "#818cf8") + "20", color: STATUS_COLORS[previewEmail.status] || "#818cf8" }}>{previewEmail.status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
