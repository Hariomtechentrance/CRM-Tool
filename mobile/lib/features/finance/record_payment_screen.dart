import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _methods = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD', 'OTHER'];
final _dateFmt = DateFormat('dd/MM/yyyy');

class RecordPaymentScreen extends StatefulWidget {
  final Map<String, dynamic> extra;
  const RecordPaymentScreen({super.key, required this.extra});

  @override
  State<RecordPaymentScreen> createState() => _RecordPaymentScreenState();
}

class _RecordPaymentScreenState extends State<RecordPaymentScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _amtCtrl   = TextEditingController();
  final _refCtrl   = TextEditingController();
  final _notesCtrl = TextEditingController();

  String   _method      = 'CASH';
  DateTime _payDate     = DateTime.now();
  bool     _loading     = false;

  String get _invoiceId     => widget.extra['invoiceId'] as String;
  String get _invoiceNumber => widget.extra['invoiceNumber'] as String? ?? '#';
  double get _balance       => (widget.extra['balance'] as num? ?? 0).toDouble();

  @override
  void initState() {
    super.initState();
    _amtCtrl.text = _balance.toStringAsFixed(2);
  }

  @override
  void dispose() { _amtCtrl.dispose(); _refCtrl.dispose(); _notesCtrl.dispose(); super.dispose(); }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _payDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) setState(() => _payDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final amt = double.tryParse(_amtCtrl.text.trim()) ?? 0;
    if (amt <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Amount must be greater than 0'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiClient().createPayment({
        'invoiceId':   _invoiceId,
        'amount':      amt,
        'method':      _method,
        'paymentDate': _payDate.toIso8601String(),
        if (_refCtrl.text.trim().isNotEmpty)   'reference': _refCtrl.text.trim(),
        if (_notesCtrl.text.trim().isNotEmpty) 'notes':     _notesCtrl.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Payment of ₹${amt.toStringAsFixed(2)} recorded'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to record payment'),
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
      appBar: AppBar(title: Text('Record Payment – $_invoiceNumber')),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // ── Balance card ──────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Balance Due', style: TextStyle(fontSize: 11, color: AppColors.textGhost)),
                  Text('₹${_balance.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.success)),
                ]),
                const Icon(Icons.account_balance_wallet_outlined, size: 36, color: AppColors.success),
              ]),
            ),
            const SizedBox(height: 20),

            // ── Amount ────────────────────────────────────────
            TextFormField(
              controller: _amtCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Amount ₹ *',
                prefixIcon: Icon(Icons.currency_rupee, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Amount required';
                final amt = double.tryParse(v.trim());
                if (amt == null || amt <= 0) return 'Enter a valid amount';
                if (amt > _balance + 0.01) return 'Amount exceeds balance due (₹${_balance.toStringAsFixed(2)})';
                return null;
              },
            ),
            const SizedBox(height: 14),

            // ── Payment Method ─────────────────────────────────
            const Text('Payment Method', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _methods.map((m) {
                final sel = _method == m;
                return GestureDetector(
                  onTap: () => setState(() => _method = m),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: sel ? AppColors.primary.withValues(alpha: 0.1) : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: sel ? AppColors.primary : AppColors.border),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(_methodIcon(m), size: 14, color: sel ? AppColors.primary : AppColors.textGhost),
                      const SizedBox(width: 6),
                      Text(_fmtEnum(m), style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600,
                        color: sel ? AppColors.primary : AppColors.textGhost,
                      )),
                    ]),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // ── Payment Date ──────────────────────────────────
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.bgLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.textGhost),
                  const SizedBox(width: 12),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Payment Date', style: TextStyle(fontSize: 10, color: AppColors.textGhost)),
                    Text(_dateFmt.format(_payDate),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  ]),
                ]),
              ),
            ),
            const SizedBox(height: 14),

            // ── Reference / Transaction ID ─────────────────────
            TextFormField(
              controller: _refCtrl,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Reference / Transaction ID (optional)',
                prefixIcon: Icon(Icons.tag_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _notesCtrl,
              maxLines: 3,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 28),

            FCButton(
              label: 'Record Payment',
              loading: _loading,
              onPressed: _submit,
              color: AppColors.success,
              icon: Icons.payment,
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  IconData _methodIcon(String m) {
    switch (m) {
      case 'CASH':          return Icons.money;
      case 'BANK_TRANSFER': return Icons.account_balance_outlined;
      case 'CHEQUE':        return Icons.book_outlined;
      case 'UPI':           return Icons.smartphone_outlined;
      case 'CARD':          return Icons.credit_card_outlined;
      default:              return Icons.more_horiz;
    }
  }

  String _fmtEnum(String e) => e.split('_').map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase()).join(' ');
}
