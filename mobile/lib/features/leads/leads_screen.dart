import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class LeadsScreen extends ConsumerStatefulWidget {
  const LeadsScreen({super.key});
  @override
  ConsumerState<LeadsScreen> createState() => _LeadsScreenState();
}

class _LeadsScreenState extends ConsumerState<LeadsScreen> {
  bool _loading = true;
  List<dynamic> _leads = [];
  String _filter = 'ALL';
  bool _showSearch = false;
  final _searchCtrl = TextEditingController();
  String _search = '';

  static const _statuses = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getLeads();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _leads = raw is List ? raw : (raw?['leads'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  List<dynamic> get _filtered {
    var list = _filter == 'ALL'
        ? _leads
        : _leads.where((l) => (l['status'] as String?) == _filter).toList();
    if (_search.isNotEmpty) {
      final q = _search.toLowerCase();
      list = list.where((l) =>
          (l['name']    as String? ?? '').toLowerCase().contains(q) ||
          (l['company'] as String? ?? '').toLowerCase().contains(q) ||
          (l['email']   as String? ?? '').toLowerCase().contains(q) ||
          (l['phone']   as String? ?? '').contains(_search)).toList();
    }
    return list;
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
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Leads'),
        actions: [
          IconButton(
            icon: Icon(_showSearch ? Icons.search_off : Icons.search),
            onPressed: () => setState(() {
              _showSearch = !_showSearch;
              if (!_showSearch) { _search = ''; _searchCtrl.clear(); }
            }),
          ),
          IconButton(
            icon: const Icon(Icons.view_kanban_outlined),
            tooltip: 'Kanban view',
            onPressed: () => context.push('/leads/kanban'),
          ),
        ],
      ),
      body: Column(children: [
        // ── Search bar (toggle) ────────────────────────────────
        if (_showSearch) Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
          child: TextField(
            controller: _searchCtrl,
            autofocus: true,
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: 'Search leads...',
              prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.textGhost),
              suffixIcon: _search.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 16), onPressed: () { setState(() => _search = ''); _searchCtrl.clear(); })
                  : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),

        // ── Status filter bar ──────────────────────────────────
        SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            children: _statuses.map((s) {
              final sel = _filter == s;
              final c = s == 'ALL' ? AppColors.primary : _color(s);
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(s, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: sel ? Colors.white : c)),
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

        // ── Pipeline summary row ───────────────────────────────
        _PipelineSummary(leads: _leads, colorFn: _color),

        // ── Leads list ────────────────────────────────────────
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : _filtered.isEmpty
                  ? EmptyState(
                      icon: Icons.trending_up_outlined,
                      message: 'No leads found',
                      subtitle: 'Tap + to add your first lead',
                    )
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                        itemCount: _filtered.length,
                        itemBuilder: (_, i) => _LeadCard(
                          lead: _filtered[i] as Map<String, dynamic>,
                          color: _color(_filtered[i]['status'] as String?),
                          onTap: () => context.push('/leads/${_filtered[i]['id']}'),
                        ),
                      ),
                    ),
        ),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push<bool>('/leads/add');
          if (result == true) _load();
        },
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Lead', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _PipelineSummary extends StatelessWidget {
  final List<dynamic> leads;
  final Color Function(String?) colorFn;
  const _PipelineSummary({required this.leads, required this.colorFn});

  @override
  Widget build(BuildContext context) {
    final won  = leads.where((l) => l['status'] == 'WON').length;
    final open = leads.where((l) => !['WON','LOST'].contains(l['status'])).length;
    final lost = leads.where((l) => l['status'] == 'LOST').length;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.cardLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _pill('Open',  open, AppColors.primary),
        _divider(),
        _pill('Won',   won,  AppColors.success),
        _divider(),
        _pill('Lost',  lost, AppColors.danger),
        _divider(),
        _pill('Total', leads.length, AppColors.textSec),
      ]),
    );
  }

  Widget _pill(String label, int count, Color c) => Column(mainAxisSize: MainAxisSize.min, children: [
    Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: c)),
    Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
  ]);

  Widget _divider() => Container(width: 1, height: 28, color: AppColors.border);
}

class _LeadCard extends StatelessWidget {
  final Map<String, dynamic> lead;
  final Color color;
  final VoidCallback onTap;
  const _LeadCard({required this.lead, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = lead['status'] as String? ?? 'NEW';
    final value  = lead['value'] as num?;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.cardLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
              child: Center(child: Text(
                (lead['name'] as String? ?? 'U').isNotEmpty ? (lead['name'] as String)[0].toUpperCase() : 'L',
                style: TextStyle(fontWeight: FontWeight.w800, color: color, fontSize: 16),
              )),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(lead['name'] as String? ?? 'Unknown Lead',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              const SizedBox(height: 2),
              Text(lead['company'] as String? ?? lead['source'] as String? ?? 'No company',
                style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: color.withOpacity(0.3)),
                ),
                child: Text(status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
              ),
              if (value != null) ...[
                const SizedBox(height: 4),
                Text('₹${value.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.success)),
              ],
            ]),
          ]),
        ),
      ),
    );
  }
}
