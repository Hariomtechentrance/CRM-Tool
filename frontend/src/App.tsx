import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import AccessGate from "@/components/AccessGate";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import CreateOrgPage from "@/pages/auth/CreateOrgPage";
import AcceptInvitePage from "@/pages/auth/AcceptInvitePage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import CrmPage from "@/pages/crm/CrmPage";
import PartyDetailPage from "@/pages/crm/PartyDetailPage";
import InventoryPage from "@/pages/inventory/InventoryPage";
import PurchasePage from "@/pages/purchase/PurchasePage";
import SalesPage from "@/pages/sales/SalesPage";
import FinancePage from "@/pages/finance/FinancePage";
import HRPage from "@/pages/hr/HRPage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import LeadsPage from "@/pages/leads/LeadsPage";
import SupportPage from "@/pages/support/SupportPage";
import TradePage from "@/pages/trade/TradePage";
import RetailPage from "@/pages/retail/RetailPage";
import WarehousePage from "@/pages/warehouse/WarehousePage";
import StorePage from "@/pages/store/StorePage";
import ReportsPage from "@/pages/reports/ReportsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTeamPage from "@/pages/admin/AdminTeamPage";
import AdminModulesPage from "@/pages/admin/AdminModulesPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminLogsPage from "@/pages/admin/AdminLogsPage";
import SuperAdminLayout from "@/pages/superAdmin/SuperAdminLayout";
import SuperAdminDashboard from "@/pages/superAdmin/SuperAdminDashboard";
import SuperAdminOrgsPage from "@/pages/superAdmin/SuperAdminOrgsPage";
import SuperAdminUsersPage from "@/pages/superAdmin/SuperAdminUsersPage";
import SuperAdminLoginPage from "@/pages/superAdmin/SuperAdminLoginPage";
import ComingSoonPage from "@/pages/ComingSoonPage";
import EmailPage from "@/pages/email/EmailPage";
import ActivitiesPage from "@/pages/activities/ActivitiesPage";
import DealsPage from "@/pages/deals/DealsPage";
import QuotationsPage from "@/pages/quotations/QuotationsPage";
import DocumentsPage from "@/pages/documents/DocumentsPage";

// Wrap a page with module-level access gate
const G = (moduleKey: string, Page: React.ComponentType) => (
  <AccessGate moduleKey={moduleKey}><Page /></AccessGate>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/register"       element={<RegisterPage />} />
        <Route path="/create-org"     element={<CreateOrgPage />} />
        <Route path="/accept-invite"   element={<AcceptInvitePage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* ── Org Admin Panel (OWNER / ADMIN only) ── */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="team"      element={<AdminTeamPage />} />
          <Route path="modules"   element={<AdminModulesPage />} />
          <Route path="settings"  element={<AdminSettingsPage />} />
          <Route path="logs"      element={<AdminLogsPage />} />
        </Route>

        {/* ── Super Admin (platform owner only) ── */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="dashboard"     element={<SuperAdminDashboard />} />
          <Route path="organizations" element={<SuperAdminOrgsPage />} />
          <Route path="users"         element={<SuperAdminUsersPage />} />
        </Route>

        {/* ── Main App ── */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard"    element={<DashboardPage />} />

          {/* ── Core (gated by module key) ── */}
          <Route path="/crm"          element={G("CRM", CrmPage)} />
          <Route path="/crm/:id"      element={G("CRM", PartyDetailPage)} />
          <Route path="/inventory"    element={G("INVENTORY", InventoryPage)} />
          <Route path="/purchase"     element={G("PURCHASE", PurchasePage)} />
          <Route path="/store"        element={G("STORE", StorePage)} />
          <Route path="/dispatch"     element={G("DISPATCH", SalesPage)} />
          <Route path="/accounts"     element={G("ACCOUNTS", FinancePage)} />

          {/* ── Operations ── */}
          <Route path="/pos"          element={G("POS", RetailPage)} />
          <Route path="/warehouse"    element={G("WAREHOUSE", WarehousePage)} />
          <Route path="/hr"           element={G("HR", HRPage)} />
          <Route path="/projects"     element={G("PROJECTS", ProjectsPage)} />

          {/* ── Growth ── */}
          <Route path="/marketing"    element={G("MARKETING", LeadsPage)} />
          <Route path="/support"      element={G("SUPPORT", SupportPage)} />
          <Route path="/ecommerce"    element={<ComingSoonPage title="E-commerce" description="Connect Shopify, WooCommerce and sync online orders automatically." />} />
          <Route path="/reports"      element={G("REPORTS", ReportsPage)} />

          {/* ── Industry ── */}
          <Route path="/import-export" element={G("IMPORT_EXPORT_SUITE", TradePage)} />
          <Route path="/retail"        element={G("RETAIL_FASHION", RetailPage)} />

          {/* ── Sales ── */}
          <Route path="/deals"        element={<DealsPage />} />
          <Route path="/quotations"   element={<QuotationsPage />} />

          {/* ── Communication ── */}
          <Route path="/email"        element={<EmailPage />} />
          <Route path="/activities"   element={<ActivitiesPage />} />

          {/* ── Utility (no gate needed) ── */}
          <Route path="/documents"    element={<DocumentsPage />} />
          <Route path="/settings"     element={<SettingsPage />} />
        </Route>

        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
