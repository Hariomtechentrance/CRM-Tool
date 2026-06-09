import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _invoiceTypes = ['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'];
const _taxRates     = [0.0, 5.0, 12.0, 18.0, 28.0];
final _fmt = DateFormat('dd/MM/yyyy');

class _LineItem {
  final descCtrl  = TextEditingController();
  final qtyCtrl   = TextEditingController(text: '1');
  final priceCtrl = TextEditingController();
  double taxRate  = 18.0;
  double discount = 0.0;

  double get qty   => double.tryParse(qtyCtrl.text)   ?? 0;
  double get price => double.tryParse(priceCtrl.text) ?? 0;
  double get subtotal  => qty * price;
  double get taxAmt    => subtotal * taxRate / 100;
  double get discAmt   => subtotal * discount / 100;
  double get total     => subtotal + taxAmt - discAmt;

  void dispose() { descCtrl.dispose(); qtyCtrl.dispose(); priceCtrl.dispose(); }
}

class CreateInvoiceScreen extends StatefulWidget {
  final String? invoiceType;
  const CreateInvoiceScreen({super.key, this.invoiceType});

  @override
  State<CreateInvoiceScreen> createState() => _CreateInvoiceScreenState();
}

class _CreateInvoiceScreenState extends State<CreateInvoiceScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _notesCtrl  = TextEditingController();
  final _termsCtrl  = TextEditingController();

  String _type         = 'SALES';
  DateTime _invoiceDate = DateTime.now();
  DateTime? _dueDate;
  Map<String, dynamic>? _selectedParty;
  List<Map<String, dynamic>> _parties = [];
  final List<_LineItem> _items = [_LineItem()];
  bool _loading    = false;
  bool _loadParties = true;

  @override
  void initState() {
    super.initState();
    _type = widget.invoiceType ?? 'SALES';
    _loadPartyList();
  }

  Future<void> _loadPartyList() async {
    try {
      final res = await ApiClient().getParties(page: 1);
      final list = (res.data['data'] as List?) ?? [];
      if (!mounted) return;
      setState(() { _parties = list.cast<Map<String, dynamic>>(); _loadParties = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadParties = false);
    }
  }

  @override
  void dispose() {
    _notesCtrl.dispose(); _termsCtrl.dispose();
    for (final i in _items) i.dispose();
    super.dispose();
  }

  double get _subtotal   => _items.fold(0, (s, i) => s + i.subtotal);
  double get _totalTax   => _items.fold(0, (s, i) => s + i.taxAmt);
  double get _totalDisc  => _items.fold(0, (s, i) => s + i.discAmt);
  double get _grandTotal => _items.fold(0, (s, i) => s + i.total);

  Future<void> _pickDate(bool isDue) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isDue ? (_dueDate ?? DateTime.now().add(const Duration(days: 30))) : _invoiceDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked == null) return;
    if (!mounted) return;
    setState(() { isDue ? _dueDate = picked : _invoiceDate = picked; });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedParty == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please select a party'), backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    if (_items.any((i) => i.descCtrl.text.trim().isEmpty || i.priceCtrl.text.trim().isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Fill in all item descriptions and prices'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiClient().createInvoice({
        'type':        _type,
        'partyId':     _selectedParty!['id'],
        'invoiceDate': _invoiceDate.toIso8601String(),
        if (_dueDate != null) 'dueDate': _dueDate!.toIso8601String(),
        'items': _items.map((i) => {
          'description': i.descCtrl.text.trim(),
          'quantity':    i.qty,
          'unitPrice':   i.price,
          'taxRate':     i.taxRate,
          'discount':    i.discount,
        }).toList(),
        if (_notesCtrl.text.trim().isNotEmpty) 'notes': _notesCtrl.text.trim(),
        if (_termsCtrl.text.trim().isNotEmpty) 'terms': _termsCtrl.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Invoice created'), backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to create invoice'), backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
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
        title: const Text('New Invoice'),
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
            // ── Invoice Type ─────────────────────────────────
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _invoiceTypes.map((t) {
                final sel = _type == t;
                return GestureDetector(
                  onTap: () => setState(() => _type = t),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: sel ? AppColors.primary : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: sel ? AppColors.primary : AppColors.border),
                    ),
                    child: Text(_fmtEnum(t), style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600,
                      color: sel ? Colors.white : AppColors.textGhost,
                    )),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // ── Party picker ──────────────────────────────────
            GestureDetector(
              onTap: _loadParties ? null : _showPartyPicker,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.bgLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _selectedParty == null ? AppColors.border : AppColors.primary),
                ),
                child: Row(children: [
                  const Icon(Icons.person_outline, size: 18, color: AppColors.textGhost),
                  const SizedBox(width: 12),
                  Expanded(child: Text(
                    _selectedParty == null
                      ? (_loadParties ? 'Loading parties...' : 'Select Party / Customer *')
                      : (_selectedParty!['name'] ?? ''),
                    style: TextStyle(
                      fontSize: 13,
                      color: _selectedParty == null ? AppColors.textGhost : AppColors.textPrimary,
                      fontWeight: _selectedParty == null ? FontWeight.normal : FontWeight.w600,
                    ),
                  )),
                  const Icon(Icons.keyboard_arrow_down, size: 18, color: AppColors.textGhost),
                ]),
              ),
            ),
            const SizedBox(height: 14),

            // ── Dates ─────────────────────────────────────────
            Row(children: [
              Expanded(child: _dateTile('Invoice Date', _invoiceDate, () => _pickDate(false))),
              const SizedBox(width: 12),
              Expanded(child: _dateTile(_dueDate == null ? 'Due Date (opt)' : 'Due Date', _dueDate, () => _pickDate(true))),
            ]),
            const SizedBox(height: 20),

            // ── Line Items ────────────────────────────────────
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Items', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              TextButton.icon(
                onPressed: () => setState(() => _items.add(_LineItem())),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add Item', style: TextStyle(fontSize: 12)),
              ),
            ]),
            ..._items.asMap().entries.map((e) => _buildItemRow(e.key, e.value)),
            const SizedBox(height: 16),

            // ── Totals ────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(children: [
                _totalRow('Subtotal',  '₹${_subtotal.toStringAsFixed(2)}',  AppColors.textSec),
                const SizedBox(height: 6),
                _totalRow('Tax',       '₹${_totalTax.toStringAsFixed(2)}',  AppColors.textSec),
                if (_totalDisc > 0) ...[
                  const SizedBox(height: 6),
                  _totalRow('Discount', '-₹${_totalDisc.toStringAsFixed(2)}', AppColors.danger),
                ],
                const Divider(height: 16, color: AppColors.border),
                _totalRow('Total', '₹${_grandTotal.toStringAsFixed(2)}', AppColors.textPrimary, bold: true),
              ]),
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _notesCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _termsCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Terms & Conditions (optional)',
                prefixIcon: Icon(Icons.gavel_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 28),

            FCButton(label: 'Create Invoice', loading: _loading, onPressed: _submit, icon: Icons.receipt_long_outlined),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _buildItemRow(int index, _LineItem item) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.cardLight, borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Text('Item ${index + 1}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSec)),
        const Spacer(),
        if (_items.length > 1) GestureDetector(
          onTap: () => setState(() { item.dispose(); _items.removeAt(index); }),
          child: const Icon(Icons.close, size: 16, color: AppColors.textGhost),
        ),
      ]),
      const SizedBox(height: 10),
      TextFormField(
        controller: item.descCtrl,
        textInputAction: TextInputAction.next,
        decoration: const InputDecoration(labelText: 'Description *', isDense: true),
        onChanged: (_) => setState(() {}),
      ),
      const SizedBox(height: 10),
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
        Expanded(child: DropdownButtonFormField<double>(
          value: item.taxRate,
          decoration: const InputDecoration(labelText: 'GST %', isDense: true),
          items: _taxRates.map((r) => DropdownMenuItem(
            value: r, child: Text('${r.toInt()}%', style: const TextStyle(fontSize: 12)),
          )).toList(),
          onChanged: (v) => setState(() => item.taxRate = v!),
        )),
      ]),
      const SizedBox(height: 8),
      Align(
        alignment: Alignment.centerRight,
        child: Text('Total: ₹${item.total.toStringAsFixed(2)}',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
      ),
    ]),
  );

  Widget _dateTile(String label, DateTime? date, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
      decoration: BoxDecoration(
        color: AppColors.bgLight, borderRadius: BorderRadius.circular(10),
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

  Widget _totalRow(String label, String value, Color color, {bool bold = false}) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(label, style: TextStyle(fontSize: 13, color: AppColors.textSec, fontWeight: bold ? FontWeight.w700 : FontWeight.normal)),
      Text(value, style: TextStyle(fontSize: bold ? 16 : 13, color: color, fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
    ],
  );

  void _showPartyPicker() => showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _PartyPicker(parties: _parties, onSelected: (p) {
      setState(() => _selectedParty = p);
      Navigator.pop(context);
    }),
  );

  String _fmtEnum(String e) => e.split('_').map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase()).join(' ');
}

class _PartyPicker extends StatefulWidget {
  final List<Map<String, dynamic>> parties;
  final void Function(Map<String, dynamic>) onSelected;
  const _PartyPicker({required this.parties, required this.onSelected});

  @override
  State<_PartyPicker> createState() => _PartyPickerState();
}

class _PartyPickerState extends State<_PartyPicker> {
  final _search = TextEditingController();
  List<Map<String, dynamic>> _filtered = [];

  @override
  void initState() {
    super.initState();
    _filtered = widget.parties;
    _search.addListener(() {
      final q = _search.text.toLowerCase();
      setState(() => _filtered = q.isEmpty
        ? widget.parties
        : widget.parties.where((p) => (p['name'] ?? '').toLowerCase().contains(q)).toList());
    });
  }

  @override
  void dispose() { _search.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.7,
    maxChildSize: 0.9,
    builder: (_, ctrl) => Column(children: [
      const SizedBox(height: 12),
      Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
      const SizedBox(height: 12),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: TextField(
          controller: _search,
          decoration: const InputDecoration(
            hintText: 'Search parties...', isDense: true,
            prefixIcon: Icon(Icons.search, size: 18),
          ),
        ),
      ),
      const SizedBox(height: 8),
      Expanded(child: ListView.builder(
        controller: ctrl,
        itemCount: _filtered.length,
        itemBuilder: (_, i) {
          final p = _filtered[i];
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: Text((p['name'] ?? '?')[0].toUpperCase(),
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
            ),
            title: Text(p['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text(p['type'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
            onTap: () => widget.onSelected(p),
          );
        },
      )),
    ]),
  );
}
