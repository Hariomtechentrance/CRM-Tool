import 'package:flutter/material.dart';

class Lead {
  final String id;
  final String name;
  final String? company;
  final String? email;
  final String? phone;
  final String status;
  final String? source;
  final double? value;
  final String? assignedTo;
  final DateTime? followUpDate;
  final DateTime createdAt;

  const Lead({
    required this.id,
    required this.name,
    this.company,
    this.email,
    this.phone,
    required this.status,
    this.source,
    this.value,
    this.assignedTo,
    this.followUpDate,
    required this.createdAt,
  });

  factory Lead.fromJson(Map<String, dynamic> j) => Lead(
    id:           j['id'] as String,
    name:         j['name'] as String? ?? '',
    company:      j['company'] as String?,
    email:        j['email'] as String?,
    phone:        j['phone'] as String?,
    status:       j['status'] as String? ?? 'NEW',
    source:       j['source'] as String?,
    value:        (j['value'] as num?)?.toDouble(),
    assignedTo:   j['assignedTo'] as String?,
    followUpDate: j['followUpDate'] != null ? DateTime.tryParse(j['followUpDate'] as String) : null,
    createdAt:    DateTime.tryParse(j['createdAt'] as String? ?? '') ?? DateTime.now(),
  );

  static Color statusColor(String status) {
    switch (status) {
      case 'NEW':       return const Color(0xFF06B6D4);
      case 'CONTACTED': return const Color(0xFF6366F1);
      case 'QUALIFIED': return const Color(0xFFF59E0B);
      case 'PROPOSAL':  return const Color(0xFF8B5CF6);
      case 'WON':       return const Color(0xFF10B981);
      case 'LOST':      return const Color(0xFFEF4444);
      default:          return const Color(0xFF94A3B8);
    }
  }
}
