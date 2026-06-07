import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Search, UserCheck, UserX, Shield } from "lucide-react";

const S = {
  page: { padding: "24px 28px", background: "var(--bg-main)", minHeight: "100vh" } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "var(--text-ghost)", marginTop: 2, marginBottom: 24 } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 } as React.CSSProperties,
  toolbar: { display: "flex", gap: 10, marginBottom: 16, alignItems: "center" } as React.CSSProperties,
  searchWrap: { position: "relative" as const, flex: 1, maxWidth: 340 },
  searchInput: { width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px 8px 34px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  searchIcon: { position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, borderBottom: "1px solid var(--border)" },
  td: { padding: "12px 12px", fontSize: 13, color: "var(--text-sec)", borderBottom: "1px solid var(--bg-hover)" },
};

interface UserItem {
  id: string; name: string; email: string; isActive: boolean; isSuperAdmin: boolean;
  lastLoginAt?: string; createdAt: string;
  memberships: Array<{ role: string; organization: { id: string; name: string; slug: string } }>;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/super-admin/users?search=${search}&limit=100`);
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
      <p style={S.subtitle}>Manage all users across the platform ({total} total)</p>

      <div style={S.card}>
        <div style={S.toolbar}>
          <div style={S.searchWrap}>
            <Search size={14} style={S.searchIcon} />
            <input style={S.searchInput} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-ghost)" }}>{total} users</span>
        </div>

        {loading ? <div style={{ padding: 40, textAlign: "center", color: "var(--text-ghost)" }}>Loading...</div> : (
          <table style={S.table}>
            <thead><tr>{["User", "Organizations", "Last Login", "Joined", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: "var(--text-ghost)", padding: 32 }}>No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                          {u.name}
                          {u.isSuperAdmin && <Shield size={11} color="#ef4444" />}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={S.td}>
                    {u.memberships.length === 0 ? <span style={{ color: "var(--text-ghost)" }}>—</span> : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {u.memberships.map(m => (
                          <span key={m.organization.id} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#6366f120", color: "#818cf8" }}>{m.organization.name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ ...S.td, fontSize: 11, color: "var(--text-ghost)" }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "Never"}</td>
                  <td style={{ ...S.td, fontSize: 11, color: "var(--text-ghost)" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                  <td style={S.td}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: u.isActive ? "#10b98120" : "#ef444420", color: u.isActive ? "#10b981" : "#ef4444" }}>{u.isActive ? "Active" : "Disabled"}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => toggleActive(u.id)} title={u.isActive ? "Disable user" : "Enable user"} style={{ background: u.isActive ? "#ef444420" : "#10b98120", color: u.isActive ? "#ef4444" : "#10b981", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                        {u.isActive ? <UserX size={12} /> : <UserCheck size={12} />} {u.isActive ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => toggleSuperAdmin(u.id, u.isSuperAdmin)} title={u.isSuperAdmin ? "Remove super admin" : "Make super admin"} style={{ background: u.isSuperAdmin ? "#ef444420" : "#ef444410", color: "#ef4444", border: u.isSuperAdmin ? "1px solid #ef444450" : "1px solid #ef444430", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                        <Shield size={11} /> {u.isSuperAdmin ? "Revoke SA" : "Make SA"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
