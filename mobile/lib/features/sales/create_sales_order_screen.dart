import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

final _soFmt = DateFormat('dd/MM/yyyy');

class _SOItem {
  final descCtrl  = TextEditingController();
  final qtyCtrl   = TextEditingController(text: '1');
  final priceCtrl = TextEditingController();
  double get qty   => double.tryParse(qtyCtrl.text)   ?? 0;
  double get price => double.tryParse(priceCtrl.text) ?? 0;
  double get total => qty * price;
  void dispose() { descCtrl.dispose(); qtyCtrl.dispose(); priceCtrl.dispose(); }
}

class CreateSalesOrderScreen extends StatefulWidget {
  const CreateSalesOrderScreen({super.key});

  @override
  State<CreateSalesOrderScreen> createState() => _CreateSalesOrderScreenState();
}

class _CreateSalesOrderScreenState extends State<CreateSalesOrderScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _notesCtrl  = TextEditingController();

  DateTime _orderDate = DateTime.now();
  DateTime? _deliveryDate;
  Map<String, dynamic>? _selectedCustomer;
  List<Map<String, dynamic>> _customers = [];
  final List<_SOItem> _items = [_SOItem()];
  bool _loading      = false;
  bool _loadCustomers = true;

  @override
  void initState() { super.initState(); _loadCustomerList(); }

  Future<void> _loadCustomerList() async {
    try {
      final res  = await ApiClient().getParties(type: 'CUSTOMER');
      final list = (res.data['data'] as List?) ?? [];
      if (!mounted) return;
      setState(() { _customers = list.cast<Map<String, dynamic>>(); _loadCustomers = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadCustomers = false);
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
      initialDate: isDelivery ? (_deliveryDate ?? DateTime.now().add(const Duration(days: 3))) : _orderDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked == null) return;
    if (!mounted) return;
    setState(() => isDelivery ? _deliveryDate = picked : _orderDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCustomer == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please select a customer'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiClient().createSalesOrder({
        'customerId': _selectedCustomer!['id'],
        'orderDate':  _orderDate.toIso8601String(),
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
        content: Text('Sales order created'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to create sales order'),
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
        title: const Text('New Sales Order'),
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

            // ── Customer picker ───────────────────────────────
            GestureDetector(
              onTap: _loadCustomers ? null : _showPicker,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.bgLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _selectedCustomer == null ? AppColors.border : AppColors.success),
                ),
                child: Row(children: [
                  const Icon(Icons.person_outline, size: 18, color: AppColors.textGhost),
                  const SizedBox(width: 12),
                  Expanded(child: Text(
                    _selectedCustomer == null
                        ? (_loadCustomers ? 'Loading customers...' : 'Select Customer *')
                        : (_selectedCustomer!['name'] ?? ''),
                    style: TextStyle(
                      fontSize: 13,
                      color: _selectedCustomer == null ? AppColors.textGhost : AppColors.textPrimary,
                      fontWeight: _selectedCustomer == null ? FontWeight.normal : FontWeight.w600,
                    ),
                  )),
                  const Icon(Icons.keyboard_arrow_down, size: 18, color: AppColors.textGhost),
                ]),
              ),
            ),
            const SizedBox(height: 14),

            Row(children: [
              Expanded(child: _dateTile('Order Date', _orderDate, () => _pickDate(false))),
              const SizedBox(width: 12),
              Expanded(child: _dateTile('Delivery Date (opt)', _deliveryDate, () => _pickDate(true))),
            ]),
            const SizedBox(height: 20),

            // ── Items ─────────────────────────────────────────
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Items', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              TextButton.icon(
                onPressed: () => setState(() => _items.add(_SOItem())),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add Item', style: TextStyle(fontSize: 12)),
              ),
            ]),
            ..._items.asMap().entries.map((e) => _itemRow(e.key, e.value)),
            const SizedBox(height: 12),

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
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.success)),
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
              label: 'Create Sales Order',
              loading: _loading,
              onPressed: _submit,
              color: AppColors.success,
              icon: Icons.shopping_bag_outlined,
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _itemRow(int index, _SOItem item) => Container(
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
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.success)),
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
          Text(date == null ? 'Select' : _soFmt.format(date),
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
    builder: (_) => _CustomerPicker(customers: _customers, onSelected: (c) {
      setState(() => _selectedCustomer = c);
      Navigator.pop(context);
    }),
  );
}

class _CustomerPicker extends StatefulWidget {
  final List<Map<String, dynamic>> customers;
  final void Function(Map<String, dynamic>) onSelected;
  const _CustomerPicker({required this.customers, required this.onSelected});

  @override
  State<_CustomerPicker> createState() => _CustomerPickerState();
}

class _CustomerPickerState extends State<_CustomerPicker> {
  final _search = TextEditingController();
  List<Map<String, dynamic>> _filtered = [];

  @override
  void initState() {
    super.initState();
    _filtered = widget.customers;
    _search.addListener(() {
      final q = _search.text.toLowerCase();
      setState(() => _filtered = q.isEmpty
          ? widget.customers
          : widget.customers.where((c) => (c['name'] ?? '').toLowerCase().contains(q)).toList());
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
          decoration: const InputDecoration(hintText: 'Search customers...', isDense: true, prefixIcon: Icon(Icons.search, size: 18)),
        ),
      ),
      const SizedBox(height: 8),
      Expanded(child: ListView.builder(
        controller: ctrl,
        itemCount: _filtered.length,
        itemBuilder: (_, i) {
          final c = _filtered[i];
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.success.withValues(alpha: 0.1),
              child: Text((c['name'] ?? '?')[0].toUpperCase(),
                style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w700)),
            ),
            title: Text(c['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text(c['type'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
            onTap: () => widget.onSelected(c),
          );
        },
      )),
    ]),
  );
}
