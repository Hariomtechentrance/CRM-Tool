import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class SalesScreen extends ConsumerStatefulWidget {
  const SalesScreen({super.key});
  @override
  ConsumerState<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends ConsumerState<SalesScreen> {
  bool _loading = true;
  List<dynamic> _orders = [];
  String _filter = 'ALL';
  final _fmt = NumberFormat('#,##,###', 'en_IN');

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getSalesOrders();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _orders = raw is List ? raw : (raw?['orders'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _color(String? s) {
    switch (s) {
      case 'PENDING':   return AppColors.warning;
      case 'CONFIRMED': return AppColors.info;
      case 'SHIPPED':   return AppColors.secondary;
      case 'DELIVERED': return AppColors.success;
      case 'CANCELLED': return AppColors.danger;
      default:          return AppColors.textSec;
    }
  }

  List<dynamic> get _filtered => _filter == 'ALL' ? _orders : _orders.where((o) => o['status'] == _filter).toList();

  @override
  Widget build(BuildContext context) {
    final totalRevenue = _orders.fold<double>(0, (s, o) => s + ((o['totalAmount'] as num? ?? 0).toDouble()));
    final delivered = _orders.where((o) => o['status'] == 'DELIVERED').length;
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Sales & Dispatch'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await context.push<bool>('/sales/create');
              if (result == true) _load();
            },
          ),
        ],
      ),
      body: Column(children: [
        // ── Summary ───────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: _statBox('Revenue', '₹${_fmt.format(totalRevenue)}', AppColors.warning)),
            const SizedBox(width: 10),
            Expanded(child: _statBox('Orders', '${_orders.length}', AppColors.primary)),
            const SizedBox(width: 10),
            Expanded(child: _statBox('Delivered', '$delivered', AppColors.success)),
          ]),
        ),

        // ── Filter ───────────────────────────────────────────
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) {
              final sel = _filter == s;
              final c   = s == 'ALL' ? AppColors.warning : _color(s);
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(s, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: sel ? Colors.white : c)),
                  selected: sel,
                  onSelected: (_) => setState(() => _filter = s),
                  backgroundColor: c.withOpacity(0.08),
                  selectedColor: c,
                  showCheckmark: false,
                  side: BorderSide(color: c.withOpacity(0.3)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 8),

        // ── List ─────────────────────────────────────────────
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.warning))
              : _filtered.isEmpty
                  ? EmptyState(icon: Icons.local_shipping_outlined, message: 'No sales orders', subtitle: 'Create your first sales order')
                  : RefreshIndicator(
                      color: AppColors.warning,
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                        itemCount: _filtered.length,
                        itemBuilder: (_, i) {
                          final o = _filtered[i] as Map<String, dynamic>;
                          final status = o['status'] as String? ?? 'PENDING';
                          final c = _color(status);
                          final total = (o['totalAmount'] as num? ?? 0).toDouble();
                          final customer = o['customer']?['name'] as String? ?? o['customerName'] as String? ?? 'Unknown';
                          return GestureDetector(
                            onTap: () => context.push('/sales/${o['id']}'),
                            child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: AppColors.cardLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                              leading: Container(
                                width: 40, height: 40,
                                decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                                child: Icon(Icons.local_shipping_outlined, size: 18, color: c),
                              ),
                              title: Text(o['orderNumber'] as String? ?? o['soNumber'] as String? ?? '#${o['id'].toString().substring(0,6)}',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                              subtitle: Text(customer, style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
                              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                                Text('₹${_fmt.format(total)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                Container(
                                  margin: const EdgeInsets.only(top: 2),
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                                  child: Text(status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
                                ),
                              ]),
                            ),
                          ));
                        },
                      ),
                    ),
        ),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push<bool>('/sales/create');
          if (result == true) _load();
        },
        backgroundColor: AppColors.warning,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _statBox(String label, String value, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
    decoration: BoxDecoration(
      color: c.withOpacity(0.08),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: c.withOpacity(0.2)),
    ),
    child: Column(children: [
      Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: c)),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
    ]),
  );
}
