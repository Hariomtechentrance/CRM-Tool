import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ALL_MODULES } from "@/lib/modules";
import { Settings, Building2, Users, Shield, X, Plus, Check, Zap } from "lucide-react";

const S = {
  page: { padding: "24px 28px", background: "#07071A", minHeight: "100vh" } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#505070", marginTop: 2, marginBottom: 24 } as React.CSSProperties,
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #1C1C35", paddingBottom: 4 } as React.CSSProperties,
  card: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: 24, marginBottom: 20 } as React.CSSProperties,
  section: { fontSize: 13, fontWeight: 700, color: "#EEEEF5", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #1C1C35" } as React.CSSProperties,
  input: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#505070", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 } as React.CSSProperties,
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 } as React.CSSProperties,
  select: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const },
  modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modalBox: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 16, padding: 28, width: 460 },
};

type Tab = "organization" | "modules" | "team";

interface Member { id: string; name: string; email: string; role: string; joinedAt: string }

export default function SettingsPage() {
  const { activeOrg, updateActiveOrgModules, user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [tab, setTab] = useState<Tab>("organization");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: "", taxId: "", phone: "", email: "", address: "", city: "", state: "", country: "India", currency: "INR", website: "" });
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
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
          setEnabledModules(o.enabledModules || []);
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
    try {
      await api.patch("/organizations/current", { enabledModules });
      updateActiveOrgModules(enabledModules);  // update sidebar immediately
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
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

  const claimSuperAdmin = async () => {
    setClaimingAdmin(true);
    setClaimMsg("");
    try {
      const r = await api.post("/auth/claim-super-admin");
      setClaimMsg(r.data.message || "You are now Super Admin. Logging out to refresh session...");
      updateUser({ isSuperAdmin: true });
      setTimeout(async () => { await logout(); navigate("/login"); }, 2500);
    } catch (e: any) {
      setClaimMsg(e?.response?.data?.message || "Failed. A Super Admin may already exist.");
    }
    setClaimingAdmin(false);
  };

  const tabStyle = (t: Tab) => ({
    padding: "8px 18px", borderRadius: "8px 8px 0 0", border: "none",
    background: tab === t ? "#0D0D1F" : "transparent",
    color: tab === t ? "#EEEEF5" : "#505070", cursor: "pointer", fontWeight: 600, fontSize: 13,
    borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
  });

  const CATEGORIES = [
    { key: "core", label: "Core Business" },
    { key: "operations", label: "Operations" },
    { key: "growth", label: "Growth & Support" },
    { key: "industry", label: "Industry Specific" },
  ] as const;

  return (
    <div style={S.page}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <Settings size={20} color="#6366f1" />
        <h1 style={S.title}>Settings</h1>
      </div>
      <p style={S.subtitle}>Organization profile, modules, team members and preferences</p>

      {/* One-time Super Admin claim — only visible if not yet super admin */}
      {!user?.isSuperAdmin && (
        <div style={{ background: "#0D0D1F", border: "1px solid #2a1a1a", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#ef444415", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={17} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#EEEEF5", marginBottom: 2 }}>Activate Super Admin (First-time Setup)</div>
            <div style={{ fontSize: 12, color: "#505070" }}>
              {claimMsg || "Click to make yourself the platform Super Admin. Only works once — no existing super admin must exist."}
            </div>
          </div>
          <button onClick={claimSuperAdmin} disabled={claimingAdmin} style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            {claimingAdmin ? "Activating..." : "Claim Super Admin"}
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
      </div>

      {/* ── ORGANIZATION PROFILE ── */}
      {tab === "organization" && (
        <div style={S.card}>
          <div style={S.section}>Organization Profile</div>
          <div style={S.g2}>
            <div><label style={S.label}>Organization Name *</label>
              <input style={S.input} value={form.name} onChange={e => f("name", e.target.value)} />
            </div>
            <div><label style={S.label}>GST / Tax ID (Optional)</label>
              <input style={S.input} value={form.taxId} onChange={e => f("taxId", e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>
          <div style={S.g2}>
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
          <div style={S.g2}>
            <div><label style={S.label}>City</label>
              <input style={S.input} value={form.city} onChange={e => f("city", e.target.value)} />
            </div>
            <div><label style={S.label}>State</label>
              <input style={S.input} value={form.state} onChange={e => f("state", e.target.value)} />
            </div>
          </div>
          <div style={S.g2}>
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
          <p style={{ fontSize: 13, color: "#505070", marginBottom: 20 }}>
            Select which modules are active for <strong style={{ color: "#EEEEF5" }}>{activeOrg?.name}</strong>. Changes affect all team members.
          </p>
          {CATEGORIES.map(cat => {
            const mods = ALL_MODULES.filter(m => m.category === cat.key);
            return (
              <div key={cat.key} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#404060", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{cat.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                  {mods.map(m => {
                    const on = enabledModules.includes(m.key);
                    return (
                      <label key={m.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: on ? "#6366f115" : "#131327", borderRadius: 8, border: `1px solid ${on ? "#6366f1" : "#1C1C35"}`, cursor: "pointer" }}>
                        <input type="checkbox" checked={on} onChange={() => toggleModule(m.key)} style={{ accentColor: "#6366f1" }} />
                        <div>
                          <div style={{ fontSize: 13, color: on ? "#EEEEF5" : "#CCCCEE", fontWeight: on ? 600 : 400 }}>{m.label}</div>
                          <div style={{ fontSize: 10, color: "#505070", marginTop: 1 }}>{m.description.slice(0, 50)}…</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button onClick={saveModules} style={S.btn} disabled={saving}>
              {saved ? "Saved! Reloading..." : saving ? "Saving..." : "Save Module Selection"}
            </button>
            <span style={{ fontSize: 12, color: "#505070" }}>{enabledModules.length} module{enabledModules.length !== 1 ? "s" : ""} selected</span>
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
            <div style={{ textAlign: "center", color: "#505070", padding: 32 }}>No team members yet.</div>
          ) : members.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #131327" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#EEEEF5" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#505070" }}>{m.email}</div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "#6366f120", color: "#818cf8", fontWeight: 600 }}>{m.role}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {showInvite && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div style={S.modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "#EEEEF5", margin: 0, fontSize: 16, fontWeight: 700 }}>Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} style={{ background: "none", border: "none", color: "#505070", cursor: "pointer" }}><X size={18} /></button>
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
                  <button onClick={() => setShowInvite(false)} style={{ ...S.btn, background: "#1C1C35", color: "#CCCCEE" }}>Cancel</button>
                  <button onClick={sendInvite} style={S.btn} disabled={inviting || !inviteEmail}>
                    {inviting ? "Sending..." : "Send Invite"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
