import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuthStore } from "@/stores/authStore";

export default function AppLayout() {
  const { isAuthenticated, organizations, activeOrg, loadModuleAccess } = useAuthStore();

  // Reload module access whenever active org changes
  useEffect(() => {
    if (isAuthenticated && activeOrg) {
      loadModuleAccess();
    }
  }, [isAuthenticated, activeOrg?.id]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (organizations.length === 0) return <Navigate to="/create-org" replace />;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#07071A" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: "#07071A" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
