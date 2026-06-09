import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

const _stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

class LeadsKanbanScreen extends ConsumerStatefulWidget {
  const LeadsKanbanScreen({super.key});
  @override
  ConsumerState<LeadsKanbanScreen> createState() => _LeadsKanbanScreenState();
}

class _LeadsKanbanScreenState extends ConsumerState<LeadsKanbanScreen> {
  bool _loading = true;
  Map<String, List<dynamic>> _columns = { for (final s in _stages) s: [] };

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getLeads();
      final raw = res.data['data'];
      final all = (raw is List ? raw : (raw?['leads'] as List? ?? [])) as List;
      final grouped = <String, List<dynamic>>{ for (final s in _stages) s: [] };
      for (final lead in all) {
        final status = lead['status'] as String? ?? 'NEW';
        if (grouped.containsKey(status)) {
          grouped[status]!.add(lead);
        } else {
          grouped['NEW']!.add(lead);
        }
      }
      if (!mounted) return;
      setState(() => _columns = grouped);
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _moveLead(String leadId, String newStatus) async {
    try {
      await ApiClient().updateLeadStatus(leadId, newStatus);
      _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to move lead'), backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  Color _color(String s) {
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
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Pipeline'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: _load,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await context.push<bool>('/leads/add');
              if (result == true) _load();
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                children: _stages.map((stage) {
                  final leads = _columns[stage] ?? [];
                  final c     = _color(stage);
                  final total = leads.fold<double>(0, (s, l) => s + ((l['value'] as num? ?? 0).toDouble()));
                  return _KanbanColumn(
                    stage:  stage,
                    color:  c,
                    leads:  leads,
                    total:  total,
                    stages: _stages,
                    onMove: _moveLead,
                    onTap:  (id) => context.push('/leads/$id'),
                    onAdd:  () async {
                      final result = await context.push<bool>('/leads/add');
                      if (result == true) _load();
                    },
                  );
                }).toList(),
              ),
            ),
    );
  }
}

class _KanbanColumn extends StatelessWidget {
  final String stage;
  final Color color;
  final List<dynamic> leads;
  final double total;
  final List<String> stages;
  final Future<void> Function(String leadId, String newStatus) onMove;
  final void Function(String id) onTap;
  final VoidCallback onAdd;

  const _KanbanColumn({
    required this.stage,
    required this.color,
    required this.leads,
    required this.total,
    required this.stages,
    required this.onMove,
    required this.onTap,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.compact(locale: 'en_IN');
    return Container(
      width: 240,
      margin: const EdgeInsets.only(right: 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Column header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(stage, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
              Text('${leads.length} lead${leads.length == 1 ? '' : 's'}  •  ₹${fmt.format(total)}',
                style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 10)),
            ])),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(6)),
              child: Text('${leads.length}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
            ),
          ]),
        ),
        const SizedBox(height: 8),

        // Cards
        Expanded(
          child: ListView.builder(
            itemCount: leads.length + 1,
            itemBuilder: (_, i) {
              if (i == leads.length) {
                return GestureDetector(
                  onTap: onAdd,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: color.withOpacity(0.2), style: BorderStyle.solid),
                    ),
                    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.add, size: 14, color: color.withOpacity(0.6)),
                      const SizedBox(width: 4),
                      Text('Add Lead', style: TextStyle(fontSize: 11, color: color.withOpacity(0.7), fontWeight: FontWeight.w600)),
                    ]),
                  ),
                );
              }
              final lead   = leads[i] as Map<String, dynamic>;
              final value  = lead['value'] as num?;
              final leadId = lead['id'] as String;
              return GestureDetector(
                onTap: () => onTap(leadId),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Container(
                        width: 28, height: 28,
                        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
                        child: Center(child: Text(
                          (lead['name'] as String? ?? 'L').isNotEmpty ? (lead['name'] as String)[0].toUpperCase() : 'L',
                          style: TextStyle(fontWeight: FontWeight.w800, color: color, fontSize: 13),
                        )),
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(lead['name'] as String? ?? '',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                        maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ]),
                    const SizedBox(height: 6),
                    if (lead['company'] != null)
                      Text(lead['company'] as String,
                        style: const TextStyle(fontSize: 10, color: AppColors.textGhost),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    if (value != null) ...[
                      const SizedBox(height: 6),
                      Text('₹${fmt.format(value)}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.success)),
                    ],
                    if (lead['source'] != null) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: AppColors.bgLight, borderRadius: BorderRadius.circular(4)),
                        child: Text(lead['source'] as String,
                          style: const TextStyle(fontSize: 9, color: AppColors.textGhost, fontWeight: FontWeight.w600)),
                      ),
                    ],
                    const SizedBox(height: 8),
                    // Move buttons
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(children: stages
                          .where((s) => s != stage)
                          .map((s) => GestureDetector(
                            onTap: () => onMove(leadId, s),
                            child: Container(
                              margin: const EdgeInsets.only(right: 4),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: _stageColor(s).withOpacity(0.08),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: _stageColor(s).withOpacity(0.2)),
                              ),
                              child: Text('→$s', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: _stageColor(s))),
                            ),
                          ))
                          .toList()),
                    ),
                  ]),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }

  Color _stageColor(String s) {
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
}
