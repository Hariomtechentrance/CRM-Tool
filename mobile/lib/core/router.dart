import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/auth_notifier.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/create_org_screen.dart';
import '../features/home/home_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/crm/crm_screen.dart';
import '../features/crm/party_detail_screen.dart';
import '../features/crm/add_party_screen.dart';
import '../features/crm/edit_party_screen.dart';
import '../features/crm/log_communication_screen.dart';
import '../features/crm/add_contact_screen.dart';
import '../features/crm/edit_contact_screen.dart';
import '../features/inventory/inventory_screen.dart';
import '../features/inventory/product_detail_screen.dart';
import '../features/inventory/edit_product_screen.dart';
import '../features/inventory/stock_adjustment_screen.dart';
import '../features/inventory/category_screen.dart';
import '../features/finance/create_invoice_screen.dart';
import '../features/finance/invoice_detail_screen.dart';
import '../features/finance/invoice_pdf_screen.dart';
import '../features/finance/record_payment_screen.dart';
import '../features/finance/finance_screen.dart';
import '../features/leads/leads_screen.dart';
import '../features/leads/lead_detail_screen.dart';
import '../features/leads/edit_lead_screen.dart';
import '../features/leads/log_lead_activity_screen.dart';
import '../features/leads/leads_kanban_screen.dart';
import '../features/hr/hr_screen.dart';
import '../features/hr/add_employee_screen.dart';
import '../features/purchase/purchase_screen.dart';
import '../features/purchase/create_purchase_order_screen.dart';
import '../features/purchase/purchase_order_detail_screen.dart';
import '../features/sales/sales_screen.dart';
import '../features/sales/create_sales_order_screen.dart';
import '../features/sales/sales_order_detail_screen.dart';
import '../features/support/support_screen.dart';
import '../features/support/create_ticket_screen.dart';
import '../features/support/ticket_detail_screen.dart';
import '../features/projects/projects_screen.dart';
import '../features/projects/project_detail_screen.dart';
import '../features/projects/edit_project_screen.dart';
import '../features/projects/edit_task_screen.dart';
import '../features/more/more_screen.dart';
import '../features/splash/splash_screen.dart';
import '../features/warehouse/warehouse_screen.dart';
import '../features/gst/gst_screen.dart';
import '../features/reports/reports_screen.dart';
import '../features/restaurant/restaurant_screen.dart';
import '../features/hotel/hotel_screen.dart';
import '../features/ecommerce/ecommerce_screen.dart';
import '../features/whatsapp/whatsapp_screen.dart';
import '../features/documents/documents_screen.dart';
import '../features/appointments/appointments_screen.dart';
import '../features/activities/activities_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/settings/org_settings_screen.dart';
import '../features/settings/team_management_screen.dart';
import '../features/settings/module_management_screen.dart';
import '../features/settings/edit_profile_screen.dart';

// RouterNotifier listens to auth state and notifies GoRouter to re-evaluate
// its redirect WITHOUT recreating the router (which would wipe the nav stack).
class _RouterNotifier extends ChangeNotifier {
  _RouterNotifier(this._ref) {
    _ref.listen<AsyncValue<AuthState>>(authNotifierProvider, (_, __) {
      notifyListeners();
    });
  }
  final Ref _ref;

  String? redirect(BuildContext context, GoRouterState state) {
    final authState = _ref.read(authNotifierProvider);
    final isLoading = authState is AsyncLoading;
    if (isLoading) return '/splash';

    final authData      = authState.valueOrNull;
    final isAuth        = authData?.isAuthenticated ?? false;
    final hasOrg        = authData?.hasOrg ?? false;
    final location      = state.matchedLocation;
    final isPublicRoute = ['/login', '/register', '/forgot-password', '/splash']
        .contains(location);

    if (!isAuth && !isPublicRoute) return '/login';
    if (isAuth && !hasOrg && location != '/create-org') return '/create-org';
    if (isAuth && hasOrg && (isPublicRoute || location == '/create-org')) {
      return '/home/dashboard';
    }
    return null;
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterNotifier(ref);
  ref.onDispose(notifier.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [
      // ── Auth ─────────────────────────────────────────────────
      GoRoute(path: '/splash',          builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login',           builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register',        builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(path: '/create-org',      builder: (_, __) => const CreateOrgScreen()),

      // ── CRM ───────────────────────────────────────────────────
      GoRoute(path: '/crm/add',  builder: (_, __) => const AddPartyScreen()),
      GoRoute(path: '/crm/edit', builder: (_, s)  => EditPartyScreen(party: s.extra as Map<String, dynamic>?)),
      GoRoute(
        path: '/crm/log/:partyId',
        builder: (_, s) => LogCommunicationScreen(
          partyId:   s.pathParameters['partyId']!,
          partyName: (s.extra as String?) ?? 'Party',
        ),
      ),
      GoRoute(
        path: '/crm/:partyId/contact/add',
        builder: (_, s) => AddContactScreen(
          partyId:   s.pathParameters['partyId']!,
          partyName: (s.extra as String?) ?? 'Party',
        ),
      ),
      GoRoute(
        path: '/crm/:partyId/contact/edit',
        builder: (_, s) => EditContactScreen(
          partyId: s.pathParameters['partyId']!,
          contact: s.extra as Map<String, dynamic>,
        ),
      ),

      // ── Inventory ─────────────────────────────────────────────
      GoRoute(path: '/inventory/product/:id', builder: (_, s) => ProductDetailScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/inventory/edit',        builder: (_, s) => EditProductScreen(product: s.extra as Map<String, dynamic>?)),
      GoRoute(path: '/inventory/adjust',      builder: (_, s) => StockAdjustmentScreen(product: s.extra as Map<String, dynamic>)),
      GoRoute(path: '/inventory/categories',  builder: (_, __) => const CategoryScreen()),

      // ── Finance ───────────────────────────────────────────────
      GoRoute(path: '/finance',                  builder: (_, __) => const FinanceScreen()),
      GoRoute(path: '/finance/invoice/create',   builder: (_, s)  => CreateInvoiceScreen(invoiceType: s.extra as String?)),
      GoRoute(path: '/finance/invoice/:id',      builder: (_, s)  => InvoiceDetailScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/finance/invoice/:id/pdf',  builder: (_, s)  => InvoicePdfScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/finance/payment/create',   builder: (_, s)  => RecordPaymentScreen(extra: s.extra as Map<String, dynamic>)),

      // ── Leads ─────────────────────────────────────────────────
      GoRoute(path: '/leads',        builder: (_, __) => const LeadsScreen()),
      GoRoute(path: '/leads/kanban', builder: (_, __) => const LeadsKanbanScreen()),
      GoRoute(path: '/leads/add',    builder: (_, s)  => EditLeadScreen(lead: s.extra as Map<String, dynamic>?)),
      GoRoute(path: '/leads/edit',   builder: (_, s)  => EditLeadScreen(lead: s.extra as Map<String, dynamic>)),
      GoRoute(path: '/leads/:id',    builder: (_, s)  => LeadDetailScreen(id: s.pathParameters['id']!)),
      GoRoute(
        path: '/leads/:id/log',
        builder: (_, s) => LogLeadActivityScreen(
          leadId:   s.pathParameters['id']!,
          leadName: (s.extra as String?) ?? 'Lead',
        ),
      ),

      // ── HR ────────────────────────────────────────────────────
      GoRoute(path: '/hr',                  builder: (_, __) => const HrScreen()),
      GoRoute(path: '/hr/employee/add',     builder: (_, __)  => const AddEmployeeScreen()),
      GoRoute(path: '/hr/employee/:id',     builder: (_, s)   => AddEmployeeScreen(employee: s.extra as Map<String, dynamic>?)),

      // ── Purchase ──────────────────────────────────────────────
      GoRoute(path: '/purchase',        builder: (_, __) => const PurchaseScreen()),
      GoRoute(path: '/purchase/create', builder: (_, __)  => const CreatePurchaseOrderScreen()),
      GoRoute(path: '/purchase/:id',    builder: (_, s)   => PurchaseOrderDetailScreen(id: s.pathParameters['id']!)),

      // ── Sales ─────────────────────────────────────────────────
      GoRoute(path: '/sales',        builder: (_, __) => const SalesScreen()),
      GoRoute(path: '/sales/create', builder: (_, __)  => const CreateSalesOrderScreen()),
      GoRoute(path: '/sales/:id',    builder: (_, s)   => SalesOrderDetailScreen(id: s.pathParameters['id']!)),

      // ── Projects ──────────────────────────────────────────────
      GoRoute(path: '/projects',     builder: (_, __) => const ProjectsScreen()),
      GoRoute(path: '/projects/add', builder: (_, s)  => EditProjectScreen(project: s.extra as Map<String, dynamic>?)),
      GoRoute(path: '/projects/:id', builder: (_, s)  => ProjectDetailScreen(id: s.pathParameters['id']!)),
      GoRoute(
        path: '/projects/:projectId/task/add',
        builder: (_, s) => EditTaskScreen(
          projectId: s.pathParameters['projectId']!,
          task: null,
        ),
      ),
      GoRoute(
        path: '/projects/:projectId/task/:taskId',
        builder: (_, s) => EditTaskScreen(
          projectId: s.pathParameters['projectId']!,
          task: s.extra as Map<String, dynamic>?,
        ),
      ),

      // ── Support ───────────────────────────────────────────────
      GoRoute(path: '/support',        builder: (_, __) => const SupportScreen()),
      GoRoute(path: '/support/create', builder: (_, __)  => const CreateTicketScreen()),
      GoRoute(path: '/support/:id',    builder: (_, s)   => TicketDetailScreen(id: s.pathParameters['id']!)),

      // ── Settings ──────────────────────────────────────────────
      GoRoute(path: '/settings',         builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/settings/org',     builder: (_, __) => const OrgSettingsScreen()),
      GoRoute(path: '/settings/team',    builder: (_, __) => const TeamManagementScreen()),
      GoRoute(path: '/settings/modules', builder: (_, __) => const ModuleManagementScreen()),
      GoRoute(path: '/settings/profile', builder: (_, __) => const EditProfileScreen()),

      // ── Other modules ─────────────────────────────────────────
      GoRoute(path: '/warehouse',    builder: (_, __) => const WarehouseScreen()),
      GoRoute(path: '/gst',          builder: (_, __) => const GstScreen()),
      GoRoute(path: '/reports',      builder: (_, __) => const ReportsScreen()),
      GoRoute(path: '/restaurant',   builder: (_, __) => const RestaurantScreen()),
      GoRoute(path: '/hotel',        builder: (_, __) => const HotelScreen()),
      GoRoute(path: '/ecommerce',    builder: (_, __) => const EcommerceScreen()),
      GoRoute(path: '/whatsapp',     builder: (_, __) => const WhatsappScreen()),
      GoRoute(path: '/documents',    builder: (_, __) => const DocumentsScreen()),
      GoRoute(path: '/appointments', builder: (_, __) => const AppointmentsScreen()),
      GoRoute(path: '/activities',   builder: (_, __) => const ActivitiesScreen()),

      // ── Shell (bottom nav) ────────────────────────────────────
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => HomeScreen(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/home/dashboard', builder: (_, __) => const DashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/home/crm',
              builder: (_, __) => const CrmScreen(),
              routes: [
                GoRoute(
                  path: 'party/:id',
                  builder: (_, s) => PartyDetailScreen(id: s.pathParameters['id']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/home/inventory', builder: (_, __) => const InventoryScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/home/more', builder: (_, __) => const MoreScreen()),
          ]),
        ],
      ),
    ],
  );
});
