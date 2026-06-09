import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class PurchaseScreen extends ConsumerStatefulWidget {
  const PurchaseScreen({super.key});
  @override
  ConsumerState<PurchaseScreen> createState() => _PurchaseScreenState();
}

class _PurchaseScreenState extends ConsumerState<PurchaseScreen> {
  bool _loading = true;
  List<dynamic> _orders = [];
  String _filter = 'ALL';
  final _fmt = NumberFormat('#,##,###', 'en_IN');

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getPurchaseOrders();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _orders = raw is List ? raw : (raw?['orders'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _color(String? s) {
    switch (s) {
      case 'DRAFT':    return AppColors.textGhost;
      case 'SENT':     return AppColors.info;
      case 'RECEIVED': return AppColors.success;
      case 'PARTIAL':  return AppColors.warning;
      case 'CANCELLED':return AppColors.danger;
      default:         return AppColors.textSec;
    }
  }

  List<dynamic> get _filtered => _filter == 'ALL' ? _orders : _orders.where((o) => o['status'] == _filter).toList();

  @override
  Widget build(BuildContext context) {
    final totalValue = _orders.fold<double>(0, (s, o) => s + ((o['totalAmount'] as num? ?? 0).toDouble()));
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Purchase Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await context.push<bool>('/purchase/create');
              if (result == true) _load();
            },
          ),
        ],
      ),
      body: Column(children: [
        // ── Summary banner ────────────────────────────────────
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF6366F1)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(children: [
            const Icon(Icons.shopping_cart_outlined, color: Colors.white70, size: 28),
            const SizedBox(width: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Total Purchase Value', style: TextStyle(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.w500)),
              Text('₹${_fmt.format(totalValue)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
            ]),
            const Spacer(),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('${_orders.length}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
              const Text('Orders', style: TextStyle(fontSize: 11, color: Colors.white70)),
            ]),
          ]),
        ),

        // ── Filter ───────────────────────────────────────────
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: ['ALL', 'DRAFT', 'SENT', 'RECEIVED', 'PARTIAL', 'CANCELLED'].map((s) {
              final sel = _filter == s;
              final c   = s == 'ALL' ? AppColors.secondary : _color(s);
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
              ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
              : _filtered.isEmpty
                  ? EmptyState(icon: Icons.shopping_cart_outlined, message: 'No purchase orders', subtitle: 'Create your first PO')
                  : RefreshIndicator(
                      color: AppColors.secondary,
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                        itemCount: _filtered.length,
                        itemBuilder: (_, i) {
                          final o = _filtered[i] as Map<String, dynamic>;
                          final status = o['status'] as String? ?? 'DRAFT';
                          final c = _color(status);
                          final total = (o['totalAmount'] as num? ?? 0).toDouble();
                          final vendor = o['vendor']?['name'] as String? ?? o['supplierName'] as String? ?? 'Unknown Vendor';
                          return GestureDetector(
                            onTap: () => context.push('/purchase/${o['id']}'),
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
                                child: Icon(Icons.shopping_cart_outlined, size: 18, color: c),
                              ),
                              title: Text(o['poNumber'] as String? ?? o['orderNumber'] as String? ?? '#${o['id'].toString().substring(0, 6)}',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                              subtitle: Text(vendor, style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
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
          final result = await context.push<bool>('/purchase/create');
          if (result == true) _load();
        },
        backgroundColor: AppColors.secondary,
        icon: const Icon(Icons.add_shopping_cart, color: Colors.white),
        label: const Text('New PO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
