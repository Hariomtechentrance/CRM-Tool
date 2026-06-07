import { Outlet, Navigate, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LayoutDashboard, Building2, Users, LogOut, Shield, ChevronRight } from "lucide-react";

const navLinks = [
  { to: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/super-admin/organizations", icon: Building2, label: "Organizations" },
  { to: "/super-admin/users", icon: Users, label: "All Users" },
];

export default function SuperAdminLayout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />;
  if (!user?.isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const handleLogout = async () => { await logout(); navigate("/super-admin/login"); };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-main)", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: "#050514", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Super Admin</div>
              <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>Platform Control</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                color: isActive ? "var(--text-primary)" : "var(--text-ghost)", background: isActive ? "var(--border)" : "transparent",
                textDecoration: "none", fontSize: 13, fontWeight: isActive ? 600 : 400, transition: "all 0.15s",
              })}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          <NavLink to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, color: "var(--text-ghost)", textDecoration: "none", fontSize: 12, marginBottom: 4 }}>
            <ChevronRight size={14} /> Back to App
          </NavLink>
          <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, textAlign: "left" }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Outlet />
      </div>
    </div>
  );
}
