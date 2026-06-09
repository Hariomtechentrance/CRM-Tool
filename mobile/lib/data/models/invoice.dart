import 'package:flutter/material.dart';

class Invoice {
  final String id;
  final String number;
  final String partyName;
  final String type; // SALE, PURCHASE
  final String status; // DRAFT, SENT, PAID, OVERDUE, CANCELLED
  final double totalAmount;
  final double paidAmount;
  final DateTime invoiceDate;
  final DateTime? dueDate;

  const Invoice({
    required this.id,
    required this.number,
    required this.partyName,
    required this.type,
    required this.status,
    required this.totalAmount,
    required this.paidAmount,
    required this.invoiceDate,
    this.dueDate,
  });

  double get balance => totalAmount - paidAmount;

  factory Invoice.fromJson(Map<String, dynamic> j) => Invoice(
    id:          j['id'] as String,
    number:      j['invoiceNumber'] as String? ?? j['number'] as String? ?? '',
    partyName:   j['party']?['name'] as String? ?? j['partyName'] as String? ?? '',
    type:        j['type'] as String? ?? 'SALE',
    status:      j['status'] as String? ?? 'DRAFT',
    totalAmount: (j['totalAmount'] as num? ?? j['total'] as num? ?? 0).toDouble(),
    paidAmount:  (j['paidAmount'] as num? ?? 0).toDouble(),
    invoiceDate: DateTime.tryParse(j['invoiceDate'] as String? ?? j['date'] as String? ?? '') ?? DateTime.now(),
    dueDate:     j['dueDate'] != null ? DateTime.tryParse(j['dueDate'] as String) : null,
  );

  static Color statusColor(String status) {
    switch (status) {
      case 'PAID':      return const Color(0xFF10B981);
      case 'SENT':      return const Color(0xFF6366F1);
      case 'OVERDUE':   return const Color(0xFFEF4444);
      case 'DRAFT':     return const Color(0xFF94A3B8);
      case 'CANCELLED': return const Color(0xFF475569);
      default:          return const Color(0xFF94A3B8);
    }
  }
}
