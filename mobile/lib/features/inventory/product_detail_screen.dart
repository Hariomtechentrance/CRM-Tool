import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const ProductDetailScreen({super.key, required this.id});
  @override
  ConsumerState<ProductDetailScreen> createState() => _State();
}

class _State extends ConsumerState<ProductDetailScreen> {
  Map<String, dynamic>? _product;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/inventory/products/${widget.id}');
      if (!mounted) return;
      setState(() => _product = res.data['data'] as Map<String, dynamic>?);
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    if (_product == null) return Scaffold(appBar: AppBar(title: const Text('Product')), body: const Center(child: Text('Product not found')));

    final stock    = (_product!['currentStock'] as num? ?? _product!['quantity'] as num? ?? 0).toInt();
    final minStock = (_product!['minStock'] as num? ?? 0).toInt();
    final lowStock = stock <= minStock;
    final price    = (_product!['sellingPrice'] as num? ?? _product!['price'] as num? ?? 0).toDouble();
    final cost     = (_product!['costPrice'] as num? ?? 0).toDouble();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(_product!['name'] as String? ?? 'Product'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Edit Product',
            onPressed: () async {
              final result = await context.push<bool>('/inventory/edit', extra: _product);
              if (result == true) _load();
            },
          ),
          IconButton(icon: const Icon(Icons.qr_code_outlined), onPressed: _cs),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // ── Stock header ─────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: lowStock ? AppColors.danger.withOpacity(0.08) : AppColors.success.withOpacity(0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: lowStock ? AppColors.danger.withOpacity(0.3) : AppColors.success.withOpacity(0.3)),
          ),
          child: Row(children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(
                color: (lowStock ? AppColors.danger : AppColors.success).withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(Icons.inventory_2, size: 28, color: lowStock ? AppColors.danger : AppColors.success),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_product!['name'] as String? ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              Text(_product!['sku'] as String? ?? _product!['code'] as String? ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
              Text(_product!['category'] as String? ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textSec)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('$stock', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: lowStock ? AppColors.danger : AppColors.success)),
              Text('units', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
              if (lowStock) const Text('LOW STOCK', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.danger)),
            ]),
          ]),
        ),
        const SizedBox(height: 16),

        // ── Pricing ──────────────────────────────────────────
        _card('Pricing', [
          _row('Selling Price', '₹${price.toStringAsFixed(2)}', AppColors.success),
          if (cost > 0) _row('Cost Price', '₹${cost.toStringAsFixed(2)}', AppColors.textSec),
          if (cost > 0) _row('Margin', '${(((price - cost) / price) * 100).toStringAsFixed(1)}%', AppColors.primary),
          _row('Tax Rate', '${_product!['taxRate'] ?? 0}% GST', AppColors.info),
        ]),
        const SizedBox(height: 12),

        // ── Stock info ────────────────────────────────────────
        _card('Stock Details', [
          _row('Current Stock', '$stock units', lowStock ? AppColors.danger : AppColors.success),
          _row('Min Stock',     '$minStock units', AppColors.warning),
          _row('Max Stock',     '${_product!['maxStock'] ?? '—'} units', AppColors.info),
          _row('Reorder Level', '${_product!['reorderLevel'] ?? minStock} units', AppColors.secondary),
        ]),
        const SizedBox(height: 12),

        // ── Actions ───────────────────────────────────────────
        Row(children: [
          Expanded(child: ElevatedButton.icon(
            onPressed: () async {
              final result = await context.push<bool>(
                '/inventory/adjust',
                extra: {..._product!, '_adjustType': 'IN'},
              );
              if (result == true) _load();
            },
            icon: const Icon(Icons.add, size: 16),
            label: const Text('Stock In', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success.withOpacity(0.1), foregroundColor: AppColors.success,
              elevation: 0, side: const BorderSide(color: AppColors.success), minimumSize: const Size(0, 42),
            ),
          )),
          const SizedBox(width: 8),
          Expanded(child: ElevatedButton.icon(
            onPressed: () async {
              final result = await context.push<bool>(
                '/inventory/adjust',
                extra: {..._product!, '_adjustType': 'OUT'},
              );
              if (result == true) _load();
            },
            icon: const Icon(Icons.remove, size: 16),
            label: const Text('Stock Out', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger.withOpacity(0.1), foregroundColor: AppColors.danger,
              elevation: 0, side: const BorderSide(color: AppColors.danger), minimumSize: const Size(0, 42),
            ),
          )),
          const SizedBox(width: 8),
          Expanded(child: ElevatedButton.icon(
            onPressed: _cs,
            icon: const Icon(Icons.history, size: 16),
            label: const Text('History', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary.withOpacity(0.1), foregroundColor: AppColors.primary,
              elevation: 0, side: const BorderSide(color: AppColors.primary), minimumSize: const Size(0, 42),
            ),
          )),
        ]),
      ]),
    );
  }

  Widget _card(String title, List<Widget> rows) => Container(
    decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
        child: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSec)),
      ),
      const Divider(height: 1, color: AppColors.border),
      ...rows,
    ]),
  );

  Widget _row(String label, String value, Color c) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    child: Row(children: [
      Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSec)),
      const Spacer(),
      Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c)),
    ]),
  );
}
