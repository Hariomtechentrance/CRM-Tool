import { Outlet, Navigate, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import {
  LayoutDashboard, Users, Puzzle, Settings, ScrollText,
  LogOut, ChevronLeft, Shield,
} from "lucide-react";

const navLinks = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/team",      icon: Users,           label: "Team & Access" },
  { to: "/admin/modules",   icon: Puzzle,          label: "Modules" },
  { to: "/admin/settings",  icon: Settings,        label: "Org Settings" },
  { to: "/admin/logs",      icon: ScrollText,      label: "Audit Logs" },
];

export default function AdminLayout() {
  const { user, isAuthenticated, isOrgAdmin, activeOrg, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOrgAdmin) return <Navigate to="/dashboard" replace />;

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const initials = activeOrg?.name
    ? activeOrg.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "AD";

  return (
    <div style={{ display: "flex", height: "100vh", background: "#07071A", overflow: "hidden" }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div style={{ width: 240, background: "#050514", borderRight: "1px solid #1C1C35", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Brand / Org */}
        <div style={{ padding: "18px 16px 16px", borderBottom: "1px solid #1C1C35" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#EEEEF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {activeOrg?.name ?? "Organization"}
              </div>
              <div style={{ fontSize: 10, color: "#818cf8", fontWeight: 600 }}>Admin Panel</div>
            </div>
          </div>

          {/* Admin badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, background: "#6366f115", border: "1px solid #6366f130" }}>
            <Shield size={11} color="#818cf8" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {activeOrg?.role ?? "Admin"} Access
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                color: isActive ? "#EEEEF5" : "#505070",
                background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))" : "transparent",
                borderLeft: isActive ? "2px solid #6366f1" : "2px solid transparent",
                textDecoration: "none", fontSize: 13,
                fontWeight: isActive ? 600 : 400, transition: "all 0.15s",
              })}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid #1C1C35" }}>
          <NavLink to="/dashboard"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "#505070", textDecoration: "none", fontSize: 12, marginBottom: 4, transition: "all 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#CCCCEE")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#505070")}>
            <ChevronLeft size={14} /> Back to App
          </NavLink>

          <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, textAlign: "left" }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Outlet />
      </div>
    </div>
  );
}
