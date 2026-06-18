import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ALL_MODULES } from "@/lib/modules";
import { Settings, Building2, Users, Shield, X, Plus, Check, Zap, Lock, SmartphoneNfc, UserCog } from "lucide-react";
import { useTranslation } from 'react-i18next';

const S = {
  page: { padding: "24px 28px", background: "var(--bg-main)", minHeight: "100vh" } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "var(--text-ghost)", marginTop: 2, marginBottom: 24 } as React.CSSProperties,
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 4, flexWrap: "wrap" as const } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 20 } as React.CSSProperties,
  section: { fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  input: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 } as React.CSSProperties,
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 } as React.CSSProperties,
  select: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const },
  modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modalBox: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 460 },
  toggle: (on: boolean) => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", borderRadius: 10, background: on ? "#6366f110" : "var(--bg-hover)",
    border: `1px solid ${on ? "#6366f140" : "var(--border)"}`, cursor: "pointer",
  }) as React.CSSProperties,
};

type Tab = "organization" | "modules" | "team" | "hr" | "security";

interface Member { id: string; name: string; email: string; role: string; joinedAt: string }

// Default HR settings — all features ON, 26 working days
const HR_DEFAULTS = {
  defaultWorkingDays: 26 as number,
  enableHRA: true,
  enableAllowances: true,
  enablePF: true,
  enableESI: true,
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const { activeOrg, updateActiveOrgModules, loadModuleAccess, user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [tab, setTab] = useState<Tab>("organization");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({ name: "", taxId: "", phone: "", email: "", address: "", city: "", state: "", country: "India", currency: "INR", website: "" });
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [hrSettings, setHrSettings] = useState({ ...HR_DEFAULTS });
  const [members, setMembers] = useState<Member[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");
  const [inviting, setInviting] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, mRes] = await Promise.all([
          api.get("/organizations/current"),
          api.get("/organizations/current/members"),
        ]);
        const o = oRes.data.data;
        if (o) {
          setForm({
            name: o.name || "",
            taxId: o.taxId || "",
            phone: o.phone || "",
            email: o.email || "",
            address: o.address || "",
            city: o.city || "",
            state: o.state || "",
            country: o.country || "India",
            currency: o.currency || "INR",
            website: o.website || "",
          });
          const mods: string[] = o.enabledModules || [];
          setEnabledModules(mods.length === 0 ? ALL_MODULES.map((m) => m.key) : mods);
          // Load HR settings — merge with defaults so missing keys are always defined
          if (o.hrSettings) setHrSettings({ ...HR_DEFAULTS, ...o.hrSettings });
        }
        setMembers(Array.isArray(mRes.data.data) ? mRes.data.data : []);
      } catch { /* ignore */ }
    };
    load();
  }, [activeOrg?.id]);

  const saveOrg = async () => {
    setSaving(true);
    try {
      await api.patch("/organizations/current", form);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const saveModules = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await api.patch("/organizations/current", { enabledModules });
      updateActiveOrgModules(enabledModules);
      await loadModuleAccess(); // re-sync isOrgAdmin + moduleAccess so sidebar updates immediately
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Failed to save. Please try again.");
    }
    setSaving(false);
  };

  const toggleModule = (key: string) =>
    setEnabledModules(p => p.includes(key) ? p.filter(m => m !== key) : [...p, key]);

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await api.post("/organizations/current/members/invite", { email: inviteEmail, role: inviteRole });
      setInviteDone(true);
      setTimeout(() => { setInviteDone(false); setShowInvite(false); setInviteEmail(""); setInviteRole("STAFF"); }, 2000);
    } catch { /* ignore */ }
    setInviting(false);
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const hf = <K extends keyof typeof hrSettings>(k: K, v: typeof hrSettings[K]) =>
    setHrSettings(p => ({ ...p, [k]: v }));

  const saveHrSettings = async () => {
    setSaving(true); setSaveError("");
    try {
      await api.patch("/organizations/current", { hrSettings });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { setSaveError("Failed to save HR settings."); }
    setSaving(false);
  };

  const claimAdmin = async () => {
    setClaimingAdmin(true);
    setClaimMsg("");
    try {
      const r = await api.post("/auth/claim-super-admin");
      setClaimMsg(r.data.message || "You are now the Admin. Logging out to refresh session…");
      setClaimSuccess(true);
      setTimeout(async () => { await logout(); navigate("/login"); }, 2500);
    } catch (e: any) {
      setClaimMsg(e?.response?.data?.message || "Failed. An admin may already exist for this organisation.");
    }
    setClaimingAdmin(false);
  };

  const tabStyle = (t: Tab) => ({
    padding: "8px 18px", borderRadius: "8px 8px 0 0", border: "none",
    background: tab === t ? "var(--bg-card)" : "transparent",
    color: tab === t ? "var(--text-primary)" : "var(--text-ghost)", cursor: "pointer", fontWeight: 600, fontSize: 13,
    borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
  });

  const CATEGORIES = [
    { key: "core",        label: "Core Business" },
    { key: "operations",  label: "Operations" },
    { key: "growth",      label: "Growth & Support" },
    { key: "industry",    label: "Industry Specific" },
    { key: "hospitality", label: "Food & Hospitality" },
  ] as const;

  return (
    <div className="page-pad">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <Settings size={20} color="#6366f1" />
        <h1 style={S.title}>{ t('page_settings') }</h1>
      </div>
      <p style={S.subtitle}>Organization profile, modules, team members and preferences</p>

      {/* One-time Admin claim — only visible if not yet owner/admin of an org */}
      {!claimSuccess && (
        <div style={{ background: "var(--bg-card)", border: "1px solid #1a2a1a", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#6366f115", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserCog size={17} color="#6366f1" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Claim Organisation Admin (First-time Setup)</div>
            <div style={{ fontSize: 12, color: "var(--text-ghost)" }}>
              {claimMsg || "If no admin exists for your organisation yet, click to become the Admin. Only one admin per organisation."}
            </div>
          </div>
          <button onClick={claimAdmin} disabled={claimingAdmin} style={{ background: "#6366f120", color: "#818cf8", border: "1px solid #6366f140", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            {claimingAdmin ? "Claiming…" : "Claim Admin"}
          </button>
        </div>
      )}

      <div style={S.tabs}>
        <button style={tabStyle("organization")} onClick={() => setTab("organization")}>
          <Building2 size={13} style={{ display: "inline", marginRight: 6 }} />Organization
        </button>
        <button style={tabStyle("modules")} onClick={() => setTab("modules")}>
          <Shield size={13} style={{ display: "inline", marginRight: 6 }} />Modules
        </button>
        <button style={tabStyle("team")} onClick={() => setTab("team")}>
          <Users size={13} style={{ display: "inline", marginRight: 6 }} />Team
        </button>
        <button style={tabStyle("hr")} onClick={() => setTab("hr")}>
          <UserCog size={13} style={{ display: "inline", marginRight: 6 }} />HR Settings
        </button>
        <button style={tabStyle("security")} onClick={() => setTab("security")}>
          <Lock size={13} style={{ display: "inline", marginRight: 6 }} />Security
        </button>
      </div>

      {/* ── ORGANIZATION PROFILE ── */}
      {tab === "organization" && (
        <div style={S.card}>
          <div style={S.section}>Organization Profile</div>
          <div className="grid-r2">
            <div><label style={S.label}>Organization Name *</label>
              <input style={S.input} value={form.name} onChange={e => f("name", e.target.value)} />
            </div>
            <div><label style={S.label}>GST / Tax ID (Optional)</label>
              <input style={S.input} value={form.taxId} onChange={e => f("taxId", e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>
          <div className="grid-r2">
            <div><label style={S.label}>Email</label>
              <input type="email" style={S.input} value={form.email} onChange={e => f("email", e.target.value)} />
            </div>
            <div><label style={S.label}>Phone</label>
              <input style={S.input} value={form.phone} onChange={e => f("phone", e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}><label style={S.label}>Address</label>
            <input style={S.input} value={form.address} onChange={e => f("address", e.target.value)} />
          </div>
          <div className="grid-r2">
            <div><label style={S.label}>City</label>
              <input style={S.input} value={form.city} onChange={e => f("city", e.target.value)} />
            </div>
            <div><label style={S.label}>State</label>
              <input style={S.input} value={form.state} onChange={e => f("state", e.target.value)} />
            </div>
          </div>
          <div className="grid-r2">
            <div>
              <label style={S.label}>Country</label>
              <select style={S.select} value={form.country} onChange={e => f("country", e.target.value)}>
                {["India", "United States", "United Kingdom", "UAE", "Singapore", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Currency</label>
              <select style={S.select} value={form.currency} onChange={e => f("currency", e.target.value)}>
                {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}><label style={S.label}>Website</label>
            <input style={S.input} value={form.website} onChange={e => f("website", e.target.value)} placeholder="https://example.com" />
          </div>
          <button onClick={saveOrg} style={S.btn} disabled={saving}>
            {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* ── MODULE SELECTION ── */}
      {tab === "modules" && (
        <div style={S.card}>
          <div style={S.section}>Enabled Modules</div>
          <p style={{ fontSize: 13, color: "var(--text-ghost)", marginBottom: 20 }}>
            Select which modules are active for <strong style={{ color: "var(--text-primary)" }}>{activeOrg?.name}</strong>. Changes affect all team members.
          </p>
          {CATEGORIES.map(cat => {
            const mods = ALL_MODULES.filter(m => m.category === cat.key);
            return (
              <div key={cat.key} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{cat.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                  {mods.map(m => {
                    const on = enabledModules.includes(m.key);
                    return (
                      <label key={m.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: on ? "#6366f115" : "var(--bg-hover)", borderRadius: 8, border: `1px solid ${on ? "#6366f1" : "var(--border)"}`, cursor: "pointer" }}>
                        <input type="checkbox" checked={on} onChange={() => toggleModule(m.key)} style={{ accentColor: "#6366f1" }} />
                        <div>
                          <div style={{ fontSize: 13, color: on ? "var(--text-primary)" : "var(--text-sec)", fontWeight: on ? 600 : 400 }}>{m.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-ghost)", marginTop: 1 }}>{m.description.slice(0, 50)}…</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={saveModules} style={S.btn} disabled={saving}>
              {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Module Selection"}
            </button>
            <span style={{ fontSize: 12, color: "var(--text-ghost)" }}>{enabledModules.length} module{enabledModules.length !== 1 ? "s" : ""} selected</span>
            {saveError && <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>{saveError}</span>}
          </div>
        </div>
      )}

      {/* ── TEAM MEMBERS ── */}
      {tab === "team" && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={S.section as React.CSSProperties}>Team Members</div>
            <button onClick={() => setShowInvite(true)} style={{ ...S.btn, padding: "7px 14px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <Plus size={13} /> Invite Member
            </button>
          </div>
          {members.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-ghost)", padding: 32 }}>No team members yet.</div>
          ) : members.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--bg-hover)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-ghost)" }}>{m.email}</div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "#6366f120", color: "#818cf8", fontWeight: 600 }}>{m.role}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {showInvite && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="modal-inner">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "var(--text-primary)", margin: 0, fontSize: 16, fontWeight: 700 }}>Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {inviteDone ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Check size={32} color="#10b981" style={{ margin: "0 auto 10px", display: "block" }} />
                <div style={{ color: "#10b981", fontWeight: 600 }}>Invitation sent!</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                  <div><label style={S.label}>Email Address</label>
                    <input type="email" style={S.input} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="team@example.com" />
                  </div>
                  <div><label style={S.label}>Role</label>
                    <select style={S.select} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                      {["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "STAFF", "VIEWER"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowInvite(false)} style={{ ...S.btn, background: "var(--bg-hover)", color: "var(--text-sec)" }}>Cancel</button>
                  <button onClick={sendInvite} style={S.btn} disabled={inviting || !inviteEmail}>
                    {inviting ? "Sending..." : "Send Invite"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HR SETTINGS ── */}
      {tab === "hr" && (
        <div style={S.card}>
          <div style={S.section}>HR & Payroll Settings</div>
          <p style={{ fontSize: 13, color: "var(--text-ghost)", marginBottom: 20 }}>
            Configure how salary is calculated for all employees in <strong style={{ color: "var(--text-primary)" }}>{activeOrg?.name}</strong>. These settings apply to all payroll generations.
          </p>

          {/* Working Days */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Default Working Days (for salary proration)</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
              {[26, 30, 31].map(d => (
                <button key={d} onClick={() => hf("defaultWorkingDays", d)}
                  style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    borderColor: hrSettings.defaultWorkingDays === d ? "#6366f1" : "var(--border-input)",
                    background: hrSettings.defaultWorkingDays === d ? "#6366f120" : "var(--bg-hover)",
                    color: hrSettings.defaultWorkingDays === d ? "#818cf8" : "var(--text-sec)",
                  }}>
                  {d} Days
                  <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-ghost)", marginTop: 2 }}>
                    {d === 26 ? "Standard (recommended)" : d === 30 ? "Calendar month" : "31-day months"}
                  </div>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 8 }}>
              Salary is prorated as: <code style={{ background: "var(--bg-hover)", padding: "1px 6px", borderRadius: 4 }}>Basic ÷ {hrSettings.defaultWorkingDays} × Days Present</code>
            </p>
          </div>

          {/* Allowance toggles */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Salary Components</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* HRA */}
              <div style={S.toggle(hrSettings.enableHRA)} onClick={() => hf("enableHRA", !hrSettings.enableHRA)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>HRA (House Rent Allowance)</div>
                  <div style={{ fontSize: 12, color: "var(--text-ghost)", marginTop: 2 }}>Include HRA in salary structure and payroll calculations</div>
                </div>
                <ToggleSwitch on={hrSettings.enableHRA} />
              </div>
              {/* Allowances */}
              <div style={S.toggle(hrSettings.enableAllowances)} onClick={() => hf("enableAllowances", !hrSettings.enableAllowances)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Other Allowances</div>
                  <div style={{ fontSize: 12, color: "var(--text-ghost)", marginTop: 2 }}>Include travel, food, medical and other allowances in payroll</div>
                </div>
                <ToggleSwitch on={hrSettings.enableAllowances} />
              </div>
            </div>
          </div>

          {/* Statutory deduction toggles */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Statutory Deductions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* PF */}
              <div style={S.toggle(hrSettings.enablePF)} onClick={() => hf("enablePF", !hrSettings.enablePF)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Provident Fund (PF)</div>
                  <div style={{ fontSize: 12, color: "var(--text-ghost)", marginTop: 2 }}>Auto-deduct 12% of basic salary as employee PF contribution</div>
                </div>
                <ToggleSwitch on={hrSettings.enablePF} />
              </div>
              {/* ESI */}
              <div style={S.toggle(hrSettings.enableESI)} onClick={() => hf("enableESI", !hrSettings.enableESI)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>ESI (Employee State Insurance)</div>
                  <div style={{ fontSize: 12, color: "var(--text-ghost)", marginTop: 2 }}>Auto-deduct 0.75% of gross salary when gross ≤ ₹21,000/month</div>
                </div>
                <ToggleSwitch on={hrSettings.enableESI} />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div style={{ background: "var(--bg-hover)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Active Configuration Preview</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
              {[
                { label: `${hrSettings.defaultWorkingDays}-day month`, on: true },
                { label: "HRA", on: hrSettings.enableHRA },
                { label: "Allowances", on: hrSettings.enableAllowances },
                { label: "PF 12%", on: hrSettings.enablePF },
                { label: "ESI 0.75%", on: hrSettings.enableESI },
              ].map(c => (
                <span key={c.label} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: c.on ? "#10b98120" : "#ef444415",
                  color: c.on ? "#10b981" : "#ef4444",
                  border: `1px solid ${c.on ? "#10b98140" : "#ef444430"}`,
                }}>
                  {c.on ? "✓" : "✗"} {c.label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={saveHrSettings} style={S.btn} disabled={saving}>
              {saved ? "✓ Saved!" : saving ? "Saving…" : "Save HR Settings"}
            </button>
            {saveError && <span style={{ fontSize: 12, color: "#f87171" }}>{saveError}</span>}
          </div>
        </div>
      )}

      {/* ── SECURITY / 2FA ── */}
      {tab === "security" && <TwoFactorSettings />}
    </div>
  );
}

// ── Reusable toggle switch ───────────────────────────────────
function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <div style={{
      width: 42, height: 24, borderRadius: 12, flexShrink: 0,
      background: on ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--border)",
      position: "relative", transition: "background 0.2s",
    }}>
      <div style={{
        position: "absolute", top: 3, left: on ? 21 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "white",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

function TwoFactorSettings() {
  const [status, setStatus] = useState<"idle" | "loading" | "setup" | "verify" | "done">("loading");
  const [enabled, setEnabled] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/2fa/status").then(r => {
      setEnabled(r.data.data.enabled);
      setStatus("idle");
    }).catch(() => setStatus("idle"));
  }, []);

  async function startSetup() {
    setStatus("loading");
    try {
      const r = await api.post("/2fa/setup");
      setQrDataUrl(r.data.data.qrDataUrl);
      setSecret(r.data.data.secret);
      setStatus("setup");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed");
      setStatus("idle");
    }
  }

  async function confirmToken() {
    setError("");
    try {
      await api.post("/2fa/verify", { token });
      setEnabled(true);
      setStatus("done");
      setMsg("2FA enabled successfully! Your account is now protected.");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Invalid OTP");
    }
  }

  async function disableIt() {
    if (!token) { setError("Enter your current OTP to disable 2FA"); return; }
    try {
      await api.post("/2fa/disable", { token });
      setEnabled(false);
      setToken("");
      setStatus("idle");
      setMsg("2FA has been disabled.");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Invalid OTP");
    }
  }

  const S2 = {
    card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 20 } as React.CSSProperties,
    input: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" as const, letterSpacing: "0.2em", fontSize: 18, textAlign: "center" as const } as React.CSSProperties,
    btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 } as React.CSSProperties,
  };

  if (status === "loading") return <div style={{ textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>Loading…</div>;

  return (
    <div style={S2.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#6366f115", border: "1px solid #6366f130", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SmartphoneNfc size={18} color="#818cf8" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Two-Factor Authentication (2FA)</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-ghost)" }}>Add an extra layer of security using an authenticator app</p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: enabled ? "#10b98120" : "#ef444420", color: enabled ? "#10b981" : "#ef4444" }}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {msg && <div style={{ background: "#10b98115", border: "1px solid #10b98130", borderRadius: 8, padding: "10px 14px", color: "#10b981", fontSize: 13, marginBottom: 16 }}>{msg}</div>}
      {error && <div style={{ background: "#ef444415", border: "1px solid #ef444430", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {status === "idle" && !enabled && (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-ghost)", marginBottom: 16 }}>
            Use any TOTP authenticator app (Google Authenticator, Authy, Microsoft Authenticator) to scan a QR code and generate 6-digit login codes.
          </p>
          <button style={S2.btn} onClick={startSetup}>Set Up 2FA</button>
        </div>
      )}

      {status === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-sec)", textAlign: "center" }}>
            Scan this QR code with your authenticator app, then enter the 6-digit code below to confirm.
          </p>
          <img src={qrDataUrl} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 12, background: "white", padding: 8 }} />
          <p style={{ fontSize: 11, color: "var(--text-ghost)", textAlign: "center" }}>
            Can't scan? Enter this secret manually: <code style={{ background: "var(--bg-hover)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{secret}</code>
          </p>
          <div style={{ width: "100%", maxWidth: 240 }}>
            <input
              value={token} onChange={e => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" maxLength={6} style={S2.input}
            />
          </div>
          <button style={S2.btn} onClick={confirmToken} disabled={token.length !== 6}>Confirm & Enable</button>
        </div>
      )}

      {status === "done" && (
        <p style={{ fontSize: 13, color: "#10b981" }}>Your account is protected with 2FA. You can disable it below.</p>
      )}

      {(status === "idle" || status === "done") && enabled && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 13, color: "var(--text-ghost)", marginBottom: 12 }}>To disable 2FA, enter your current OTP:</p>
          <div style={{ display: "flex", gap: 10, maxWidth: 320 }}>
            <input value={token} onChange={e => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
              style={{ ...S2.input, flex: 1, fontSize: 14 }} />
            <button onClick={disableIt} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #ef444440", background: "#ef444415", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" as const }}>
              Disable 2FA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
