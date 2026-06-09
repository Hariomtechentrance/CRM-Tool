import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

class StockAdjustmentScreen extends StatefulWidget {
  final Map<String, dynamic> product;
  const StockAdjustmentScreen({super.key, required this.product});

  @override
  State<StockAdjustmentScreen> createState() => _StockAdjustmentScreenState();
}

class _StockAdjustmentScreenState extends State<StockAdjustmentScreen> {
  final _qtyCtrl    = TextEditingController();
  final _reasonCtrl = TextEditingController();
  String _type      = 'IN';
  bool _loading     = false;

  @override
  void initState() {
    super.initState();
    // Support pre-selecting adjustment type when navigated from product detail
    final preType = widget.product['_adjustType'] as String?;
    if (preType == 'IN' || preType == 'OUT') _type = preType!;
  }

  @override
  void dispose() { _qtyCtrl.dispose(); _reasonCtrl.dispose(); super.dispose(); }

  int get _currentStock => (widget.product['currentStock'] ?? widget.product['stock'] ?? 0) as int;
  String get _unit => widget.product['unit'] ?? 'PCS';

  Future<void> _submit() async {
    final qty = int.tryParse(_qtyCtrl.text.trim());
    if (qty == null || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Enter a valid quantity'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    if (_type == 'OUT' && qty > _currentStock) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Cannot remove more than current stock ($_currentStock $_unit)'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiClient().adjustStock(widget.product['id'], qty, _type, _reasonCtrl.text.trim().isEmpty ? null : _reasonCtrl.text.trim());
      if (!mounted) return;
      final newStock = _type == 'IN' ? _currentStock + qty : _currentStock - qty;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Stock updated → $newStock $_unit'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to adjust stock'), backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final previewQty = int.tryParse(_qtyCtrl.text) ?? 0;
    final newStock   = _type == 'IN' ? _currentStock + previewQty : _currentStock - previewQty;
    final isValid    = previewQty > 0 && (_type == 'IN' || previewQty <= _currentStock);

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(title: Text('Stock Adjustment – ${widget.product['name']}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          // ── Current Stock card ───────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Current Stock', style: TextStyle(fontSize: 12, color: AppColors.textGhost)),
                const SizedBox(height: 4),
                Text('$_currentStock $_unit',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
              ])),
              if (isValid) Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                const Text('After Adjustment', style: TextStyle(fontSize: 11, color: AppColors.textGhost)),
                const SizedBox(height: 4),
                Text('$newStock $_unit',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700,
                    color: _type == 'IN' ? AppColors.success : AppColors.danger)),
              ]),
            ]),
          ),
          const SizedBox(height: 20),

          // ── IN / OUT selector ────────────────────────────
          const Text('Adjustment Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _typeBtn('IN', 'Stock In', Icons.add_circle_outline, AppColors.success)),
            const SizedBox(width: 12),
            Expanded(child: _typeBtn('OUT', 'Stock Out', Icons.remove_circle_outline, AppColors.danger)),
          ]),
          const SizedBox(height: 20),

          // ── Quantity ─────────────────────────────────────
          TextFormField(
            controller: _qtyCtrl,
            keyboardType: TextInputType.number,
            textInputAction: TextInputAction.next,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              labelText: 'Quantity ($_unit) *',
              prefixIcon: const Icon(Icons.exposure_outlined, size: 18, color: AppColors.textGhost),
            ),
          ),
          const SizedBox(height: 14),

          // ── Reason ───────────────────────────────────────
          TextFormField(
            controller: _reasonCtrl,
            maxLines: 3,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(
              labelText: 'Reason / Notes (optional)',
              prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 28),

          FCButton(
            label: _type == 'IN' ? 'Add Stock' : 'Remove Stock',
            loading: _loading,
            onPressed: _submit,
            color: _type == 'IN' ? AppColors.success : AppColors.danger,
            icon: _type == 'IN' ? Icons.add : Icons.remove,
          ),
        ]),
      ),
    );
  }

  Widget _typeBtn(String value, String label, IconData icon, Color color) {
    final sel = _type == value;
    return GestureDetector(
      onTap: () => setState(() => _type = value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: sel ? color.withValues(alpha: 0.1) : AppColors.cardLight,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: sel ? color : AppColors.border, width: sel ? 2 : 1),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 18, color: sel ? color : AppColors.textGhost),
          const SizedBox(width: 8),
          Text(label, style: TextStyle(
            fontSize: 13, fontWeight: FontWeight.w700,
            color: sel ? color : AppColors.textGhost,
          )),
        ]),
      ),
    );
  }
}
