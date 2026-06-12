import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Search, UserCheck, UserX, Shield, Users, Package } from "lucide-react";

const S = {
  page:        { padding: "24px 28px", background: "var(--bg-main)", minHeight: "100vh" } as React.CSSProperties,
  title:       { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle:    { fontSize: 13, color: "var(--text-ghost)", marginTop: 2, marginBottom: 24 } as React.CSSProperties,
  card:        { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" } as React.CSSProperties,
  toolbar:     { display: "flex", gap: 10, padding: "14px 16px", alignItems: "center", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  searchWrap:  { position: "relative" as const, flex: 1, maxWidth: 340 },
  searchInput: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px 8px 34px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  searchIcon:  { position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" },
  table:       { width: "100%", borderCollapse: "collapse" as const },
  th:          { textAlign: "left" as const, padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)" },
  td:          { padding: "12px 14px", fontSize: 13, color: "var(--text-sec)", borderBottom: "1px solid var(--bg-hover)", verticalAlign: "top" as const },
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  OWNER:      { bg: "#f59e0b20", color: "#f59e0b" },
  ADMIN:      { bg: "#6366f120", color: "#818cf8" },
  MANAGER:    { bg: "#10b98120", color: "#34d399" },
  STAFF:      { bg: "#6b728020", color: "#9ca3af" },
  ACCOUNTANT: { bg: "#ec489920", color: "#f472b6" },
  VIEWER:     { bg: "#44444420", color: "#6b7280" },
};

const MODULE_LABEL: Record<string, string> = {
  CRM: "CRM", INVENTORY: "Inventory", PURCHASE: "Purchase", STORE: "Store",
  DISPATCH: "Dispatch", ACCOUNTS: "Accounts", POS: "POS", WAREHOUSE: "Warehouse",
  HR: "HR", PROJECTS: "Projects", MARKETING: "Marketing", SUPPORT: "Support",
  ECOMMERCE: "E-com", REPORTS: "Reports", IMPORT_EXPORT_SUITE: "Import/Export",
  RETAIL_FASHION: "Retail", TELECALLING: "Telecalling", SERVICES: "Services",
  STOCK_MARKET: "StockMkt", HEALTH: "Health",
};

interface OrgInfo {
  id: string; name: string; slug: string;
  enabledModules: string[];
  _count: { members: number };
}

interface Membership {
  role: string;
  isActive: boolean;
  joinedAt: string;
  organization: OrgInfo;
}

interface UserItem {
  id: string; name: string; email: string; isActive: boolean; isSuperAdmin: boolean;
  lastLoginAt?: string; createdAt: string;
  memberships: Membership[];
}

export default function SuperAdminUsersPage() {
  const [users,   setUsers]   = useState<UserItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/super-admin/users?search=${encodeURIComponent(search)}&limit=100`);
      setUsers(r.data.data.users);
      setTotal(r.data.data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string) => {
    try { await api.patch(`/super-admin/users/${id}/toggle-active`); load(); } catch { /* ignore */ }
  };

  const toggleSuperAdmin = async (id: string, current: boolean) => {
    if (!window.confirm(`${current ? "Remove" : "Grant"} super admin access for this user?`)) return;
    try { await api.patch(`/super-admin/users/${id}/super-admin`, { isSuperAdmin: !current }); load(); } catch { /* ignore */ }
  };

  return (
    <div style={S.page}>
      <h1 style={S.title}>All Users</h1>
      <p style={S.subtitle}>Every registered user across the platform — their organization, role, and module access ({total} total)</p>

      <div style={S.card}>
        <div style={S.toolbar}>
          <div style={S.searchWrap}>
            <Search size={14} style={S.searchIcon} />
            <input style={S.searchInput} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-ghost)", marginLeft: "auto" }}>{total} users</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-ghost)" }}>Loading users…</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["User", "Organization & Role", "Modules", "Team Size", "Last Login", "Joined", "Status", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "var(--text-ghost)", padding: 40 }}>No users found.</td></tr>
              ) : users.map(u => {
                const primaryMembership = u.memberships[0];
                const org = primaryMembership?.organization;
                const rs = primaryMembership ? (ROLE_COLORS[primaryMembership.role] || { bg: "#6b728020", color: "#9ca3af" }) : null;

                return (
                  <tr key={u.id}>
                    {/* User */}
                    <td style={S.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: u.isSuperAdmin ? "#ef444420" : "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: u.isSuperAdmin ? "#ef4444" : "#818cf8", fontWeight: 700, fontSize: 13, flexShrink: 0, border: u.isSuperAdmin ? "1px solid #ef444440" : "none" }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                            {u.name}
                            {u.isSuperAdmin && <Shield size={11} color="#ef4444" aria-label="Super Admin" />}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Organization & Role */}
                    <td style={S.td}>
                      {u.memberships.length === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>No organization</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {u.memberships.map(m => {
                            const mRs = ROLE_COLORS[m.role] || { bg: "#6b728020", color: "#9ca3af" };
                            return (
                              <div key={m.organization.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{m.organization.name}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: mRs.bg, color: mRs.color }}>{m.role}</span>
                                  {!m.isActive && <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 600 }}>INACTIVE</span>}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-ghost)" }}>{m.organization.slug}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Modules (from primary org) */}
                    <td style={S.td}>
                      {!org ? (
                        <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>—</span>
                      ) : (org.enabledModules || []).length === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>None enabled</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 160 }}>
                            {(org.enabledModules || []).slice(0, 4).map(m => (
                              <span key={m} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#6366f118", color: "#818cf8", fontWeight: 600 }}>
                                {MODULE_LABEL[m] || m}
                              </span>
                            ))}
                            {(org.enabledModules || []).length > 4 && (
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "var(--bg-hover)", color: "var(--text-ghost)", fontWeight: 600 }}>
                                +{(org.enabledModules || []).length - 4}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-ghost)", display: "flex", alignItems: "center", gap: 3 }}>
                            <Package size={9} />
                            {(org.enabledModules || []).length} / 20 modules
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Team Size */}
                    <td style={{ ...S.td, verticalAlign: "middle" as const }}>
                      {!org ? (
                        <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>—</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Users size={12} color="#34d399" />
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{org._count.members}</span>
                          </div>
                          <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>
                            {org._count.members === 1 ? "only owner" : `incl. ${org._count.members - 1} invited`}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Last Login */}
                    <td style={{ ...S.td, fontSize: 11, color: "var(--text-ghost)", verticalAlign: "middle" as const }}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "Never"}
                    </td>

                    {/* Joined */}
                    <td style={{ ...S.td, fontSize: 11, color: "var(--text-ghost)", verticalAlign: "middle" as const }}>
                      {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </td>

                    {/* Status */}
                    <td style={{ ...S.td, verticalAlign: "middle" as const }}>
                      <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: u.isActive ? "#10b98120" : "#ef444420", color: u.isActive ? "#10b981" : "#ef4444" }}>
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...S.td, verticalAlign: "middle" as const }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => toggleActive(u.id)} title={u.isActive ? "Disable user" : "Enable user"} style={{ background: u.isActive ? "#ef444420" : "#10b98120", color: u.isActive ? "#ef4444" : "#10b981", border: "none", borderRadius: 6, padding: "5px 9px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                          {u.isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                          {u.isActive ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => toggleSuperAdmin(u.id, u.isSuperAdmin)} title={u.isSuperAdmin ? "Remove super admin" : "Make super admin"} style={{ background: u.isSuperAdmin ? "#ef444420" : "#ef444410", color: "#ef4444", border: u.isSuperAdmin ? "1px solid #ef444450" : "1px solid #ef444430", borderRadius: 6, padding: "5px 9px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                          <Shield size={11} /> {u.isSuperAdmin ? "Revoke SA" : "Make SA"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
