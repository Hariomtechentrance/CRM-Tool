import { Bell, LogOut, User, ChevronDown, AlertCircle, AlertTriangle, Info, X, Menu } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { getInitials } from "@/lib/utils";

interface Alert {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  subtitle: string;
  link: string;
  createdAt: string | null;
}

const SEV_ICON = {
  critical: <AlertCircle size={14} color="#ef4444" />,
  warning: <AlertTriangle size={14} color="#f59e0b" />,
  info: <Info size={14} color="#6366f1" />,
};
const SEV_DOT = { critical: "#ef4444", warning: "#f59e0b", info: "#6366f1" };

interface HeaderProps { onMenuToggle?: () => void; }

export default function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout, activeOrg } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertLoading, setAlertLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadAlerts = async () => {
    if (!activeOrg) return;
    setAlertLoading(true);
    try {
      const r = await api.get("/org-admin/alerts");
      setAlerts(r.data.data?.alerts || []);
    } catch { setAlerts([]); }
    setAlertLoading(false);
  };

  // Load alerts on mount + when org changes
  useEffect(() => { loadAlerts(); }, [activeOrg?.id]);

  // Reload when bell opens
  const toggleBell = () => {
    if (!bellOpen) loadAlerts();
    setBellOpen(p => !p);
    setMenuOpen(false);
  };

  // Close bell on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const totalCount = alerts.length;

  return (
    <header style={{ background: "#0D0D1F", borderBottom: "1px solid #1C1C35" }}
      className="h-14 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2.5">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="mobile-menu-btn w-9 h-9 rounded-lg items-center justify-center text-[#7070A0] hover:text-[#EEEEF5] hover:bg-[#131327] transition-colors cursor-pointer"
          style={{ display: "none" }}
        >
          <Menu style={{ width: 20, height: 20 }} />
        </button>
        <span className="text-[#7070A0] text-sm font-medium truncate max-w-[200px]">{activeOrg?.name}</span>
        {activeOrg && (
          <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            {activeOrg.currency}
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Bell */}
        <div ref={bellRef} style={{ position: "relative" }}>
          <button
            onClick={toggleBell}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#505070] hover:text-[#EEEEF5] hover:bg-[#131327] transition-colors relative cursor-pointer"
          >
            <Bell style={{ width: 18, height: 18 }} />
            {totalCount > 0 && (
              <span style={{
                position: "absolute", top: 5, right: 5,
                width: criticalCount > 0 ? "auto" : 8, minWidth: 8, height: 8,
                background: criticalCount > 0 ? "#ef4444" : "#6366f1",
                borderRadius: 99, border: "1px solid #0D0D1F",
                fontSize: 9, fontWeight: 700, color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: criticalCount > 0 ? "0 3px" : 0, lineHeight: 1,
              }}>
                {criticalCount > 0 ? criticalCount : ""}
              </span>
            )}
          </button>

          {/* Bell Dropdown */}
          {bellOpen && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360,
              background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 14,
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)", zIndex: 100, overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #1C1C35", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#EEEEF5" }}>Alerts</span>
                  {totalCount > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: "#6366f120", color: "#818CF8", padding: "1px 7px", borderRadius: 99 }}>
                      {totalCount}
                    </span>
                  )}
                </div>
                <button onClick={() => setBellOpen(false)} style={{ background: "none", border: "none", color: "#505070", cursor: "pointer", padding: 4 }}>
                  <X size={15} />
                </button>
              </div>

              {/* Alert List */}
              <div style={{ maxHeight: 380, overflowY: "auto" }}>
                {alertLoading ? (
                  <div style={{ padding: "32px 16px", textAlign: "center", color: "#505070", fontSize: 13 }}>Loading...</div>
                ) : alerts.length === 0 ? (
                  <div style={{ padding: "40px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#CCCCEE", margin: 0 }}>All clear!</p>
                    <p style={{ fontSize: 12, color: "#505070", marginTop: 4 }}>No pending alerts or issues.</p>
                  </div>
                ) : (
                  alerts.map((a, i) => (
                    <div
                      key={a.id + i}
                      onClick={() => { navigate(a.link); setBellOpen(false); }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "12px 16px", cursor: "pointer",
                        borderBottom: i < alerts.length - 1 ? "1px solid #131327" : "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#131327")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ marginTop: 2, flexShrink: 0 }}>{SEV_ICON[a.severity]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#EEEEF5", fontWeight: 500, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#505070", marginTop: 2 }}>{a.subtitle}</div>
                      </div>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: SEV_DOT[a.severity], flexShrink: 0, marginTop: 5 }} />
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {alerts.length > 0 && (
                <div style={{ padding: "10px 16px", borderTop: "1px solid #1C1C35" }}>
                  <button
                    onClick={() => { navigate("/admin/dashboard"); setBellOpen(false); }}
                    style={{ width: "100%", background: "#131327", border: "1px solid #1C1C35", borderRadius: 8, padding: "7px 12px", color: "#818CF8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    View Admin Panel →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false); }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#131327] transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              {user ? getInitials(user.name) : "U"}
            </div>
            <span className="text-sm font-medium text-[#CCCCEE]">{user?.name?.split(" ")[0]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#505070]" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl shadow-2xl z-50 py-1 border"
                style={{ background: "#0D0D1F", borderColor: "#1C1C35", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid #1C1C35" }}>
                  <p className="text-sm font-semibold text-[#EEEEF5]">{user?.name}</p>
                  <p className="text-xs text-[#505070] truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={() => { navigate("/settings"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#9090B0] hover:text-[#EEEEF5] hover:bg-[#131327] transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  Settings
                </button>
                <div style={{ borderTop: "1px solid #1C1C35" }} className="mt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
