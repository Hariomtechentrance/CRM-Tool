import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

final _dateFmt = DateFormat('dd MMM yyyy');

class InvoiceDetailScreen extends StatefulWidget {
  final String id;
  const InvoiceDetailScreen({super.key, required this.id});

  @override
  State<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends State<InvoiceDetailScreen> {
  Map<String, dynamic>? _invoice;
  List<dynamic> _payments = [];
  bool _loading = true;
  bool _actioning = false;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getInvoiceDetail(widget.id);
      final data = res.data['data'] as Map<String, dynamic>? ?? res.data as Map<String, dynamic>? ?? {};
      final payRes = await ApiClient().getPayments(invoiceId: widget.id);
      final pays = payRes.data['data'];
      if (!mounted) return;
      setState(() {
        _invoice  = data;
        _payments = (pays is List) ? pays : (pays?['payments'] as List? ?? []);
      });
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _statusColor(String? s) {
    switch (s) {
      case 'PAID':    return AppColors.success;
      case 'SENT':    return AppColors.primary;
      case 'OVERDUE': return AppColors.danger;
      case 'DRAFT':   return AppColors.textGhost;
      default:        return AppColors.textSec;
    }
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _actioning = true);
    try {
      await ApiClient().updateInvoice(widget.id, {'status': status});
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Invoice marked as ${_fmtEnum(status)}'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to update status'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _actioning = false);
    }
  }

  Future<void> _deleteInvoice() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Invoice'),
        content: const Text('This cannot be undone. Are you sure?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: AppColors.danger))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiClient().deleteInvoice(widget.id);
      if (!mounted) return;
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to delete invoice'), backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    if (_invoice == null) return Scaffold(appBar: AppBar(title: const Text('Invoice')), body: const Center(child: Text('Invoice not found')));

    final status    = _invoice!['status'] as String? ?? 'DRAFT';
    final sc        = _statusColor(status);
    final number    = _invoice!['invoiceNumber'] as String? ?? _invoice!['number'] as String? ?? '#';
    final party     = _invoice!['party']?['name'] as String? ?? _invoice!['partyName'] as String? ?? 'Unknown';
    final total     = (_invoice!['totalAmount'] as num? ?? _invoice!['total'] as num? ?? 0).toDouble();
    final paid      = (_invoice!['paidAmount'] as num? ?? 0).toDouble();
    final balance   = total - paid;
    final items     = _invoice!['items'] as List? ?? [];
    final invDate   = _invoice!['invoiceDate'] != null ? DateTime.tryParse(_invoice!['invoiceDate'] as String) : null;
    final dueDate   = _invoice!['dueDate']     != null ? DateTime.tryParse(_invoice!['dueDate']     as String) : null;

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(number),
        actions: [
          if (status == 'DRAFT') TextButton(
            onPressed: _actioning ? null : () => _updateStatus('SENT'),
            child: const Text('Send', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
          ),
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_outlined),
            tooltip: 'View PDF',
            onPressed: () => context.push('/finance/invoice/${widget.id}/pdf'),
          ),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'delete') _deleteInvoice();
              if (v == 'sent')   _updateStatus('SENT');
              if (v == 'paid')   _updateStatus('PAID');
            },
            itemBuilder: (_) => [
              if (status != 'SENT' && status != 'PAID') const PopupMenuItem(value: 'sent', child: Text('Mark as Sent')),
              if (status != 'PAID') const PopupMenuItem(value: 'paid', child: Text('Mark as Paid')),
              const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: AppColors.danger))),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          // ── Status banner ────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: sc.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: sc.withValues(alpha: 0.3)),
            ),
            child: Row(children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(color: sc.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.receipt_long, size: 24, color: sc),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(number, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                Text(party,  style: const TextStyle(fontSize: 13, color: AppColors.textSec)),
                if (invDate != null) Text(_dateFmt.format(invDate), style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: sc.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                  child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: sc)),
                ),
                const SizedBox(height: 6),
                Text('₹${total.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.textPrimary)),
              ]),
            ]),
          ),
          const SizedBox(height: 12),

          // ── Due date + balance ────────────────────────────────
          if (dueDate != null || paid > 0) Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: Row(children: [
              if (dueDate != null) Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Due Date', style: TextStyle(fontSize: 10, color: AppColors.textGhost)),
                Text(_dateFmt.format(dueDate), style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700,
                  color: dueDate.isBefore(DateTime.now()) && status != 'PAID' ? AppColors.danger : AppColors.textPrimary,
                )),
              ])),
              if (paid > 0) Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                const Text('Balance Due', style: TextStyle(fontSize: 10, color: AppColors.textGhost)),
                Text('₹${balance.toStringAsFixed(2)}', style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700,
                  color: balance <= 0 ? AppColors.success : AppColors.danger,
                )),
              ])),
            ]),
          ),
          if (dueDate != null || paid > 0) const SizedBox(height: 12),

          // ── Line items ────────────────────────────────────────
          if (items.isNotEmpty) ...[
            const Text('Items', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: Column(children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(children: const [
                    Expanded(flex: 3, child: Text('Description', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textGhost))),
                    Expanded(child: Text('Qty', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textGhost), textAlign: TextAlign.center)),
                    Expanded(child: Text('Rate', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textGhost), textAlign: TextAlign.right)),
                    Expanded(child: Text('Total', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textGhost), textAlign: TextAlign.right)),
                  ]),
                ),
                const Divider(height: 1, color: AppColors.border),
                ...items.map((item) {
                  final it    = item as Map<String, dynamic>;
                  final qty   = (it['quantity'] as num? ?? 1).toDouble();
                  final rate  = (it['unitPrice'] as num? ?? it['price'] as num? ?? 0).toDouble();
                  final itTot = (it['totalAmount'] as num? ?? qty * rate).toDouble();
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Row(children: [
                      Expanded(flex: 3, child: Text(it['description'] as String? ?? it['name'] as String? ?? '',
                        style: const TextStyle(fontSize: 12, color: AppColors.textPrimary))),
                      Expanded(child: Text('${qty.toStringAsFixed(qty % 1 == 0 ? 0 : 2)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSec), textAlign: TextAlign.center)),
                      Expanded(child: Text('₹${rate.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSec), textAlign: TextAlign.right)),
                      Expanded(child: Text('₹${itTot.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary), textAlign: TextAlign.right)),
                    ]),
                  );
                }),
                const Divider(height: 1, color: AppColors.border),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Total', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                    Text('₹${total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 16),
          ],

          // ── Notes ─────────────────────────────────────────────
          if (_invoice!['notes'] != null) ...[
            const Text('Notes', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            Container(
              width: double.infinity, padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: Text(_invoice!['notes'] as String, style: const TextStyle(fontSize: 13, color: AppColors.textSec)),
            ),
            const SizedBox(height: 16),
          ],

          // ── Payment history ───────────────────────────────────
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Payments', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            if (status != 'PAID' && balance > 0)
              TextButton.icon(
                onPressed: () async {
                  final result = await context.push<bool>('/finance/payment/create', extra: {
                    'invoiceId': widget.id,
                    'invoiceNumber': number,
                    'balance': balance,
                  });
                  if (result == true) _load();
                },
                icon: const Icon(Icons.add, size: 14),
                label: const Text('Record', style: TextStyle(fontSize: 12)),
              ),
          ]),
          const SizedBox(height: 8),
          if (_payments.isEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: const Center(child: Text('No payments recorded', style: TextStyle(fontSize: 13, color: AppColors.textGhost))),
            )
          else
            ...(_payments.map((p) {
              final pay    = p as Map<String, dynamic>;
              final amt    = (pay['amount'] as num? ?? 0).toDouble();
              final method = pay['method'] as String? ?? pay['paymentMethod'] as String? ?? 'CASH';
              final payDate= pay['paymentDate'] != null ? DateTime.tryParse(pay['paymentDate'] as String) : null;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                child: Row(children: [
                  Container(
                    width: 38, height: 38,
                    decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.payment, size: 18, color: AppColors.success),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_fmtEnum(method), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    if (payDate != null) Text(_dateFmt.format(payDate), style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                    if (pay['reference'] != null) Text('Ref: ${pay['reference']}', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                  ])),
                  Text('₹${amt.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.success)),
                ]),
              );
            })),
          const SizedBox(height: 24),

          // ── Action buttons ────────────────────────────────────
          if (status != 'PAID' && balance > 0)
            ElevatedButton.icon(
              onPressed: _actioning ? null : () async {
                final result = await context.push<bool>('/finance/payment/create', extra: {
                  'invoiceId': widget.id,
                  'invoiceNumber': number,
                  'balance': balance,
                });
                if (result == true) _load();
              },
              icon: const Icon(Icons.payment, size: 18),
              label: const Text('Record Payment', style: TextStyle(fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          const SizedBox(height: 12),
        ]),
      ),
    );
  }

  String _fmtEnum(String e) => e.split('_').map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase()).join(' ');
}
