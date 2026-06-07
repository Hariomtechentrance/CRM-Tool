import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ALL_MODULES } from "@/lib/modules";
import { Activity, Users, BarChart3, Shield, Check, X, Clock, CheckCircle, XCircle, DollarSign, ShoppingCart, TrendingUp, Headphones, Package, FileText } from "lucide-react";

const S = {
  page: { padding: "24px 28px", background: "var(--bg-main)", minHeight: "100vh" } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "var(--text-ghost)", marginTop: 2, marginBottom: 24 } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 0 } as React.CSSProperties,
  cardTitle: { fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  kpi: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 12 } as React.CSSProperties,
  tag: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600 } as React.CSSProperties,
};

const FEED_ICONS: Record<string, { icon: typeof DollarSign, color: string }> = {
  INVOICE: { icon: DollarSign, color: "#10b981" },
  ORDER: { icon: ShoppingCart, color: "#6366f1" },
  LEAD: { icon: TrendingUp, color: "#f59e0b" },
  TICKET: { icon: Headphones, color: "#ef4444" },
  PARTY: { icon: Users, color: "#818cf8" },
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#818cf8", PENDING: "#f59e0b", CONFIRMED: "#60a5fa", DISPATCHED: "#a78bfa",
  DELIVERED: "#10b981", CANCELLED: "#ef4444", OPEN: "#818cf8", RESOLVED: "#10b981",
  WON: "#10b981", LOST: "#ef4444", NEW: "#818cf8", ADDED: "#6366f1", APPROVED: "#10b981",
};

interface Stats { members: number; parties: number; invoices: number; orders: number; leads: number; tickets: number; products: number; tasks: number; }
interface FeedItem { type: string; id: string; title: string; subtitle: string; meta: string; createdAt: string; }
interface MemberAccess { id: string; role: string; joinedAt: string; user: { id: string; name: string; email: string; lastLoginAt?: string; isActive: boolean; moduleAccess: Array<{ moduleKey: string; grantedAt: string }> } }
interface AccessReq { id: string; moduleKey: string; status: string; message?: string; requestedAt: string; user: { id: string; name: string; email: string } }

type Tab = "activity" | "access" | "team";

export default function OrgAdminPage() {
  const { activeOrg, isOrgAdmin } = useAuthStore();
  const activeOrgId = activeOrg?.id;
  const [tab, setTab] = useState<Tab>("activity");
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [members, setMembers] = useState<MemberAccess[]>([]);
  const [requests, setRequests] = useState<AccessReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const calls: Promise<any>[] = [
        api.get("/org-admin/stats"),
        api.get("/org-admin/activity?limit=40"),
      ];
      if (isOrgAdmin) {
        calls.push(api.get("/access/team"));
        calls.push(api.get("/access/requests?status=PENDING"));
      }
      const results = await Promise.all(calls);
      setStats(results[0].data.data);
      setFeed(results[1].data.data.feed || []);
      if (isOrgAdmin) {
        setMembers(results[2].data.data.members || []);
        setRequests(results[3].data.data.requests || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [isOrgAdmin, activeOrgId]);

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

  const kpis = [
    { icon: Users, label: "Team", value: stats?.members ?? "—", color: "#6366f1" },
    { icon: FileText, label: "Parties", value: stats?.parties ?? "—", color: "#818cf8" },
    { icon: DollarSign, label: "Invoices", value: stats?.invoices ?? "—", color: "#10b981" },
    { icon: ShoppingCart, label: "Orders", value: stats?.orders ?? "—", color: "#f59e0b" },
    { icon: TrendingUp, label: "Leads", value: stats?.leads ?? "—", color: "#a78bfa" },
    { icon: Headphones, label: "Tickets", value: stats?.tickets ?? "—", color: "#ef4444" },
    { icon: Package, label: "Products", value: stats?.products ?? "—", color: "#60a5fa" },
  ];

  const tabBtn = (t: Tab, label: string, badge?: number) => (
    <button onClick={() => setTab(t)} style={{
      padding: "8px 18px", borderRadius: 8, border: "none", position: "relative" as const,
      background: tab === t ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--bg-card)",
      color: tab === t ? "white" : "var(--text-ghost)", cursor: "pointer", fontWeight: 600, fontSize: 13,
    }}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{badge}</span>
      )}
    </button>
  );

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <div style={S.page}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <BarChart3 size={20} color="#6366f1" />
        <h1 style={S.title}>Admin Panel — {activeOrg?.name}</h1>
        {isOrgAdmin && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "#6366f120", color: "#818cf8", fontWeight: 600 }}>ADMIN</span>}
      </div>
      <p style={S.subtitle}>Track all departments, manage team access and monitor business activity</p>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={S.kpi}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>{k.label}</span>
              <k.icon size={12} color={k.color} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabBtn("activity", "Activity Feed")}
        {isOrgAdmin && tabBtn("access", "Access Control", requests.length)}
        {isOrgAdmin && tabBtn("team", "Team & Modules")}
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "var(--text-ghost)" }}>Loading...</div> : (
        <>
          {/* ── ACTIVITY FEED ── */}
          {tab === "activity" && (
            <div style={S.card}>
              <div style={S.cardTitle}><Activity size={15} color="#6366f1" /> Recent Activity Across All Departments</div>
              {feed.length === 0 ? (
                <div style={{ color: "var(--text-ghost)", textAlign: "center", padding: 32 }}>No activity yet.</div>
              ) : feed.map((item, i) => {
                const cfg = FEED_ICONS[item.type] || { icon: FileText, color: "#818cf8" };
                const color = STATUS_COLORS[item.meta] || "#818cf8";
                return (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--bg-hover)", alignItems: "center" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: cfg.color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <cfg.icon size={13} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                      {item.subtitle && <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{item.subtitle}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                      <span style={{ ...S.tag, background: color + "20", color }}>{item.meta}</span>
                      <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ACCESS CONTROL ── */}
          {tab === "access" && isOrgAdmin && (
            <div style={S.card}>
              <div style={S.cardTitle}><Shield size={15} color="#f59e0b" /> Pending Access Requests</div>
              {requests.length === 0 ? (
                <div style={{ color: "var(--text-ghost)", textAlign: "center", padding: 32 }}>
                  <CheckCircle size={32} color="#10b981" style={{ margin: "0 auto 12px", display: "block" }} />
                  No pending requests. All access is up to date.
                </div>
              ) : requests.map(r => {
                const mod = ALL_MODULES.find(m => m.key === r.moduleKey);
                return (
                  <div key={r.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--bg-hover)", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.user.name}</div>
                        <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>{r.user.email}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "#6366f120", color: "#818cf8", fontWeight: 600 }}>
                          {mod?.label || r.moduleKey}
                        </span>
                        {r.message && <span style={{ fontSize: 12, color: "var(--text-ghost)", fontStyle: "italic" }}>"{r.message}"</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-ghost)", marginTop: 4 }}>
                        <Clock size={10} style={{ display: "inline", marginRight: 4 }} />
                        {new Date(r.requestedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => resolve(r.id, "APPROVE")}
                        disabled={resolving === r.id}
                        style={{ background: "#10b98120", color: "#10b981", border: "1px solid #10b98140", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => resolve(r.id, "DENY")}
                        disabled={resolving === r.id}
                        style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                        <XCircle size={13} /> Deny
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TEAM & MODULE ACCESS MATRIX ── */}
          {tab === "team" && isOrgAdmin && (
            <div style={S.card}>
              <div style={S.cardTitle}><Users size={15} color="#6366f1" /> Team Module Access</div>
              <p style={{ fontSize: 12, color: "var(--text-ghost)", marginBottom: 16 }}>Click any module cell to grant or revoke access for a team member. OWNER/ADMIN always have full access.</p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-ghost)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)", minWidth: 180, position: "sticky", left: 0, background: "var(--bg-card)", zIndex: 1 }}>Member</th>
                      <th style={{ textAlign: "center", padding: "8px 8px", color: "var(--text-ghost)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)", minWidth: 50 }}>Role</th>
                      {ALL_MODULES.map(mod => (
                        <th key={mod.key} style={{ textAlign: "center", padding: "6px 4px", color: "var(--text-ghost)", fontWeight: 700, fontSize: 10, borderBottom: "1px solid var(--border)", minWidth: 72, writingMode: "vertical-rl" as const, transform: "rotate(180deg)", height: 90, verticalAlign: "bottom" }}>
                          {mod.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => {
                      const isAdmin = ["OWNER", "ADMIN"].includes(m.role);
                      const grantedKeys = new Set(m.user.moduleAccess.map(a => a.moduleKey));
                      return (
                        <tr key={m.id} style={{ borderBottom: "1px solid var(--bg-hover)" }}>
                          <td style={{ padding: "10px 12px", position: "sticky", left: 0, background: "var(--bg-card)", zIndex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.user.name}</div>
                            <div style={{ fontSize: 10, color: "var(--text-ghost)" }}>{m.user.email}</div>
                          </td>
                          <td style={{ textAlign: "center", padding: "10px 8px" }}>
                            <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 4, background: isAdmin ? "#6366f120" : "var(--border)", color: isAdmin ? "#818cf8" : "var(--text-ghost)", fontWeight: 700 }}>{m.role}</span>
                          </td>
                          {ALL_MODULES.map(mod => {
                            const has = isAdmin || grantedKeys.has(mod.key);
                            return (
                              <td key={mod.key} style={{ textAlign: "center", padding: "6px 4px" }}>
                                <button
                                  onClick={() => !isAdmin && toggleAccess(m.user.id, mod.key, grantedKeys.has(mod.key))}
                                  title={isAdmin ? "Admin has full access" : has ? "Click to revoke" : "Click to grant"}
                                  style={{
                                    width: 26, height: 26, borderRadius: 6,
                                    background: has ? (isAdmin ? "#6366f130" : "#10b98130") : "var(--bg-hover)",
                                    border: `1px solid ${has ? (isAdmin ? "#6366f160" : "#10b98160") : "var(--border)"}`,
                                    cursor: isAdmin ? "default" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>
                                  {has ? <Check size={12} color={isAdmin ? "#818cf8" : "#10b981"} /> : <X size={10} color="var(--text-ghost)" />}
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
        </>
      )}
    </div>
  );
}
