import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

class LeadDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const LeadDetailScreen({super.key, required this.id});
  @override
  ConsumerState<LeadDetailScreen> createState() => _State();
}

class _State extends ConsumerState<LeadDetailScreen> {
  Map<String, dynamic>? _lead;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/leads/${widget.id}');
      if (!mounted) return;
      setState(() => _lead = res.data['data'] as Map<String, dynamic>?);
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not launch'), behavior: SnackBarBehavior.floating),
      );
    }
  }

  Color _color(String? s) {
    switch (s) {
      case 'NEW':       return AppColors.info;
      case 'CONTACTED': return AppColors.primary;
      case 'QUALIFIED': return AppColors.warning;
      case 'PROPOSAL':  return AppColors.secondary;
      case 'WON':       return AppColors.success;
      case 'LOST':      return AppColors.danger;
      default:          return AppColors.textGhost;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    if (_lead == null) return Scaffold(appBar: AppBar(title: const Text('Lead')), body: const Center(child: Text('Lead not found')));

    final status = _lead!['status'] as String? ?? 'NEW';
    final color = _color(status);

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(_lead!['name'] as String? ?? 'Lead'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            tooltip: 'Log Activity',
            onPressed: () async {
              final result = await context.push<bool>(
                '/leads/${widget.id}/log',
                extra: _lead!['name'] as String? ?? 'Lead',
              );
              if (result == true) _load();
            },
          ),
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final result = await context.push<bool>('/leads/edit', extra: _lead);
              if (result == true) _load();
            },
          ),
          PopupMenuButton<String>(
            onSelected: (v) async {
              await ApiClient().updateLeadStatus(widget.id, v);
              _load();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'CONTACTED', child: Text('Mark Contacted')),
              const PopupMenuItem(value: 'QUALIFIED', child: Text('Mark Qualified')),
              const PopupMenuItem(value: 'PROPOSAL',  child: Text('Send Proposal')),
              const PopupMenuItem(value: 'WON',       child: Text('Mark Won 🎉')),
              const PopupMenuItem(value: 'LOST',      child: Text('Mark Lost')),
            ],
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // ── Status header ──────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [color.withOpacity(0.12), color.withOpacity(0.04)]),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withOpacity(0.2)),
          ),
          child: Row(children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: color.withOpacity(0.15),
              child: Text(
                (_lead!['name'] as String? ?? 'L').isNotEmpty ? (_lead!['name'] as String)[0].toUpperCase() : 'L',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_lead!['name'] as String? ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              if (_lead!['company'] != null) Text(_lead!['company'] as String, style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
              child: Text(status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
            ),
          ]),
        ),
        const SizedBox(height: 16),

        // ── Info card ──────────────────────────────────────────
        _infoCard('Lead Details', [
          _row(Icons.email_outlined,    'Email',   _lead!['email'] as String?),
          _row(Icons.phone_outlined,    'Phone',   _lead!['phone'] as String?),
          _row(Icons.flag_outlined,     'Source',  _lead!['source'] as String?),
          _row(Icons.currency_rupee,    'Value',   _lead!['value'] != null ? '₹${_lead!['value']}' : null),
          _row(Icons.person_outline,    'Assigned', _lead!['assignedTo'] as String?),
          _row(Icons.calendar_today_outlined, 'Follow-up', _lead!['followUpDate'] as String?),
        ]),
        const SizedBox(height: 12),

        // ── Notes ─────────────────────────────────────────────
        if (_lead!['notes'] != null)
          _infoCard('Notes', [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(_lead!['notes'] as String, style: const TextStyle(fontSize: 13, color: AppColors.textSec, height: 1.5)),
            ),
          ]),

        // ── Actions ───────────────────────────────────────────
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: _actionBtn('Call', Icons.phone, AppColors.success,
              _lead!['phone'] != null ? () => _launch('tel:${_lead!['phone']}') : null)),
          const SizedBox(width: 8),
          Expanded(child: _actionBtn('Email', Icons.email, AppColors.info,
              _lead!['email'] != null ? () => _launch('mailto:${_lead!['email']}') : null)),
          const SizedBox(width: 8),
          Expanded(child: _actionBtn('WhatsApp', Icons.chat, const Color(0xFF25D366),
              _lead!['phone'] != null ? () => _launch('https://wa.me/${(_lead!['phone'] as String).replaceAll(RegExp(r'[^0-9]'), '')}') : null)),
        ]),
      ]),
    );
  }

  Widget _infoCard(String title, List<Widget> rows) => Container(
    decoration: BoxDecoration(
      color: AppColors.cardLight,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSec)),
      ),
      const Divider(height: 1, color: AppColors.border),
      ...rows,
    ]),
  );

  Widget _row(IconData icon, String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(children: [
        Icon(icon, size: 16, color: AppColors.textGhost),
        const SizedBox(width: 10),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSec, fontWeight: FontWeight.w500)),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      ]),
    );
  }

  Widget _actionBtn(String label, IconData icon, Color color, VoidCallback? onPressed) => ElevatedButton.icon(
    onPressed: onPressed,
    icon: Icon(icon, size: 16),
    label: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    style: ElevatedButton.styleFrom(
      backgroundColor: color.withOpacity(0.1),
      foregroundColor: color,
      elevation: 0,
      side: BorderSide(color: color.withOpacity(0.3)),
      minimumSize: const Size(0, 40),
    ),
  );
}
