import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class WarehouseScreen extends ConsumerStatefulWidget {
  const WarehouseScreen({super.key});
  @override
  ConsumerState<WarehouseScreen> createState() => _WarehouseScreenState();
}

class _WarehouseScreenState extends ConsumerState<WarehouseScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  bool _loading = true;
  List<dynamic> _locations = [];
  List<dynamic> _stock = [];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/warehouse/locations');
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _locations = raw is List ? raw : (raw?['locations'] as List? ?? []));
    } catch (_) {}
    try {
      final res = await ApiClient().dio.get('/warehouse/stock');
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _stock = raw is List ? raw : (raw?['stock'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Warehouse'),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: _cs),
          IconButton(icon: const Icon(Icons.add), onPressed: _cs),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.warning,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.warning,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Locations'), Tab(text: 'Stock'), Tab(text: 'Transfers')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        // ── Locations ──────────────────────────────────────────
        _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.warning))
            : _locations.isEmpty
                ? EmptyState(icon: Icons.warehouse_outlined, message: 'No locations', subtitle: 'Add warehouse locations to manage stock')
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                    itemCount: _locations.length,
                    itemBuilder: (_, i) {
                      final loc = _locations[i] as Map<String, dynamic>;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: AppColors.cardLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: ListTile(
                          leading: Container(
                            width: 40, height: 40,
                            decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                            child: const Icon(Icons.warehouse, size: 20, color: AppColors.warning),
                          ),
                          title: Text(loc['name'] as String? ?? 'Location', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          subtitle: Text(loc['address'] as String? ?? loc['city'] as String? ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
                          trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Text('${loc['totalSKUs'] ?? loc['skuCount'] ?? 0} SKUs', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.warning)),
                            Text('${loc['totalQty'] ?? 0} units', style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                          ]),
                        ),
                      );
                    },
                  ),

        // ── Stock ──────────────────────────────────────────────
        _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.warning))
            : _stock.isEmpty
                ? EmptyState(icon: Icons.inventory_2_outlined, message: 'No stock records', subtitle: 'Stock levels will appear here')
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                    itemCount: _stock.length,
                    itemBuilder: (_, i) {
                      final s = _stock[i] as Map<String, dynamic>;
                      final qty = (s['quantity'] as num? ?? 0).toInt();
                      final min = (s['minStock'] as num? ?? 0).toInt();
                      final low = qty <= min;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: AppColors.cardLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: low ? AppColors.danger.withOpacity(0.3) : AppColors.border),
                        ),
                        child: ListTile(
                          title: Text(s['productName'] as String? ?? 'Product', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          subtitle: Text(s['locationName'] as String? ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                          trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Text('$qty', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: low ? AppColors.danger : AppColors.success)),
                            Text('units', style: const TextStyle(fontSize: 9, color: AppColors.textGhost)),
                            if (low) const Text('LOW STOCK', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: AppColors.danger)),
                          ]),
                        ),
                      );
                    },
                  ),

        // ── Transfers ─────────────────────────────────────────
        EmptyState(icon: Icons.swap_horiz_outlined, message: 'Stock Transfers', subtitle: 'Transfer stock between locations'),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _cs,
        backgroundColor: AppColors.warning,
        icon: const Icon(Icons.add_location_outlined, color: Colors.white),
        label: const Text('Add Location', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
