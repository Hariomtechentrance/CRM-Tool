import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});
  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  bool _loading = true;
  List<dynamic> _tickets = [];
  String _filter = 'ALL';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getTickets();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _tickets = raw is List ? raw : (raw?['tickets'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _priority(String? p) {
    switch (p) {
      case 'URGENT': return AppColors.danger;
      case 'HIGH':   return AppColors.warning;
      case 'MEDIUM': return AppColors.info;
      case 'LOW':    return AppColors.success;
      default:       return AppColors.textGhost;
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

  List<dynamic> get _filtered => _filter == 'ALL'
      ? _tickets
      : _tickets.where((t) => t['status'] == _filter).toList();

  @override
  Widget build(BuildContext context) {
    final open   = _tickets.where((t) => t['status'] == 'OPEN').length;
    final inProg = _tickets.where((t) => t['status'] == 'IN_PROGRESS').length;

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Support Tickets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await context.push<bool>('/support/create');
              if (result == true) _load();
            },
          ),
        ],
      ),
      body: Column(children: [
        // ── Stats ────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: _stat('Open',        open,            AppColors.danger)),
            const SizedBox(width: 8),
            Expanded(child: _stat('In Progress', inProg,          AppColors.warning)),
            const SizedBox(width: 8),
            Expanded(child: _stat('Total',       _tickets.length, AppColors.info)),
          ]),
        ),

        // ── Filter chips ──────────────────────────────────────
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) {
              final sel = _filter == s;
              final c   = s == 'ALL' ? AppColors.info : _statusColor(s);
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(s.replaceAll('_', ' '),
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                      color: sel ? Colors.white : c)),
                  selected: sel,
                  onSelected: (_) => setState(() => _filter = s),
                  backgroundColor: c.withOpacity(0.08),
                  selectedColor: c,
                  showCheckmark: false,
                  side: BorderSide(color: c.withOpacity(0.3)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 8),

        // ── Ticket list ───────────────────────────────────────
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.info))
              : _filtered.isEmpty
                  ? EmptyState(
                      icon: Icons.headset_mic_outlined,
                      message: 'No tickets',
                      subtitle: 'All support tickets will appear here',
                      actionLabel: 'New Ticket',
                      onAction: () async {
                        final result = await context.push<bool>('/support/create');
                        if (result == true) _load();
                      },
                    )
                  : RefreshIndicator(
                      color: AppColors.info,
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                        itemCount: _filtered.length,
                        itemBuilder: (_, i) {
                          final t   = _filtered[i] as Map<String, dynamic>;
                          final pri = t['priority'] as String? ?? 'MEDIUM';
                          final sts = t['status']   as String? ?? 'OPEN';
                          final pc  = _priority(pri);
                          final sc  = _statusColor(sts);
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: AppColors.cardLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border(
                                left:   BorderSide(color: pc, width: 3),
                                right:  const BorderSide(color: AppColors.border),
                                top:    const BorderSide(color: AppColors.border),
                                bottom: const BorderSide(color: AppColors.border),
                              ),
                            ),
                            child: InkWell(
                              onTap: () => context.push('/support/${t['id']}'),
                              borderRadius: BorderRadius.circular(12),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Row(children: [
                                    Expanded(
                                      child: Text(
                                        t['title'] as String? ?? t['subject'] as String? ?? 'No Title',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: sc.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(sts.replaceAll('_', ' '),
                                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: sc)),
                                    ),
                                  ]),
                                  const SizedBox(height: 4),
                                  Row(children: [
                                    Icon(Icons.person_outline, size: 12, color: AppColors.textGhost),
                                    const SizedBox(width: 4),
                                    Text(t['customerName'] as String? ?? 'Customer',
                                      style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                                    const Spacer(),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: pc.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(pri,
                                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: pc)),
                                    ),
                                  ]),
                                ]),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push<bool>('/support/create');
          if (result == true) _load();
        },
        backgroundColor: AppColors.info,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Ticket', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _stat(String label, int count, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
    decoration: BoxDecoration(
      color: c.withOpacity(0.08),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: c.withOpacity(0.2)),
    ),
    child: Column(children: [
      Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: c)),
      Text(label,
        style: const TextStyle(fontSize: 9, color: AppColors.textGhost, fontWeight: FontWeight.w500),
        textAlign: TextAlign.center),
    ]),
  );
}
