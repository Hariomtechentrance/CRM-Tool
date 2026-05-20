import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ALL_MODULES } from "@/lib/modules";
import { Users, Shield, Check, X, Clock, CheckCircle, XCircle, Mail, UserPlus } from "lucide-react";

const S = {
  page: { padding: "28px 32px", background: "#07071A", minHeight: "100vh" } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 } as React.CSSProperties,
  sub: { fontSize: 13, color: "#505070", marginTop: 4, marginBottom: 28 } as React.CSSProperties,
  card: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: 20, marginBottom: 20 } as React.CSSProperties,
  cardTitle: { fontSize: 14, fontWeight: 700, color: "#EEEEF5", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  input: { background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
  select: { background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", colorScheme: "dark" as const },
};

const ROLE_COLORS: Record<string, string> = { OWNER: "#ef4444", ADMIN: "#f59e0b", MANAGER: "#6366f1", STAFF: "#818cf8", ACCOUNTANT: "#10b981", VIEWER: "#505070" };

interface MemberAccess {
  id: string; role: string; joinedAt: string;
  user: { id: string; name: string; email: string; lastLoginAt?: string; isActive: boolean; moduleAccess: Array<{ moduleKey: string }> };
}
interface AccessReq {
  id: string; moduleKey: string; status: string; message?: string; requestedAt: string;
  user: { id: string; name: string; email: string };
}

export default function AdminTeamPage() {
  const { activeOrg } = useAuthStore();
  const [members, setMembers] = useState<MemberAccess[]>([]);
  const [requests, setRequests] = useState<AccessReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "access" | "invite">("members");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [mRes, rRes] = await Promise.allSettled([
      api.get("/access/team"),
      api.get("/access/requests?status=PENDING"),
    ]);
    if (mRes.status === "fulfilled") setMembers(mRes.value.data.data.members || []);
    if (rRes.status === "fulfilled") setRequests(rRes.value.data.data.requests || []);
    setLoading(false);
  }, [activeOrg?.id]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, action: "APPROVE" | "DENY") => {
    setResolving(id);
    try { await api.patch(`/access/requests/${id}`, { action }); load(); } catch { /* ignore */ }
    setResolving(null);
  };

  const toggleAccess = async (userId: string, moduleKey: string, hasAccess: boolean) => {
    try {
      if (hasAccess) await api.post("/access/revoke", { userId, moduleKey });
      else await api.post("/access/grant", { userId, moduleKeys: [moduleKey] });
      load();
    } catch { /* ignore */ }
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true); setInviteMsg("");
    try {
      await api.post("/organizations/current/members/invite", { email: inviteEmail, role: inviteRole });
      setInviteMsg(`✓ Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (e: any) {
      setInviteMsg("✗ " + (e?.response?.data?.message || "Failed to send invite"));
    }
    setInviting(false);
  };

  const tabBtn = (t: typeof activeTab, label: string, badge?: number) => (
    <button key={t} onClick={() => setActiveTab(t)} style={{
      padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
      background: activeTab === t ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#0D0D1F",
      color: activeTab === t ? "white" : "#505070", fontWeight: 600, fontSize: 13, position: "relative" as const,
    }}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{badge}</span>
      )}
    </button>
  );

  return (
    <div className="page-pad">
      <h1 style={S.title}>Team & Access</h1>
      <p style={S.sub}>Manage team members, module access, and pending requests</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabBtn("members", `Members (${members.length})`)}
        {tabBtn("access", "Access Requests", requests.length)}
        {tabBtn("invite", "Invite Member")}
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#505070" }}>Loading...</div> : (
        <>
          {/* MEMBERS + MODULE MATRIX */}
          {activeTab === "members" && (
            <div style={S.card}>
              <div style={S.cardTitle}><Users size={15} color="#6366f1" /> Team Members & Module Access Matrix</div>
              <p style={{ fontSize: 12, color: "#505070", marginBottom: 16 }}>Click any module cell to grant/revoke access. OWNER/ADMIN always have full access.</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "#404060", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #1C1C35", minWidth: 200, position: "sticky", left: 0, background: "#0D0D1F", zIndex: 1 }}>Member</th>
                      <th style={{ textAlign: "center", padding: "8px 10px", color: "#404060", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #1C1C35", minWidth: 80 }}>Role</th>
                      <th style={{ textAlign: "center", padding: "8px 10px", color: "#404060", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #1C1C35", minWidth: 100 }}>Last Login</th>
                      {ALL_MODULES.map((mod) => (
                        <th key={mod.key} style={{ textAlign: "center", padding: "6px 4px", color: "#404060", fontWeight: 700, fontSize: 10, borderBottom: "1px solid #1C1C35", minWidth: 70, writingMode: "vertical-rl" as const, transform: "rotate(180deg)", height: 90, verticalAlign: "bottom" }}>
                          {mod.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const isAdmin = ["OWNER", "ADMIN"].includes(m.role);
                      const grantedKeys = new Set(m.user.moduleAccess.map((a) => a.moduleKey));
                      const rc = ROLE_COLORS[m.role] || "#505070";
                      return (
                        <tr key={m.id} style={{ borderBottom: "1px solid #131327" }}>
                          <td style={{ padding: "10px 12px", position: "sticky", left: 0, background: "#0D0D1F", zIndex: 1 }}>
                            <div style={{ fontWeight: 600, color: "#EEEEF5" }}>{m.user.name}</div>
                            <div style={{ fontSize: 10, color: "#505070" }}>{m.user.email}</div>
                          </td>
                          <td style={{ textAlign: "center", padding: "10px 8px" }}>
                            <span style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, background: rc + "20", color: rc, fontWeight: 700 }}>{m.role}</span>
                          </td>
                          <td style={{ textAlign: "center", padding: "10px 8px", fontSize: 11, color: "#505070" }}>
                            {m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleDateString("en-IN") : "Never"}
                          </td>
                          {ALL_MODULES.map((mod) => {
                            const has = isAdmin || grantedKeys.has(mod.key);
                            return (
                              <td key={mod.key} style={{ textAlign: "center", padding: "6px 4px" }}>
                                <button
                                  onClick={() => !isAdmin && toggleAccess(m.user.id, mod.key, grantedKeys.has(mod.key))}
                                  title={isAdmin ? "Admin — full access" : has ? "Click to revoke" : "Click to grant"}
                                  style={{
                                    width: 26, height: 26, borderRadius: 6, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center",
                                    background: has ? (isAdmin ? "#6366f130" : "#10b98130") : "#131327",
                                    border: `1px solid ${has ? (isAdmin ? "#6366f160" : "#10b98160") : "#1C1C35"}`,
                                    cursor: isAdmin ? "default" : "pointer",
                                  }}>
                                  {has ? <Check size={12} color={isAdmin ? "#818cf8" : "#10b981"} /> : <X size={10} color="#505070" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ACCESS REQUESTS */}
          {activeTab === "access" && (
            <div style={S.card}>
              <div style={S.cardTitle}><Shield size={15} color="#f59e0b" /> Pending Module Access Requests</div>
              {requests.length === 0 ? (
                <div style={{ color: "#505070", textAlign: "center", padding: 40 }}>
                  <CheckCircle size={36} color="#10b981" style={{ margin: "0 auto 12px", display: "block" }} />
                  All caught up — no pending requests.
                </div>
              ) : requests.map((r) => {
                const mod = ALL_MODULES.find((m) => m.key === r.moduleKey);
                return (
                  <div key={r.id} style={{ display: "flex", gap: 14, padding: "16px 0", borderBottom: "1px solid #131327", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#EEEEF5" }}>{r.user.name}</span>
                        <span style={{ fontSize: 11, color: "#505070" }}>{r.user.email}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: "#6366f120", color: "#818cf8", fontWeight: 600 }}>
                          {mod?.label || r.moduleKey}
                        </span>
                        {r.message && <span style={{ fontSize: 12, color: "#505070", fontStyle: "italic" }}>"{r.message}"</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#505070", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={10} />
                        {new Date(r.requestedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => resolve(r.id, "APPROVE")} disabled={resolving === r.id}
                        style={{ background: "#10b98120", color: "#10b981", border: "1px solid #10b98140", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                        <Check size={13} /> Approve
                      </button>
                      <button onClick={() => resolve(r.id, "DENY")} disabled={resolving === r.id}
                        style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                        <XCircle size={13} /> Deny
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* INVITE */}
          {activeTab === "invite" && (
            <div style={{ ...S.card, maxWidth: 520 }}>
              <div style={S.cardTitle}><UserPlus size={15} color="#6366f1" /> Invite a Team Member</div>
              <p style={{ fontSize: 13, color: "#505070", marginBottom: 20 }}>An invite email will be sent. The member can register or log in to join your organisation.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#505070", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Email Address</label>
                  <div style={{ position: "relative" }}>
                    <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#505070" }} />
                    <input style={{ ...S.input, paddingLeft: 36 }} type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#505070", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Role</label>
                  <select style={{ ...S.select, width: "100%" }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="STAFF">Staff</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="VIEWER">Viewer (read-only)</option>
                  </select>
                </div>
                {inviteMsg && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: inviteMsg.startsWith("✓") ? "#10b98120" : "#ef444420", color: inviteMsg.startsWith("✓") ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 500 }}>
                    {inviteMsg}
                  </div>
                )}
                <button onClick={sendInvite} style={S.btn} disabled={inviting || !inviteEmail}>
                  <Mail size={14} /> {inviting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
