import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../features/auth/auth_notifier.dart';
import '../../shared/widgets/stat_card.dart';

final _dashStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  try {
    final res = await ApiClient().getDashboardStats();
    return res.data['data'] as Map<String, dynamic>? ?? {};
  } catch (_) { return {}; }
});

final _activityFeedProvider = FutureProvider<List<dynamic>>((ref) async {
  try {
    final res = await ApiClient().getActivityFeed();
    final raw = res.data['data'];
    return raw is List ? raw : (raw?['activities'] as List? ?? []);
  } catch (_) { return []; }
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user     = ref.watch(authNotifierProvider).valueOrNull?.user;
    final stats    = ref.watch(_dashStatsProvider);
    final activity = ref.watch(_activityFeedProvider);
    final fmt      = NumberFormat.compact(locale: 'en_IN');
    final fmtFull  = NumberFormat('#,##,###', 'en_IN');

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        ref.invalidate(_dashStatsProvider);
        ref.invalidate(_activityFeedProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [

          // ── Greeting ───────────────────────────────────────────
          Text('Hi, ${user?.name.split(' ').first ?? 'there'} 👋',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
          const SizedBox(height: 2),
          Text(DateFormat('EEEE, d MMMM yyyy').format(DateTime.now()),
            style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
          const SizedBox(height: 20),

          // ── Stats grid ─────────────────────────────────────────
          stats.when(
            loading: () => const _StatsShimmer(),
            error:   (_, __) => const _EmptyStats(),
            data: (d) => Column(children: [
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.5,
                children: [
                  StatCard(label: 'Total Parties',   value: '${d['totalParties'] ?? 0}',               icon: Icons.people_outline,        color: AppColors.primary),
                  StatCard(label: 'Active Orders',   value: '${d['activeOrders'] ?? 0}',               icon: Icons.shopping_bag_outlined,  color: AppColors.success),
                  StatCard(label: 'Revenue (Mo.)',   value: '₹${fmt.format(d['monthRevenue'] ?? 0)}',  icon: Icons.trending_up,            color: AppColors.warning),
                  StatCard(label: 'Open Leads',      value: '${d['openLeads'] ?? 0}',                  icon: Icons.flag_outlined,          color: AppColors.info),
                ],
              ),
              const SizedBox(height: 10),
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.7,
                children: [
                  _MiniStat(label: 'Invoices',    value: '${d['totalInvoices'] ?? 0}',   color: AppColors.danger),
                  _MiniStat(label: 'Open Tickets',value: '${d['openTickets'] ?? 0}',     color: AppColors.secondary),
                  _MiniStat(label: 'Products',    value: '${d['totalProducts'] ?? 0}',   color: AppColors.success),
                ],
              ),
            ]),
          ),

          const SizedBox(height: 24),

          // ── Revenue chart ──────────────────────────────────────
          stats.maybeWhen(
            data: (d) {
              final monthly = d['monthlyRevenue'] as List? ?? _fakeBars();
              return _RevenueChart(monthly: monthly, fmt: fmtFull);
            },
            orElse: () => _RevenueChart(monthly: _fakeBars(), fmt: fmtFull),
          ),

          const SizedBox(height: 24),

          // ── Quick actions ──────────────────────────────────────
          const Text('Quick Actions', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _QuickAction(label: 'Add Party',     icon: Icons.person_add_outlined,    color: AppColors.primary,   route: '/crm/add'),
              _QuickAction(label: 'New Invoice',   icon: Icons.receipt_long_outlined,  color: AppColors.success,   route: '/finance/invoice/create'),
              _QuickAction(label: 'Add Lead',      icon: Icons.flag_outlined,          color: AppColors.warning,   route: '/leads/add'),
              _QuickAction(label: 'Add Product',   icon: Icons.add_box_outlined,       color: AppColors.info,      route: '/inventory/edit'),
              _QuickAction(label: 'New Purchase',  icon: Icons.shopping_cart_outlined, color: AppColors.secondary, route: '/purchase/create'),
              _QuickAction(label: 'New Ticket',    icon: Icons.support_agent_outlined, color: AppColors.danger,    route: '/support/create'),
            ],
          ),

          const SizedBox(height: 24),

          // ── Module shortcuts ───────────────────────────────────
          const Text('Modules', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 4,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            children: const [
              _ModuleIcon(label: 'CRM',       icon: Icons.people,          color: AppColors.primary,   route: '/home/crm'),
              _ModuleIcon(label: 'Inventory', icon: Icons.inventory_2,     color: AppColors.success,   route: '/home/inventory'),
              _ModuleIcon(label: 'Finance',   icon: Icons.receipt,         color: AppColors.danger,    route: '/finance'),
              _ModuleIcon(label: 'HR',        icon: Icons.badge,           color: AppColors.info,      route: '/hr'),
              _ModuleIcon(label: 'Purchase',  icon: Icons.shopping_cart,   color: AppColors.secondary, route: '/purchase'),
              _ModuleIcon(label: 'Sales',     icon: Icons.local_shipping,  color: AppColors.warning,   route: '/sales'),
              _ModuleIcon(label: 'Leads',     icon: Icons.trending_up,     color: AppColors.primary,   route: '/leads'),
              _ModuleIcon(label: 'Reports',   icon: Icons.bar_chart,       color: AppColors.success,   route: '/reports'),
            ],
          ),

          const SizedBox(height: 24),

          // ── Activity feed ──────────────────────────────────────
          const Text('Recent Activity', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          activity.when(
            loading: () => const _FeedShimmer(),
            error:   (_, __) => const SizedBox.shrink(),
            data: (items) => items.isEmpty
                ? Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.cardLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Center(child: Text('No recent activity',
                      style: TextStyle(fontSize: 13, color: AppColors.textGhost))),
                  )
                : Column(
                    children: items.take(10).map((a) {
                      final act   = a as Map<String, dynamic>;
                      final type  = act['type'] as String? ?? 'ACTIVITY';
                      final c     = _feedColor(type);
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.cardLight,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(children: [
                          Container(
                            width: 32, height: 32,
                            decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                            child: Icon(_feedIcon(type), size: 16, color: c),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(act['description'] as String? ?? act['message'] as String? ?? type,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                              maxLines: 2, overflow: TextOverflow.ellipsis),
                            if (act['createdAt'] != null)
                              Text(act['createdAt'] as String,
                                style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                          ])),
                        ]),
                      );
                    }).toList(),
                  ),
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  static List<dynamic> _fakeBars() => List.generate(6, (i) {
    final months = ['Jan','Feb','Mar','Apr','May','Jun'];
    return {'month': months[i], 'revenue': (i + 1) * 150000.0};
  });

  static Color _feedColor(String type) {
    switch (type) {
      case 'INVOICE':  return AppColors.success;
      case 'LEAD':     return AppColors.primary;
      case 'PARTY':    return AppColors.info;
      case 'TICKET':   return AppColors.danger;
      case 'PAYMENT':  return AppColors.warning;
      default:         return AppColors.textSec;
    }
  }

  static IconData _feedIcon(String type) {
    switch (type) {
      case 'INVOICE':  return Icons.receipt_outlined;
      case 'LEAD':     return Icons.flag_outlined;
      case 'PARTY':    return Icons.person_outlined;
      case 'TICKET':   return Icons.headset_mic_outlined;
      case 'PAYMENT':  return Icons.payments_outlined;
      default:         return Icons.circle_outlined;
    }
  }
}

// ── Revenue chart ──────────────────────────────────────────────

class _RevenueChart extends StatelessWidget {
  final List<dynamic> monthly;
  final NumberFormat fmt;
  const _RevenueChart({required this.monthly, required this.fmt});

  @override
  Widget build(BuildContext context) {
    if (monthly.isEmpty) return const SizedBox.shrink();

    final maxVal = monthly.fold<double>(0, (m, e) {
      final v = (e['revenue'] ?? e['amount'] ?? 0) as num;
      return v.toDouble() > m ? v.toDouble() : m;
    });

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Revenue Trend', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        const SizedBox(height: 16),
        SizedBox(
          height: 140,
          child: BarChart(
            BarChartData(
              maxY: maxVal > 0 ? maxVal * 1.2 : 100,
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: maxVal > 0 ? maxVal / 3 : 33,
                getDrawingHorizontalLine: (_) => FlLine(color: AppColors.border.withOpacity(0.5), strokeWidth: 1),
              ),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                show: true,
                topTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                leftTitles:  AxisTitles(sideTitles: SideTitles(
                  showTitles: true, reservedSize: 48,
                  getTitlesWidget: (v, _) => Text(
                    v == 0 ? '' : NumberFormat.compact().format(v),
                    style: const TextStyle(fontSize: 9, color: AppColors.textGhost),
                  ),
                )),
                bottomTitles: AxisTitles(sideTitles: SideTitles(
                  showTitles: true, reservedSize: 22,
                  getTitlesWidget: (v, _) {
                    final i = v.toInt();
                    if (i < 0 || i >= monthly.length) return const SizedBox.shrink();
                    final m = monthly[i] as Map<String, dynamic>;
                    return Text(m['month'] as String? ?? '', style: const TextStyle(fontSize: 9, color: AppColors.textGhost));
                  },
                )),
              ),
              barGroups: monthly.asMap().entries.map((e) {
                final val = ((e.value as Map)['revenue'] ?? (e.value as Map)['amount'] ?? 0) as num;
                return BarChartGroupData(x: e.key, barRods: [
                  BarChartRodData(
                    toY:    val.toDouble(),
                    color:  AppColors.primary,
                    width:  22,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                  ),
                ]);
              }).toList(),
              barTouchData: BarTouchData(
                touchTooltipData: BarTouchTooltipData(
                  tooltipBgColor: AppColors.textPrimary,
                  getTooltipItem: (group, _, rod, __) {
                    final m = monthly[group.x] as Map<String, dynamic>;
                    return BarTooltipItem(
                      '${m['month']}\n₹${fmt.format(rod.toY)}',
                      const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color color;
  const _MiniStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
    decoration: BoxDecoration(
      color: color.withOpacity(0.07),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color.withOpacity(0.15)),
    ),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textGhost, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
    ]),
  );
}

class _QuickAction extends StatelessWidget {
  final String label, route;
  final IconData icon;
  final Color color;
  const _QuickAction({required this.label, required this.icon, required this.color, required this.route});

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => context.push(route),
    borderRadius: BorderRadius.circular(10),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 15, color: color),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
      ]),
    ),
  );
}

class _ModuleIcon extends StatelessWidget {
  final String label, route;
  final IconData icon;
  final Color color;
  const _ModuleIcon({required this.label, required this.icon, required this.color, required this.route});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => context.push(route),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, size: 20, color: color),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.textSec), textAlign: TextAlign.center),
      ],
    ),
  );
}

class _StatsShimmer extends StatelessWidget {
  const _StatsShimmer();
  @override
  Widget build(BuildContext context) => GridView.count(
    crossAxisCount: 2,
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    crossAxisSpacing: 10,
    mainAxisSpacing: 10,
    childAspectRatio: 1.5,
    children: List.generate(4, (_) => Container(
      decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(14)),
    )),
  );
}

class _FeedShimmer extends StatelessWidget {
  const _FeedShimmer();
  @override
  Widget build(BuildContext context) => Column(
    children: List.generate(3, (_) => Container(
      margin: const EdgeInsets.only(bottom: 6),
      height: 52,
      decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(10)),
    )),
  );
}

class _EmptyStats extends StatelessWidget {
  const _EmptyStats();
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.symmetric(vertical: 20),
    child: Center(child: Text('Stats unavailable', style: TextStyle(color: AppColors.textGhost, fontSize: 13))),
  );
}
