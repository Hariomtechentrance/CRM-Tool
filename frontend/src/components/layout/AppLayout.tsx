import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";

export default function AppLayout() {
  const { isAuthenticated, organizations, activeOrg, isOrgAdmin, syncModulesFromOrg, loadModuleAccess } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !activeOrg) return;
    api.get("/branding").then(res => {
      const color: string | undefined = res.data.data?.brandingColor;
      if (color && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
        document.documentElement.style.setProperty("--brand-color", color);
      }
    }).catch(() => {});
  }, [isAuthenticated, activeOrg?.id]);

  useEffect(() => {
    if (!isAuthenticated || !activeOrg) return;
    // Always sync moduleAccess from persisted org data first (instant, no API call)
    syncModulesFromOrg();
    // For STAFF/VIEWER: must fetch their individual access grants from DB
    // For OWNER/ADMIN: activeOrg.enabledModules is already the source of truth
    // (set by login response and by Admin Panel saves), so no API call needed
    if (!isOrgAdmin) {
      loadModuleAccess();
    }
  }, [isAuthenticated, activeOrg?.id]);

  // Close sidebar when route changes (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (organizations.length === 0) return <Navigate to="/create-org" replace />;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-main)" }}>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "sidebar-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(p => !p)} />
        <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg-main)", padding: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
