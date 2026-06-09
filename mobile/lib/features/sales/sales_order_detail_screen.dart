import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

final _salesOrderProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await ApiClient().getSalesOrderDetail(id);
  return res.data['data'] as Map<String, dynamic>? ?? {};
});

class SalesOrderDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const SalesOrderDetailScreen({super.key, required this.id});

  @override
  ConsumerState<SalesOrderDetailScreen> createState() => _SalesOrderDetailScreenState();
}

class _SalesOrderDetailScreenState extends ConsumerState<SalesOrderDetailScreen> {
  final _fmt = NumberFormat('#,##,###.##', 'en_IN');

  Future<void> _updateStatus(Map<String, dynamic> order, String newStatus) async {
    try {
      await ApiClient().updateSalesOrder(order['id'] as String, {'status': newStatus});
      ref.invalidate(_salesOrderProvider(widget.id));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Status updated to $newStatus'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to update status'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    }
  }

  Color _statusColor(String? s) {
    switch (s) {
      case 'PENDING':   return AppColors.warning;
      case 'CONFIRMED': return AppColors.info;
      case 'SHIPPED':   return AppColors.secondary;
      case 'DELIVERED': return AppColors.success;
      case 'CANCELLED': return AppColors.danger;
      default:          return AppColors.textGhost;
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(_salesOrderProvider(widget.id));

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: order.maybeWhen(
          data: (d) => Text(d['soNumber'] as String? ?? d['orderNumber'] as String? ?? 'Sales Order'),
          orElse: () => const Text('Sales Order'),
        ),
      ),
      body: order.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.warning)),
        error:   (e, _) => Center(child: Text('Error: $e')),
        data: (d) => _buildBody(d),
      ),
    );
  }

  Widget _buildBody(Map<String, dynamic> d) {
    final status   = d['status'] as String? ?? 'PENDING';
    final sc       = _statusColor(status);
    final customer = d['customer']?['name'] as String? ?? d['customerName'] as String? ?? 'N/A';
    final total    = (d['totalAmount'] as num? ?? 0).toDouble();
    final items    = d['items'] as List? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Header card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppColors.warning, Color(0xFFD97706)],
              begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(d['soNumber'] as String? ?? d['orderNumber'] as String? ?? '—',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                child: Text(status, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
              ),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              const Icon(Icons.person_outline, size: 14, color: Colors.white70),
              const SizedBox(width: 6),
              Text(customer, style: const TextStyle(fontSize: 13, color: Colors.white)),
            ]),
            const SizedBox(height: 6),
            Row(children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: Colors.white70),
              const SizedBox(width: 6),
              Text(d['orderDate'] ?? d['createdAt'] ?? '—',
                style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.8))),
            ]),
            const SizedBox(height: 12),
            Text('₹${_fmt.format(total)}',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
          ]),
        ),

        const SizedBox(height: 16),

        // Status progression
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.cardLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Update Status', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8,
              children: ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) {
                final c   = _statusColor(s);
                final sel = status == s;
                return GestureDetector(
                  onTap: sel ? null : () => _updateStatus(d, s),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: sel ? c : c.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: c.withOpacity(sel ? 1 : 0.3)),
                    ),
                    child: Text(s, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: sel ? Colors.white : c)),
                  ),
                );
              }).toList(),
            ),
          ]),
        ),

        const SizedBox(height: 16),

        // Order info
        _infoCard('Order Information', [
          _infoRow('Customer',    customer),
          if (d['deliveryAddress'] != null) _infoRow('Delivery Address', d['deliveryAddress'] as String),
          if (d['paymentTerms']   != null) _infoRow('Payment Terms',    d['paymentTerms'] as String),
          if (d['notes']          != null) _infoRow('Notes',            d['notes'] as String),
        ]),

        const SizedBox(height: 16),

        // Items
        if (items.isNotEmpty) ...[
          const Text('Order Items', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          ...items.map((item) {
            final it   = item as Map<String, dynamic>;
            final qty  = (it['quantity'] as num? ?? 0);
            final rate = (it['rate'] as num? ?? it['unitPrice'] as num? ?? 0).toDouble();
            final amt  = (it['amount'] as num? ?? (qty.toDouble() * rate)).toDouble();
            return Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(it['name'] as String? ?? it['productName'] as String? ?? 'Item',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  Text('Qty: $qty  •  ₹${_fmt.format(rate)}/unit',
                    style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                ])),
                Text('₹${_fmt.format(amt)}',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              ]),
            );
          }),
          const SizedBox(height: 8),
        ],

        // Totals
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.cardLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(children: [
            if (d['taxAmount'] != null) ...[
              _totRow('Subtotal', '₹${_fmt.format(d['subtotal'] ?? total)}'),
              _totRow('Tax',      '₹${_fmt.format(d['taxAmount'])}', color: AppColors.info),
              const Divider(color: AppColors.border),
            ],
            _totRow('Total', '₹${_fmt.format(total)}', bold: true, fontSize: 16),
          ]),
        ),

        const SizedBox(height: 80),
      ]),
    );
  }

  Widget _infoCard(String title, List<Widget> rows) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.cardLight,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost, letterSpacing: 0.5)),
      const SizedBox(height: 10),
      ...rows,
    ]),
  );

  Widget _infoRow(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 120, child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textGhost))),
      Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
    ]),
  );

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
