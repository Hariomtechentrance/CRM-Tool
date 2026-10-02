import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import AccessGate from "@/components/AccessGate";
import RoleGate from "@/components/RoleGate";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ShortcutsProvider } from "@/contexts/ShortcutsContext";

// Route-level code splitting — each page only loads when its route is
// actually visited, instead of every industry module shipping in one bundle
// for every visitor (including someone just trying to reach the login page).
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const CreateOrgPage = lazy(() => import("@/pages/auth/CreateOrgPage"));
const AcceptInvitePage = lazy(() => import("@/pages/auth/AcceptInvitePage"));
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmailPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const CrmPage = lazy(() => import("@/pages/crm/CrmPage"));
const PartyDetailPage = lazy(() => import("@/pages/crm/PartyDetailPage"));
const DuplicatesPage = lazy(() => import("@/pages/crm/DuplicatesPage"));
const InventoryPage = lazy(() => import("@/pages/inventory/InventoryPage"));
const PurchasePage = lazy(() => import("@/pages/purchase/PurchasePage"));
const SalesPage = lazy(() => import("@/pages/sales/SalesPage"));
const FinancePage = lazy(() => import("@/pages/finance/FinancePage"));
const HRPage = lazy(() => import("@/pages/hr/HRPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const LeadsPage = lazy(() => import("@/pages/leads/LeadsPage"));
const AppointmentsPage = lazy(() => import("@/pages/leads/AppointmentsPage"));
const AutomationPage = lazy(() => import("@/pages/leads/AutomationPage"));
const LeadFormsPage = lazy(() => import("@/pages/leads/LeadFormsPage"));
const WhatsAppPage = lazy(() => import("@/pages/whatsapp/WhatsAppPage"));
const LeadCaptureFormPage = lazy(() => import("@/pages/public/LeadCaptureFormPage"));
const SupportPage = lazy(() => import("@/pages/support/SupportPage"));
const TradePage = lazy(() => import("@/pages/trade/TradePage"));
const RetailPage = lazy(() => import("@/pages/retail/RetailPage"));
const WarehousePage = lazy(() => import("@/pages/warehouse/WarehousePage"));
const StorePage = lazy(() => import("@/pages/store/StorePage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const GSTReportsPage = lazy(() => import("@/pages/gst/GSTReportsPage"));
const EInvoicePage = lazy(() => import("@/pages/gst/EInvoicePage"));
const EWayBillPage = lazy(() => import("@/pages/gst/EWayBillPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminTeamPage = lazy(() => import("@/pages/admin/AdminTeamPage"));
const AdminAccessPage = lazy(() => import("@/pages/admin/AdminAccessPage"));
const DirectoryPage = lazy(() => import("@/pages/directory/DirectoryPage"));
const AdminModulesPage = lazy(() => import("@/pages/admin/AdminModulesPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminLogsPage = lazy(() => import("@/pages/admin/AdminLogsPage"));
const SuperAdminLayout = lazy(() => import("@/pages/superAdmin/SuperAdminLayout"));
const SuperAdminDashboard = lazy(() => import("@/pages/superAdmin/SuperAdminDashboard"));
const SuperAdminOrgsPage = lazy(() => import("@/pages/superAdmin/SuperAdminOrgsPage"));
const SuperAdminUsersPage = lazy(() => import("@/pages/superAdmin/SuperAdminUsersPage"));
const SuperAdminModuleRequestsPage = lazy(() => import("@/pages/superAdmin/SuperAdminModuleRequestsPage"));
const AccessRequestsPage = lazy(() => import("@/pages/superAdmin/AccessRequestsPage"));
const SuperAdminLoginPage = lazy(() => import("@/pages/superAdmin/SuperAdminLoginPage"));
const ComingSoonPage = lazy(() => import("@/pages/ComingSoonPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const EmailPage = lazy(() => import("@/pages/email/EmailPage"));
const ActivitiesPage = lazy(() => import("@/pages/activities/ActivitiesPage"));
const DealsPage = lazy(() => import("@/pages/deals/DealsPage"));
const QuotationsPage = lazy(() => import("@/pages/quotations/QuotationsPage"));
const RecurringInvoicesPage = lazy(() => import("@/pages/recurring/RecurringInvoicesPage"));
const DocumentsPage = lazy(() => import("@/pages/documents/DocumentsPage"));
const AuditPage = lazy(() => import("@/pages/audit/AuditPage"));
const ApprovalQueuePage = lazy(() => import("@/pages/admin/ApprovalQueuePage"));
const BatchTrackingPage = lazy(() => import("@/pages/inventory/BatchTrackingPage"));
const BOMPage = lazy(() => import("@/pages/inventory/BOMPage"));
const TDSPage = lazy(() => import("@/pages/finance/TDSPage"));
const BudgetPage = lazy(() => import("@/pages/finance/BudgetPage"));
const ReconciliationPage = lazy(() => import("@/pages/finance/ReconciliationPage"));
const WebhooksPage = lazy(() => import("@/pages/settings/WebhooksPage"));
const SecurityPage = lazy(() => import("@/pages/settings/SecurityPage"));
const ITProjectsPage = lazy(() => import("@/pages/projects/ITProjectsPage"));
const SprintBoardPage = lazy(() => import("@/pages/projects/SprintBoardPage"));
const TeamDashboardPage = lazy(() => import("@/pages/hr/TeamDashboardPage"));
const MyWorkPage = lazy(() => import("@/pages/projects/MyWorkPage"));
const PMDashboard = lazy(() => import("@/pages/projects/PMDashboard"));
const TeamPage = lazy(() => import("@/pages/projects/TeamPage"));
const BugTrackerPage = lazy(() => import("@/pages/projects/BugTrackerPage"));
const TimeTrackingPage = lazy(() => import("@/pages/projects/TimeTrackingPage"));
const TelecallingPage = lazy(() => import("@/pages/telecalling/TelecallingPage"));
const ServicesPage = lazy(() => import("@/pages/services/ServicesPage"));
const StockMarketPage = lazy(() => import("@/pages/stockmarket/StockMarketPage"));
const HealthPage = lazy(() => import("@/pages/health/HealthPage"));
const PatientPortalPage = lazy(() => import("@/pages/health/PatientPortalPage"));
const HealthPortalLoginPage = lazy(() => import("@/pages/health/HealthPortalLoginPage"));
const DoctorDashboardPage = lazy(() => import("@/pages/health/DoctorDashboardPage"));
const RestaurantPage = lazy(() => import("@/pages/restaurant/RestaurantPage"));
const HotelPage = lazy(() => import("@/pages/hotel/HotelPage"));
const WBAPage = lazy(() => import("@/pages/wba/WBAPage"));
const CarsPage = lazy(() => import("@/pages/cars/CarsPage"));
const TailoringPage = lazy(() => import("@/pages/tailoring/TailoringPage"));
const ReceptionistPage = lazy(() => import("@/pages/receptionist/ReceptionistPage"));
const CurrencyPage = lazy(() => import("@/pages/settings/CurrencyPage"));
const CustomFieldsPage = lazy(() => import("@/pages/settings/CustomFieldsPage"));
const BrandingPage = lazy(() => import("@/pages/settings/BrandingPage"));
const CompliancePage = lazy(() => import("@/pages/settings/CompliancePage"));
const LandingPage = lazy(() => import("@/pages/landing/LandingPage"));
const InvoicePortalPage = lazy(() => import("@/pages/portal/InvoicePortalPage"));
const PublicProjectPage = lazy(() => import("@/pages/public/PublicProjectPage"));

// Wrap a page with module-level access gate
const G = (moduleKey: string, Page: React.ComponentType) => (
  <AccessGate moduleKey={moduleKey}><Page /></AccessGate>
);

// Wrap a page with BOTH module access gate AND minimum role check
// minRole defaults to "STAFF" (any member with module access can see it)
const GR = (moduleKey: string, minRole: "MANAGER" | "ADMIN" | "OWNER", Page: React.ComponentType) => (
  <AccessGate moduleKey={moduleKey}>
    <RoleGate minRole={minRole}><Page /></RoleGate>
  </AccessGate>
);

// Shows landing page for guests, redirects authenticated users to dashboard
function PublicHome() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

// Shown briefly while a route's lazy chunk downloads — same spinner already
// used for in-page loading states (see ui/Button.tsx).
function RouteFallback() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-ghost)" }} />
    </div>
  );
}

export default function App() {
  return (
    <ShortcutsProvider>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
        <Route path="/portal/invoice/:token"  element={<InvoicePortalPage />} />
        <Route path="/patient-portal"          element={<PatientPortalPage />} />
        <Route path="/health-portal/login"     element={<HealthPortalLoginPage />} />
        <Route path="/health-portal/doctor"    element={<DoctorDashboardPage />} />
        <Route path="/public/project/:token" element={<PublicProjectPage />} />
        <Route path="/forms/:id"             element={<LeadCaptureFormPage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/register"       element={<Navigate to="/login" replace />} />
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
          <Route path="access"    element={<AdminAccessPage />} />
          <Route path="modules"   element={<AdminModulesPage />} />
          <Route path="settings"   element={<AdminSettingsPage />} />
          <Route path="logs"       element={<AdminLogsPage />} />
          <Route path="approvals"  element={<ApprovalQueuePage />} />
        </Route>

        {/* ── Super Admin (platform owner only) ── */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="dashboard"        element={<SuperAdminDashboard />} />
          <Route path="organizations"    element={<SuperAdminOrgsPage />} />
          <Route path="users"            element={<SuperAdminUsersPage />} />
          <Route path="module-requests"  element={<SuperAdminModuleRequestsPage />} />
          <Route path="access-requests"  element={<AccessRequestsPage />} />
        </Route>

        {/* ── Main App ── */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard"    element={<DashboardPage />} />

          {/* ── Core (gated by module key) ── */}
          <Route path="/crm"          element={G("CRM", CrmPage)} />
          <Route path="/crm/:id"      element={G("CRM", PartyDetailPage)} />
          <Route path="/duplicates"   element={G("CRM", DuplicatesPage)} />
          <Route path="/inventory"    element={G("INVENTORY", InventoryPage)} />
          <Route path="/batches"      element={G("INVENTORY", BatchTrackingPage)} />
          <Route path="/bom"          element={G("INVENTORY", BOMPage)} />
          <Route path="/purchase"     element={G("PURCHASE", PurchasePage)} />
          <Route path="/store"        element={G("STORE", StorePage)} />
          <Route path="/dispatch"     element={G("DISPATCH", SalesPage)} />
          <Route path="/accounts"     element={G("ACCOUNTS", FinancePage)} />
          <Route path="/receptionist" element={G("RECEPTIONIST", ReceptionistPage)} />

          {/* ── Operations ── */}
          <Route path="/pos"          element={G("POS", RetailPage)} />
          <Route path="/warehouse"    element={G("WAREHOUSE", WarehousePage)} />
          <Route path="/hr"           element={GR("HR", "MANAGER", HRPage)} />
          <Route path="/projects"       element={G("PROJECTS", ProjectsPage)} />
          <Route path="/it-projects"   element={G("PROJECTS", ITProjectsPage)} />
          <Route path="/sprint-board"  element={G("PROJECTS", SprintBoardPage)} />
          <Route path="/team-dashboard" element={GR("HR", "MANAGER", TeamDashboardPage)} />
          <Route path="/pm-dashboard"  element={<PMDashboard />} />
          <Route path="/team"          element={<TeamPage />} />
          <Route path="/directory"     element={<DirectoryPage />} />
          <Route path="/my-work"       element={G("PROJECTS", MyWorkPage)} />
          <Route path="/bugs"          element={G("PROJECTS", BugTrackerPage)} />
          <Route path="/time-tracking" element={G("PROJECTS", TimeTrackingPage)} />
          <Route path="/telecalling"   element={<TelecallingPage />} />
          <Route path="/services"      element={<ServicesPage />} />
          <Route path="/stock-market"  element={<StockMarketPage />} />
          <Route path="/health"        element={G("HEALTH", HealthPage)} />

          {/* ── Growth ── */}
          <Route path="/marketing"    element={G("MARKETING", LeadsPage)} />
          <Route path="/support"      element={G("SUPPORT", SupportPage)} />
          <Route path="/ecommerce"    element={<ComingSoonPage title="E-commerce" description="Connect Shopify, WooCommerce and sync online orders automatically." />} />
          <Route path="/reports"      element={G("REPORTS", ReportsPage)} />
          <Route path="/gst"          element={G("REPORTS", GSTReportsPage)} />
          <Route path="/einvoice"     element={G("ACCOUNTS", EInvoicePage)} />
          <Route path="/ewaybill"     element={G("ACCOUNTS", EWayBillPage)} />
          <Route path="/tds"          element={G("ACCOUNTS", TDSPage)} />
          <Route path="/budgets"         element={G("ACCOUNTS", BudgetPage)} />
          <Route path="/reconciliation" element={G("ACCOUNTS", ReconciliationPage)} />

          {/* ── Industry ── */}
          <Route path="/import-export" element={G("IMPORT_EXPORT_SUITE", TradePage)} />
          <Route path="/retail"        element={G("RETAIL_FASHION", RetailPage)} />
          <Route path="/restaurant"    element={G("RESTAURANT", RestaurantPage)} />
          <Route path="/hotel"         element={G("HOTEL", HotelPage)} />
          <Route path="/wba"          element={G("WBA", WBAPage)} />
          <Route path="/cars"         element={G("CARS", CarsPage)} />
          <Route path="/tailoring"    element={G("TAILORING", TailoringPage)} />

          {/* ── Sales ── */}
          <Route path="/deals"        element={<DealsPage />} />
          <Route path="/quotations"   element={<QuotationsPage />} />
          <Route path="/recurring"    element={<RecurringInvoicesPage />} />

          {/* ── Communication ── */}
          <Route path="/email"        element={<EmailPage />} />
          <Route path="/activities"   element={<ActivitiesPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/automations"  element={<AutomationPage />} />
          <Route path="/whatsapp"     element={<WhatsAppPage />} />
          <Route path="/lead-forms"   element={<LeadFormsPage />} />

          {/* ── Utility (no gate needed) ── */}
          <Route path="/documents"    element={<DocumentsPage />} />
          <Route path="/settings"      element={<SettingsPage />} />
          <Route path="/currency"      element={<CurrencyPage />} />
          <Route path="/webhooks"      element={<WebhooksPage />} />
          <Route path="/security"      element={<SecurityPage />} />
          <Route path="/audit"         element={<AuditPage />} />
          <Route path="/custom-fields" element={<CustomFieldsPage />} />
          <Route path="/branding"      element={<BrandingPage />} />
          <Route path="/compliance"    element={<CompliancePage />} />
        </Route>

        <Route path="/"  element={<PublicHome />} />
        <Route path="*"  element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </ShortcutsProvider>
  );
}
