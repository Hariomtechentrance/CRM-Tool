import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuthStore } from "@/stores/authStore";

export default function AppLayout() {
  const { isAuthenticated, organizations, activeOrg, loadModuleAccess } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && activeOrg) {
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
    <div className="flex h-screen overflow-hidden" style={{ background: "#07071A" }}>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "sidebar-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(p => !p)} />
        <main className="flex-1 overflow-y-auto" style={{ background: "#07071A", padding: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
