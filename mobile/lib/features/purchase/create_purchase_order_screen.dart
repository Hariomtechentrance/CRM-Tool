import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

final _fmt = DateFormat('dd/MM/yyyy');

class _POItem {
  final descCtrl  = TextEditingController();
  final qtyCtrl   = TextEditingController(text: '1');
  final priceCtrl = TextEditingController();
  double get qty   => double.tryParse(qtyCtrl.text)   ?? 0;
  double get price => double.tryParse(priceCtrl.text) ?? 0;
  double get total => qty * price;
  void dispose() { descCtrl.dispose(); qtyCtrl.dispose(); priceCtrl.dispose(); }
}

class CreatePurchaseOrderScreen extends StatefulWidget {
  const CreatePurchaseOrderScreen({super.key});

  @override
  State<CreatePurchaseOrderScreen> createState() => _CreatePurchaseOrderScreenState();
}

class _CreatePurchaseOrderScreenState extends State<CreatePurchaseOrderScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _notesCtrl = TextEditingController();

  DateTime _orderDate = DateTime.now();
  DateTime? _deliveryDate;
  Map<String, dynamic>? _selectedVendor;
  List<Map<String, dynamic>> _vendors = [];
  final List<_POItem> _items = [_POItem()];
  bool _loading     = false;
  bool _loadVendors = true;

  @override
  void initState() { super.initState(); _loadVendorList(); }

  Future<void> _loadVendorList() async {
    try {
      final res  = await ApiClient().getParties(type: 'SUPPLIER');
      final list = (res.data['data'] as List?) ?? [];
      if (!mounted) return;
      setState(() { _vendors = list.cast<Map<String, dynamic>>(); _loadVendors = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadVendors = false);
    }
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    for (final i in _items) i.dispose();
    super.dispose();
  }

  double get _grandTotal => _items.fold(0, (s, i) => s + i.total);

  Future<void> _pickDate(bool isDelivery) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isDelivery ? (_deliveryDate ?? DateTime.now().add(const Duration(days: 7))) : _orderDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked == null) return;
    if (!mounted) return;
    setState(() => isDelivery ? _deliveryDate = picked : _orderDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedVendor == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please select a vendor'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    if (_items.any((i) => i.descCtrl.text.trim().isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Fill all item descriptions'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiClient().createPurchaseOrder({
        'vendorId':  _selectedVendor!['id'],
        'orderDate': _orderDate.toIso8601String(),
        if (_deliveryDate != null) 'expectedDelivery': _deliveryDate!.toIso8601String(),
        'items': _items.map((i) => {
          'description': i.descCtrl.text.trim(),
          'quantity':    i.qty,
          'unitPrice':   i.price,
        }).toList(),
        if (_notesCtrl.text.trim().isNotEmpty) 'notes': _notesCtrl.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Purchase order created'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to create purchase order'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('New Purchase Order'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : const Text('Save', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

            // ── Vendor picker ─────────────────────────────────
            GestureDetector(
              onTap: _loadVendors ? null : () => _showPicker(),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.bgLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _selectedVendor == null ? AppColors.border : AppColors.secondary),
                ),
                child: Row(children: [
                  const Icon(Icons.store_outlined, size: 18, color: AppColors.textGhost),
                  const SizedBox(width: 12),
                  Expanded(child: Text(
                    _selectedVendor == null
                        ? (_loadVendors ? 'Loading vendors...' : 'Select Vendor / Supplier *')
                        : (_selectedVendor!['name'] ?? ''),
                    style: TextStyle(
                      fontSize: 13,
                      color: _selectedVendor == null ? AppColors.textGhost : AppColors.textPrimary,
                      fontWeight: _selectedVendor == null ? FontWeight.normal : FontWeight.w600,
                    ),
                  )),
                  const Icon(Icons.keyboard_arrow_down, size: 18, color: AppColors.textGhost),
                ]),
              ),
            ),
            const SizedBox(height: 14),

            // ── Dates ─────────────────────────────────────────
            Row(children: [
              Expanded(child: _dateTile('Order Date', _orderDate, () => _pickDate(false))),
              const SizedBox(width: 12),
              Expanded(child: _dateTile('Delivery Date (opt)', _deliveryDate, () => _pickDate(true))),
            ]),
            const SizedBox(height: 20),

            // ── Line items ────────────────────────────────────
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Items', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              TextButton.icon(
                onPressed: () => setState(() => _items.add(_POItem())),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add Item', style: TextStyle(fontSize: 12)),
              ),
            ]),
            ..._items.asMap().entries.map((e) => _itemRow(e.key, e.value)),
            const SizedBox(height: 12),

            // ── Total ─────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Total', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                Text('₹${_grandTotal.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.secondary)),
              ]),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _notesCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 28),

            FCButton(
              label: 'Create Purchase Order',
              loading: _loading,
              onPressed: _submit,
              color: AppColors.secondary,
              icon: Icons.add_shopping_cart,
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _itemRow(int index, _POItem item) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.cardLight,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(children: [
      Row(children: [
        Text('Item ${index + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSec)),
        const Spacer(),
        if (_items.length > 1)
          GestureDetector(
            onTap: () => setState(() { item.dispose(); _items.removeAt(index); }),
            child: const Icon(Icons.close, size: 16, color: AppColors.textGhost),
          ),
      ]),
      const SizedBox(height: 8),
      TextFormField(
        controller: item.descCtrl,
        textInputAction: TextInputAction.next,
        decoration: const InputDecoration(labelText: 'Description *', isDense: true),
        onChanged: (_) => setState(() {}),
      ),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: TextFormField(
          controller: item.qtyCtrl,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(labelText: 'Qty', isDense: true),
          onChanged: (_) => setState(() {}),
        )),
        const SizedBox(width: 10),
        Expanded(child: TextFormField(
          controller: item.priceCtrl,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(labelText: 'Unit Price ₹', isDense: true),
          onChanged: (_) => setState(() {}),
        )),
        const SizedBox(width: 10),
        Text('₹${item.total.toStringAsFixed(0)}',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.secondary)),
      ]),
    ]),
  );

  Widget _dateTile(String label, DateTime? date, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
      decoration: BoxDecoration(
        color: AppColors.bgLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textGhost),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
          Text(date == null ? 'Select' : _fmt.format(date),
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
              color: date == null ? AppColors.textGhost : AppColors.textPrimary)),
        ])),
      ]),
    ),
  );

  void _showPicker() => showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _VendorPicker(vendors: _vendors, onSelected: (v) {
      setState(() => _selectedVendor = v);
      Navigator.pop(context);
    }),
  );
}

class _VendorPicker extends StatefulWidget {
  final List<Map<String, dynamic>> vendors;
  final void Function(Map<String, dynamic>) onSelected;
  const _VendorPicker({required this.vendors, required this.onSelected});

  @override
  State<_VendorPicker> createState() => _VendorPickerState();
}

class _VendorPickerState extends State<_VendorPicker> {
  final _search   = TextEditingController();
  List<Map<String, dynamic>> _filtered = [];

  @override
  void initState() {
    super.initState();
    _filtered = widget.vendors;
    _search.addListener(() {
      final q = _search.text.toLowerCase();
      setState(() => _filtered = q.isEmpty
          ? widget.vendors
          : widget.vendors.where((v) => (v['name'] ?? '').toLowerCase().contains(q)).toList());
    });
  }

  @override
  void dispose() { _search.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => DraggableScrollableSheet(
    expand: false, initialChildSize: 0.6, maxChildSize: 0.9,
    builder: (_, ctrl) => Column(children: [
      const SizedBox(height: 12),
      Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
      const SizedBox(height: 12),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: TextField(
          controller: _search,
          decoration: const InputDecoration(hintText: 'Search vendors...', isDense: true, prefixIcon: Icon(Icons.search, size: 18)),
        ),
      ),
      const SizedBox(height: 8),
      Expanded(child: ListView.builder(
        controller: ctrl,
        itemCount: _filtered.length,
        itemBuilder: (_, i) {
          final v = _filtered[i];
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.secondary.withValues(alpha: 0.1),
              child: Text((v['name'] ?? '?')[0].toUpperCase(),
                style: const TextStyle(color: AppColors.secondary, fontWeight: FontWeight.w700)),
            ),
            title: Text(v['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text(v['type'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
            onTap: () => widget.onSelected(v),
          );
        },
      )),
    ]),
  );
}
