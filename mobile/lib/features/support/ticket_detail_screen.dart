import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

class TicketDetailScreen extends StatefulWidget {
  final String id;
  const TicketDetailScreen({super.key, required this.id});

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  Map<String, dynamic>? _ticket;
  bool _loading  = true;
  bool _updating = false;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getTicketDetail(widget.id);
      if (!mounted) return;
      setState(() => _ticket = res.data['data'] as Map<String, dynamic>?
          ?? res.data as Map<String, dynamic>?);
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _priority(String? p) {
    switch (p) {
      case 'URGENT': return AppColors.danger;
      case 'HIGH':   return AppColors.warning;
      case 'MEDIUM': return AppColors.info;
      default:       return AppColors.success;
    }
  }

  Color _statusColor(String? s) {
    switch (s) {
      case 'OPEN':        return AppColors.danger;
      case 'IN_PROGRESS': return AppColors.warning;
      case 'RESOLVED':    return AppColors.success;
      case 'CLOSED':      return AppColors.textGhost;
      default:            return AppColors.textSec;
    }
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _updating = true);
    try {
      await ApiClient().updateTicket(widget.id, {'status': status});
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Status updated to ${_fmtEnum(status)}'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to update status'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.info)));
    if (_ticket == null) return Scaffold(appBar: AppBar(title: const Text('Ticket')), body: const Center(child: Text('Ticket not found')));

    final status  = _ticket!['status'] as String? ?? 'OPEN';
    final pri     = _ticket!['priority'] as String? ?? 'MEDIUM';
    final sc      = _statusColor(status);
    final pc      = _priority(pri);
    final title   = _ticket!['title'] as String? ?? _ticket!['subject'] as String? ?? 'No Title';
    final desc    = _ticket!['description'] as String? ?? '';
    final customer= _ticket!['customerName'] as String? ?? 'Unknown';

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text('#${widget.id.substring(0, 8).toUpperCase()}'),
        actions: [
          PopupMenuButton<String>(
            onSelected: _updateStatus,
            itemBuilder: (_) => [
              if (status != 'IN_PROGRESS') const PopupMenuItem(value: 'IN_PROGRESS', child: Text('Mark In Progress')),
              if (status != 'RESOLVED')    const PopupMenuItem(value: 'RESOLVED',    child: Text('Mark Resolved')),
              if (status != 'CLOSED')      const PopupMenuItem(value: 'CLOSED',      child: Text('Close Ticket')),
              if (status != 'OPEN')        const PopupMenuItem(value: 'OPEN',        child: Text('Reopen')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.info,
        child: ListView(padding: const EdgeInsets.all(16), children: [

          // ── Status header ────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(14),
              border: Border(
                left: BorderSide(color: pc, width: 4),
                right: const BorderSide(color: AppColors.border),
                top: const BorderSide(color: AppColors.border),
                bottom: const BorderSide(color: AppColors.border),
              ),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(title,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary))),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: sc.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                  child: Text(status.replaceAll('_', ' '),
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: sc)),
                ),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                Icon(Icons.person_outline, size: 14, color: AppColors.textGhost),
                const SizedBox(width: 4),
                Text(customer, style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: pc.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(pri, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: pc)),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 12),

          // ── Description ──────────────────────────────────────
          if (desc.isNotEmpty) ...[
            const Text('Description', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(desc, style: const TextStyle(fontSize: 13, color: AppColors.textSec, height: 1.6)),
            ),
            const SizedBox(height: 12),
          ],

          // ── Details card ─────────────────────────────────────
          Container(
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(children: [
              _row('Category', _fmtEnum(_ticket!['category'] as String? ?? 'GENERAL')),
              _divider(),
              if (_ticket!['customerEmail'] != null) ...[
                _row('Email', _ticket!['customerEmail'] as String),
                _divider(),
              ],
              if (_ticket!['assignedTo'] != null) ...[
                _row('Assigned To', _ticket!['assignedTo'] as String),
                _divider(),
              ],
              if (_ticket!['createdAt'] != null)
                _row('Created', _ticket!['createdAt'] as String),
            ]),
          ),
          const SizedBox(height: 20),

          // ── Action buttons ───────────────────────────────────
          if (status == 'OPEN' || status == 'IN_PROGRESS')
            ElevatedButton.icon(
              onPressed: _updating ? null : () => _updateStatus('RESOLVED'),
              icon: const Icon(Icons.check_circle_outline, size: 18),
              label: const Text('Mark as Resolved', style: TextStyle(fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success, foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          if (status == 'OPEN')
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: OutlinedButton.icon(
                onPressed: _updating ? null : () => _updateStatus('IN_PROGRESS'),
                icon: const Icon(Icons.hourglass_top_outlined, size: 18),
                label: const Text('Start Working', style: TextStyle(fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.warning,
                  side: const BorderSide(color: AppColors.warning),
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
        ]),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    child: Row(children: [
      Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSec)),
      const Spacer(),
      Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
    ]),
  );

  Widget _divider() => const Divider(height: 1, color: AppColors.border, indent: 14, endIndent: 14);

  String _fmtEnum(String e) => e.split('_')
      .map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase())
      .join(' ');
}
