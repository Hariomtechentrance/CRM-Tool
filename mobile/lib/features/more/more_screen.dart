import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';

class _Mod {
  final String label, subtitle, route;
  final IconData icon;
  final Color color;
  const _Mod({required this.label, required this.subtitle, required this.route, required this.icon, required this.color});
}

const _modules = [
  _Mod(label: 'Finance',        subtitle: 'Invoices & payments',      route: '/finance',      icon: Icons.receipt_long,          color: AppColors.danger),
  _Mod(label: 'HR & Payroll',   subtitle: 'Employees & attendance',   route: '/hr',           icon: Icons.badge_outlined,        color: AppColors.info),
  _Mod(label: 'Purchase',       subtitle: 'POs & vendors',            route: '/purchase',     icon: Icons.shopping_cart_outlined,color: AppColors.secondary),
  _Mod(label: 'Sales',          subtitle: 'Orders & dispatch',        route: '/sales',        icon: Icons.local_shipping_outlined,color: AppColors.warning),
  _Mod(label: 'Leads',          subtitle: 'Pipeline & follow-ups',    route: '/leads',        icon: Icons.trending_up,           color: AppColors.primary),
  _Mod(label: 'Support',        subtitle: 'Tickets & SLA',            route: '/support',      icon: Icons.headset_mic_outlined,  color: AppColors.danger),
  _Mod(label: 'Projects',       subtitle: 'Tasks & milestones',       route: '/projects',     icon: Icons.task_alt_outlined,     color: AppColors.secondary),
  _Mod(label: 'Warehouse',      subtitle: 'Multi-location stock',     route: '/warehouse',    icon: Icons.warehouse_outlined,    color: AppColors.warning),
  _Mod(label: 'GST Reports',    subtitle: 'GSTR-1, GSTR-3B',         route: '/gst',          icon: Icons.description_outlined,  color: AppColors.success),
  _Mod(label: 'Reports',        subtitle: 'Analytics & exports',      route: '/reports',      icon: Icons.bar_chart_outlined,    color: AppColors.info),
  _Mod(label: 'Restaurant POS', subtitle: 'KOT, tables & billing',   route: '/restaurant',   icon: Icons.restaurant_outlined,   color: Color(0xFFF97316)),
  _Mod(label: 'Hotel / Resort', subtitle: 'Rooms & bookings',        route: '/hotel',        icon: Icons.hotel_outlined,        color: Color(0xFF0EA5E9)),
  _Mod(label: 'E-commerce',     subtitle: 'Shopify & Flipkart sync', route: '/ecommerce',    icon: Icons.storefront_outlined,   color: AppColors.secondary),
  _Mod(label: 'WhatsApp',       subtitle: 'Messages & campaigns',    route: '/whatsapp',     icon: Icons.chat_bubble_outline,   color: Color(0xFF25D366)),
  _Mod(label: 'Documents',      subtitle: 'Files & contracts',       route: '/documents',    icon: Icons.folder_open_outlined,  color: AppColors.info),
  _Mod(label: 'Appointments',   subtitle: 'Calendar & scheduling',   route: '/appointments', icon: Icons.calendar_today_outlined,color: AppColors.primary),
  _Mod(label: 'Activities',     subtitle: 'Timeline & logs',         route: '/activities',   icon: Icons.timeline_outlined,     color: AppColors.secondary),
  _Mod(label: 'Settings',       subtitle: 'Org & team config',       route: '/settings',     icon: Icons.settings_outlined,     color: AppColors.textSec),
];

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) => CustomScrollView(
    slivers: [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        sliver: SliverToBoxAdapter(
          child: TextField(
            readOnly: true,
            decoration: InputDecoration(
              hintText: 'Search modules...',
              prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.textGhost),
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              fillColor: AppColors.cardLight,
              filled: true,
            ),
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        sliver: SliverGrid(
          delegate: SliverChildBuilderDelegate(
            (ctx, i) => _ModuleCard(mod: _modules[i]),
            childCount: _modules.length,
          ),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.6,
          ),
        ),
      ),
    ],
  );
}

class _ModuleCard extends StatelessWidget {
  final _Mod mod;
  const _ModuleCard({required this.mod});

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => context.push(mod.route),
    borderRadius: BorderRadius.circular(14),
    child: Container(
      decoration: BoxDecoration(
        color: mod.color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: mod.color.withOpacity(0.2)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: mod.color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(mod.icon, size: 18, color: mod.color),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(mod.label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(mod.subtitle, style: const TextStyle(fontSize: 9, color: AppColors.textGhost), maxLines: 1, overflow: TextOverflow.ellipsis),
          ]),
        ],
      ),
    ),
  );
}
