import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_list.dart';
import '../../shared/widgets/offline_banner.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});
  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  bool _loading = true;
  bool _hasError = false;
  List<dynamic> _products = [];
  String _search = '';
  String _stockFilter = 'ALL'; // ALL, IN_STOCK, LOW, OUT

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _hasError = false; });
    try {
      final res = await ApiClient().getProducts(search: _search);
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _products = raw is List ? raw : (raw?['products'] as List? ?? []));
    } catch (_) {
      if (!mounted) return;
      setState(() => _hasError = true);
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  List<dynamic> get _filtered {
    var list = _search.isEmpty ? _products
        : _products.where((p) => (p['name'] as String? ?? '').toLowerCase().contains(_search.toLowerCase()) || (p['sku'] as String? ?? '').toLowerCase().contains(_search.toLowerCase())).toList();
    if (_stockFilter == 'OUT')      list = list.where((p) => (p['currentStock'] as num? ?? 0) <= 0).toList();
    else if (_stockFilter == 'LOW') list = list.where((p) {
      final s = (p['currentStock'] as num? ?? 0).toDouble();
      final r = (p['reorderLevel'] as num? ?? p['minStock'] as num? ?? 0).toDouble();
      return s > 0 && s <= r;
    }).toList();
    else if (_stockFilter == 'IN_STOCK') list = list.where((p) {
      final s = (p['currentStock'] as num? ?? 0).toDouble();
      final r = (p['reorderLevel'] as num? ?? p['minStock'] as num? ?? 0).toDouble();
      return s > r;
    }).toList();
    return list;
  }

  int get _outCount => _products.where((p) => (p['currentStock'] as num? ?? 0) <= 0).length;
  int get _lowCount => _products.where((p) {
    final s = (p['currentStock'] as num? ?? 0).toDouble();
    final r = (p['reorderLevel'] as num? ?? 0).toDouble();
    return s > 0 && r > 0 && s <= r;
  }).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Inventory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner_outlined, size: 22),
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('QR scanner coming soon'), behavior: SnackBarBehavior.floating)),
          ),
          IconButton(
            icon: const Icon(Icons.add_box_outlined, size: 22),
            onPressed: () async {
              final result = await context.push<bool>('/inventory/edit');
              if (result == true) _load();
            },
          ),
        ],
      ),
      body: OfflineBanner(child: Column(children: [
        // ── Search ────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
          child: TextField(
            onChanged: (v) { setState(() => _search = v); if (v.isEmpty) _load(); },
            onSubmitted: (_) => _load(),
            decoration: InputDecoration(
              hintText: 'Search by name or SKU...',
              prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.textGhost),
              suffixIcon: _search.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 16), onPressed: () { setState(() => _search = ''); _load(); })
                  : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),

        // ── Stock alert badges ────────────────────────────────
        if (!_loading && (_outCount > 0 || _lowCount > 0))
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(children: [
              if (_outCount > 0) _alertBadge('$_outCount Out of Stock', AppColors.danger),
              if (_outCount > 0 && _lowCount > 0) const SizedBox(width: 8),
              if (_lowCount > 0) _alertBadge('$_lowCount Low Stock', AppColors.warning),
            ]),
          ),

        // ── Filter chips ──────────────────────────────────────
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: {
              'ALL': 'All',
              'IN_STOCK': 'In Stock',
              'LOW': 'Low Stock',
              'OUT': 'Out of Stock',
            }.entries.map((e) {
              final sel = _stockFilter == e.key;
              final c   = e.key == 'OUT' ? AppColors.danger : e.key == 'LOW' ? AppColors.warning : e.key == 'IN_STOCK' ? AppColors.success : AppColors.primary;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(e.value, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: sel ? Colors.white : c)),
                  selected: sel,
                  onSelected: (_) => setState(() => _stockFilter = e.key),
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

        // ── Product list ──────────────────────────────────────
        Expanded(
          child: _loading
              ? const ShimmerList(itemHeight: 76)
              : _hasError
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.cloud_off_outlined, size: 48, color: AppColors.textGhost),
                      const SizedBox(height: 12),
                      const Text('Failed to load', style: TextStyle(color: AppColors.textGhost)),
                      const SizedBox(height: 12),
                      TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Retry')),
                    ]))
              : _filtered.isEmpty
                  ? EmptyState(
                      icon: Icons.inventory_2_outlined,
                      message: 'No products found',
                      subtitle: 'Add products to track your inventory',
                      actionLabel: 'Add Product',
                      onAction: () async {
                        final result = await context.push<bool>('/inventory/edit');
                        if (result == true) _load();
                      },
                    )
                  : RefreshIndicator(
                      color: AppColors.success,
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                        itemCount: _filtered.length,
                        itemBuilder: (_, i) {
                          final p     = _filtered[i] as Map<String, dynamic>;
                          final stock = (p['currentStock'] as num? ?? p['quantity'] as num? ?? 0).toDouble();
                          final minS  = (p['reorderLevel'] as num? ?? p['minStock'] as num? ?? 0).toDouble();
                          final out   = stock <= 0;
                          final low   = !out && minS > 0 && stock <= minS;
                          final sc    = out ? AppColors.danger : low ? AppColors.warning : AppColors.success;
                          final price = (p['sellingPrice'] as num? ?? p['price'] as num? ?? 0).toDouble();
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: AppColors.cardLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: out ? AppColors.danger.withOpacity(0.3) : low ? AppColors.warning.withOpacity(0.3) : AppColors.border),
                            ),
                            child: InkWell(
                              onTap: () => context.push('/inventory/product/${p['id']}'),
                              borderRadius: BorderRadius.circular(12),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Row(children: [
                                  Container(
                                    width: 44, height: 44,
                                    decoration: BoxDecoration(color: sc.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                                    child: Icon(Icons.inventory_2_outlined, size: 22, color: sc),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(p['name'] as String? ?? 'Product', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                                    const SizedBox(height: 2),
                                    Row(children: [
                                      if (p['sku'] != null) Text('SKU: ${p['sku']}', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                                      if (p['sku'] != null && p['category'] != null) const Text(' • ', style: TextStyle(fontSize: 11, color: AppColors.textGhost)),
                                      if (p['category'] != null) Text(p['category'] as String, style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                                    ]),
                                  ])),
                                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                    Text('${stock.toStringAsFixed(stock % 1 == 0 ? 0 : 1)} ${p['unit'] ?? 'units'}',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: sc)),
                                    Text(out ? 'Out of Stock' : low ? 'Low Stock' : '₹${price.toStringAsFixed(0)}',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: out || low ? sc : AppColors.textSec)),
                                  ]),
                                ]),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ])),
    );
  }

  Widget _alertBadge(String label, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: c.withOpacity(0.3))),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.warning_amber_outlined, size: 12, color: c),
      const SizedBox(width: 4),
      Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: c)),
    ]),
  );
}
