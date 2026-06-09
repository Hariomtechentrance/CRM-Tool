import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_list.dart';
import '../../shared/widgets/offline_banner.dart';

class CrmScreen extends ConsumerStatefulWidget {
  const CrmScreen({super.key});
  @override
  ConsumerState<CrmScreen> createState() => _CrmScreenState();
}

class _CrmScreenState extends ConsumerState<CrmScreen> {
  bool _loading = true;
  bool _hasError = false;
  List<dynamic> _parties = [];
  String _search = '';
  String _type   = 'ALL';

  static const _types = ['ALL', 'CUSTOMER', 'SUPPLIER', 'BOTH'];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _hasError = false; });
    try {
      final res = await ApiClient().getParties(search: _search, type: _type == 'ALL' ? '' : _type);
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _parties = raw is List ? raw : (raw?['parties'] as List? ?? []));
    } catch (_) {
      if (!mounted) return;
      setState(() => _hasError = true);
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _typeColor(String? t) {
    switch (t) {
      case 'CUSTOMER': return AppColors.primary;
      case 'SUPPLIER': return AppColors.secondary;
      case 'BOTH':     return AppColors.warning;
      default:         return AppColors.textGhost;
    }
  }

  List<dynamic> get _filtered {
    if (_search.isEmpty) return _parties;
    return _parties.where((p) =>
        (p['name'] as String? ?? '').toLowerCase().contains(_search.toLowerCase()) ||
        (p['phone'] as String? ?? '').contains(_search)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('CRM'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined, size: 22),
            onPressed: () => context.push('/crm/add').then((_) => _load()),
          ),
        ],
      ),
      body: OfflineBanner(child: Column(children: [
        // ── Search ────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
          child: TextField(
            onChanged: (v) { setState(() => _search = v); if (v.isEmpty) _load(); },
            onSubmitted: (_) => _load(),
            decoration: InputDecoration(
              hintText: 'Search parties...',
              prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.textGhost),
              suffixIcon: _search.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 16),
                      onPressed: () { setState(() => _search = ''); _load(); },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),

        // ── Type filter ───────────────────────────────────────
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: _types.map((t) {
              final sel = _type == t;
              final c   = t == 'ALL' ? AppColors.primary : _typeColor(t);
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(t, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: sel ? Colors.white : c)),
                  selected: sel,
                  onSelected: (_) { setState(() => _type = t); _load(); },
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

        // ── Party list ────────────────────────────────────────
        Expanded(
          child: _loading
              ? const ShimmerList()
              : _hasError
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.cloud_off_outlined, size: 48, color: AppColors.textGhost),
                      const SizedBox(height: 12),
                      const Text('Failed to load', style: TextStyle(color: AppColors.textGhost)),
                      const SizedBox(height: 12),
                      TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Retry')),
                    ]))
              : _filtered.isEmpty
                  ? EmptyState(
                      icon: Icons.people_outline,
                      message: 'No parties found',
                      subtitle: 'Add customers, suppliers, and contacts',
                      actionLabel: 'Add Party',
                      onAction: () => context.push('/crm/add').then((_) => _load()),
                    )
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                        itemCount: _filtered.length,
                        itemBuilder: (_, i) {
                          final p       = _filtered[i] as Map<String, dynamic>;
                          final type    = p['type'] as String? ?? 'CUSTOMER';
                          final c       = _typeColor(type);
                          final name    = p['name'] as String? ?? 'Unknown';
                          final balance = (p['balance'] as num? ?? 0).toDouble();
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: AppColors.cardLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: InkWell(
                              onTap: () => context.push('/home/crm/party/${p['id']}'),
                              borderRadius: BorderRadius.circular(12),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Row(children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: c.withOpacity(0.12),
                                    child: Text(
                                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                                    const SizedBox(height: 2),
                                    Row(children: [
                                      if (p['phone'] != null) ...[
                                        const Icon(Icons.phone_outlined, size: 11, color: AppColors.textGhost),
                                        const SizedBox(width: 3),
                                        Text(p['phone'] as String, style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                                        const SizedBox(width: 8),
                                      ],
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                        decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                                        child: Text(type, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
                                      ),
                                    ]),
                                  ])),
                                  if (balance != 0)
                                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                      Text('₹${balance.abs().toStringAsFixed(0)}',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: balance > 0 ? AppColors.danger : AppColors.success)),
                                      Text(balance > 0 ? 'Due' : 'Advance', style: const TextStyle(fontSize: 9, color: AppColors.textGhost)),
                                    ])
                                  else
                                    const Icon(Icons.chevron_right, size: 18, color: AppColors.textGhost),
                                ]),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ])),
    );
  }
}
