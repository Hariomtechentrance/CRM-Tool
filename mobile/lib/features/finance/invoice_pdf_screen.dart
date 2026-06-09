import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

final _pdfInvoiceProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await ApiClient().getInvoiceDetail(id);
  return res.data['data'] as Map<String, dynamic>? ?? {};
});

class InvoicePdfScreen extends ConsumerWidget {
  final String id;
  const InvoicePdfScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoice = ref.watch(_pdfInvoiceProvider(id));
    final fmt = NumberFormat('#,##,###.##', 'en_IN');

    return Scaffold(
      backgroundColor: Colors.grey.shade200,
      appBar: AppBar(
        title: const Text('Invoice Preview'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            tooltip: 'Share',
            onPressed: () {
              invoice.whenData((d) {
                final text = _buildShareText(d, fmt);
                Share.share(text, subject: 'Invoice ${d['invoiceNumber'] ?? ''}');
              });
            },
          ),
        ],
      ),
      body: invoice.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error:   (e, _) => Center(child: Text('Error: $e')),
        data: (d) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: _InvoicePaper(d: d, fmt: fmt),
        ),
      ),
    );
  }

  String _buildShareText(Map<String, dynamic> d, NumberFormat fmt) {
    final lines = <String>[
      'INVOICE',
      'Invoice #: ${d['invoiceNumber'] ?? ''}',
      'Date: ${d['invoiceDate'] ?? d['createdAt'] ?? ''}',
      '',
      'To: ${d['party']?['name'] ?? d['partyName'] ?? 'N/A'}',
      '',
      'Items:',
    ];
    final items = d['items'] as List? ?? [];
    for (final item in items) {
      final m = item as Map<String, dynamic>;
      lines.add('  • ${m['name'] ?? m['productName'] ?? ''} x${m['quantity'] ?? 0} = ₹${fmt.format((m['amount'] ?? 0))}');
    }
    lines.addAll([
      '',
      'Subtotal: ₹${fmt.format(d['subtotal'] ?? d['totalAmount'] ?? 0)}',
      if (d['taxAmount'] != null) 'Tax: ₹${fmt.format(d['taxAmount'])}',
      'Total: ₹${fmt.format(d['totalAmount'] ?? 0)}',
    ]);
    return lines.join('\n');
  }
}

class _InvoicePaper extends StatelessWidget {
  final Map<String, dynamic> d;
  final NumberFormat fmt;
  const _InvoicePaper({required this.d, required this.fmt});

  @override
  Widget build(BuildContext context) {
    final items       = d['items'] as List? ?? [];
    final party       = d['party'] as Map<String, dynamic>? ?? {};
    final subtotal    = (d['subtotal']    as num? ?? d['totalAmount'] as num? ?? 0).toDouble();
    final taxAmt      = (d['taxAmount']   as num? ?? 0).toDouble();
    final discount    = (d['discount']    as num? ?? 0).toDouble();
    final total       = (d['totalAmount'] as num? ?? 0).toDouble();
    final paid        = (d['paidAmount']  as num? ?? 0).toDouble();
    final balance     = total - paid;
    final status      = d['status'] as String? ?? 'DRAFT';
    final statusColor = status == 'PAID' ? AppColors.success : status == 'OVERDUE' ? AppColors.danger : AppColors.warning;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Header gradient
        Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            gradient: AppColors.gradient,
            borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('INVOICE', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 2)),
              const SizedBox(height: 4),
              Text(d['invoiceNumber'] as String? ?? '#—',
                style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.85), fontWeight: FontWeight.w600)),
            ]),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.9),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(status, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1)),
            ),
          ]),
        ),

        Padding(
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Dates row
            Row(children: [
              Expanded(child: _labelVal('Invoice Date', d['invoiceDate'] ?? d['createdAt'] ?? '—')),
              if (d['dueDate'] != null) Expanded(child: _labelVal('Due Date', d['dueDate'] as String)),
            ]),
            const SizedBox(height: 20),
            const Divider(color: AppColors.border),
            const SizedBox(height: 16),

            // Bill to
            const Text('BILL TO', style: TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w700, letterSpacing: 1)),
            const SizedBox(height: 6),
            Text(party['name'] as String? ?? d['partyName'] as String? ?? 'N/A',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            if (party['phone'] != null) Text(party['phone'] as String,
              style: const TextStyle(fontSize: 12, color: AppColors.textSec)),
            if (party['email'] != null) Text(party['email'] as String,
              style: const TextStyle(fontSize: 12, color: AppColors.textSec)),
            if (party['gstin'] != null) Text('GSTIN: ${party['gstin']}',
              style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),

            const SizedBox(height: 20),
            const Divider(color: AppColors.border),
            const SizedBox(height: 12),

            // Items header
            Row(children: const [
              Expanded(flex: 4, child: Text('ITEM', style: TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w700, letterSpacing: 0.5))),
              Expanded(flex: 1, child: Text('QTY',  style: TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w700, letterSpacing: 0.5), textAlign: TextAlign.center)),
              Expanded(flex: 2, child: Text('RATE', style: TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w700, letterSpacing: 0.5), textAlign: TextAlign.right)),
              Expanded(flex: 2, child: Text('AMT',  style: TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w700, letterSpacing: 0.5), textAlign: TextAlign.right)),
            ]),
            const SizedBox(height: 8),
            const Divider(color: AppColors.border, height: 1),

            // Items
            ...items.asMap().entries.map((e) {
              final item = e.value as Map<String, dynamic>;
              final qty  = (item['quantity'] as num? ?? 0);
              final rate = (item['rate'] as num? ?? item['unitPrice'] as num? ?? 0).toDouble();
              final amt  = (item['amount'] as num? ?? (qty.toDouble() * rate)).toDouble();
              final isEven = e.key.isEven;
              return Container(
                color: isEven ? AppColors.bgLight : Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(children: [
                  Expanded(flex: 4, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(item['name'] as String? ?? item['productName'] as String? ?? 'Item',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    if (item['description'] != null)
                      Text(item['description'] as String, style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                    if (item['hsnCode'] != null)
                      Text('HSN: ${item['hsnCode']}', style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                  ])),
                  Expanded(flex: 1, child: Text('$qty',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSec), textAlign: TextAlign.center)),
                  Expanded(flex: 2, child: Text('₹${fmt.format(rate)}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSec), textAlign: TextAlign.right)),
                  Expanded(flex: 2, child: Text('₹${fmt.format(amt)}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary), textAlign: TextAlign.right)),
                ]),
              );
            }),

            const Divider(color: AppColors.border),
            const SizedBox(height: 8),

            // Totals
            if (subtotal != total) _totRow('Subtotal', '₹${fmt.format(subtotal)}'),
            if (taxAmt > 0)        _totRow('Tax',      '₹${fmt.format(taxAmt)}', color: AppColors.info),
            if (discount > 0)      _totRow('Discount', '−₹${fmt.format(discount)}', color: AppColors.success),
            const Divider(color: AppColors.border),
            _totRow('TOTAL', '₹${fmt.format(total)}', bold: true, fontSize: 16),

            if (paid > 0) ...[
              const SizedBox(height: 4),
              _totRow('Paid',       '₹${fmt.format(paid)}',    color: AppColors.success),
              _totRow('Balance Due','₹${fmt.format(balance)}', color: balance > 0 ? AppColors.danger : AppColors.success, bold: true),
            ],

            // Notes
            if (d['notes'] != null) ...[
              const SizedBox(height: 20),
              const Text('NOTES', style: TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w700, letterSpacing: 1)),
              const SizedBox(height: 6),
              Text(d['notes'] as String, style: const TextStyle(fontSize: 12, color: AppColors.textSec)),
            ],

            const SizedBox(height: 24),
            Center(child: Text('Thank you for your business!',
              style: TextStyle(fontSize: 12, color: AppColors.textGhost.withOpacity(0.7), fontStyle: FontStyle.italic))),
          ]),
        ),
      ]),
    );
  }

  Widget _labelVal(String label, String val) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w600)),
    const SizedBox(height: 2),
    Text(val,   style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
  ]);

  Widget _totRow(String label, String val, {Color? color, bool bold = false, double fontSize = 13}) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label, style: TextStyle(fontSize: fontSize, color: color ?? AppColors.textSec,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
          Text(val, style: TextStyle(fontSize: fontSize, color: color ?? AppColors.textPrimary,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
        ]),
      );
}
