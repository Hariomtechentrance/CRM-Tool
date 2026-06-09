import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

final _partyDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await ApiClient().getPartyDetail(id);
  return res.data['data'] as Map<String, dynamic>? ?? {};
});

class PartyDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const PartyDetailScreen({super.key, required this.id});

  @override
  ConsumerState<PartyDetailScreen> createState() => _PartyDetailScreenState();
}

class _PartyDetailScreenState extends ConsumerState<PartyDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  List<dynamic> _contacts = [];
  bool _loadingContacts   = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging && _tabs.index == 1) _loadContacts();
    });
    _loadContacts();
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _loadContacts() async {
    setState(() => _loadingContacts = true);
    try {
      final res = await ApiClient().getPartyContacts(widget.id);
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _contacts = raw is List ? raw : (raw?['contacts'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loadingContacts = false);
  }

  @override
  Widget build(BuildContext context) {
    final party = ref.watch(_partyDetailProvider(widget.id));

    return Scaffold(
      appBar: AppBar(
        title: party.maybeWhen(
          data: (d) => Text(d['name'] as String? ?? 'Party'),
          orElse: () => const Text('Party'),
        ),
        actions: [
          party.maybeWhen(
            data: (d) => IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Edit Party',
              onPressed: () async {
                final result = await context.push<bool>('/crm/edit', extra: d);
                if (result == true) ref.invalidate(_partyDetailProvider(widget.id));
              },
            ),
            orElse: () => const SizedBox.shrink(),
          ),
          party.maybeWhen(
            data: (d) => IconButton(
              icon: const Icon(Icons.add_comment_outlined),
              tooltip: 'Log Activity',
              onPressed: () async {
                final result = await context.push<bool>(
                  '/crm/log/${d['id']}',
                  extra: d['name'] as String? ?? 'Party',
                );
                if (result == true) ref.invalidate(_partyDetailProvider(widget.id));
              },
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.primary,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Details'), Tab(text: 'Contacts'), Tab(text: 'Activity')],
        ),
      ),
      body: party.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2)),
        error:   (e, _) => Center(child: Text('Error: $e')),
        data: (d) => TabBarView(
          controller: _tabs,
          children: [
            _buildDetails(d),
            _buildContacts(d),
            _buildActivity(d),
          ],
        ),
      ),
    );
  }

  Widget _buildDetails(Map<String, dynamic> d) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      // Header
      Card(child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.primary.withOpacity(0.1),
            child: Text((d['name'] as String? ?? 'P')[0].toUpperCase(),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primary)),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(d['name'] as String? ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Row(children: [
              _typeBadge(d['type'] as String? ?? ''),
              if (d['city'] != null) ...[
                const SizedBox(width: 8),
                Icon(Icons.location_on_outlined, size: 12, color: AppColors.textGhost),
                const SizedBox(width: 2),
                Text(d['city'] as String, style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
              ],
            ]),
          ])),
        ]),
      )),
      const SizedBox(height: 12),

      // Contact info
      Card(child: Column(children: [
        if (d['phone'] != null) _InfoRow(icon: Icons.phone_outlined,       label: 'Phone',   value: d['phone'] as String),
        if (d['email'] != null) _InfoRow(icon: Icons.email_outlined,       label: 'Email',   value: d['email'] as String),
        if (d['gstin'] != null) _InfoRow(icon: Icons.badge_outlined,       label: 'GSTIN',   value: d['gstin'] as String),
        if (d['pan']   != null) _InfoRow(icon: Icons.fingerprint,          label: 'PAN',     value: d['pan']   as String),
        if (d['city']  != null) _InfoRow(icon: Icons.location_on_outlined, label: 'Address', value: '${d['city']}, ${d['state'] ?? ''}'),
        if (d['creditLimit'] != null)
          _InfoRow(icon: Icons.credit_card_outlined, label: 'Credit Limit',
            value: '₹${d['creditLimit']}  •  ${d['paymentTerms'] ?? 0} days'),
      ])),

      const SizedBox(height: 12),

      // Balance
      if (d['openingBalance'] != null)
        Card(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Opening Balance', style: TextStyle(fontSize: 13, color: AppColors.textSec)),
            Text('₹${d['openingBalance']}',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          ]),
        )),

      // Bank details
      if (d['bankName'] != null) ...[
        const SizedBox(height: 12),
        Card(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Banking', style: TextStyle(fontSize: 12, color: AppColors.textGhost, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Text('${d['bankName']} • ${d['bankBranch'] ?? ''}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            if (d['bankAccount'] != null) Text('A/C: ${d['bankAccount']}', style: const TextStyle(fontSize: 12, color: AppColors.textSec)),
            if (d['bankIfsc'] != null) Text('IFSC: ${d['bankIfsc']}', style: const TextStyle(fontSize: 12, color: AppColors.textSec)),
          ]),
        )),
      ],
    ],
  );

  Widget _buildContacts(Map<String, dynamic> d) {
    final partyName = d['name'] as String? ?? 'Party';
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          const Expanded(child: Text('Contact Persons', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary))),
          ElevatedButton.icon(
            onPressed: () async {
              final result = await context.push<bool>(
                '/crm/${widget.id}/contact/add',
                extra: partyName,
              );
              if (result == true) _loadContacts();
            },
            icon: const Icon(Icons.person_add_outlined, size: 16),
            label: const Text('Add', style: TextStyle(fontSize: 12)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary, foregroundColor: Colors.white,
              minimumSize: const Size(0, 34), padding: const EdgeInsets.symmetric(horizontal: 14),
            ),
          ),
        ]),
      ),
      Expanded(
        child: _loadingContacts
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : _contacts.isEmpty
                ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.contacts_outlined, size: 48, color: AppColors.textGhost.withOpacity(0.4)),
                    const SizedBox(height: 12),
                    const Text('No contacts yet', style: TextStyle(fontSize: 14, color: AppColors.textGhost)),
                    const SizedBox(height: 6),
                    const Text('Add contact persons for this party', style: TextStyle(fontSize: 12, color: AppColors.textGhost)),
                  ])
                : RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: _loadContacts,
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                      itemCount: _contacts.length,
                      itemBuilder: (_, i) {
                        final c      = _contacts[i] as Map<String, dynamic>;
                        final isPrim = c['isPrimary'] as bool? ?? false;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: AppColors.cardLight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isPrim ? AppColors.primary.withOpacity(0.3) : AppColors.border),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            leading: CircleAvatar(
                              radius: 20,
                              backgroundColor: AppColors.primary.withOpacity(0.1),
                              child: Text(
                                (c['name'] as String? ?? 'C').isNotEmpty ? (c['name'] as String)[0].toUpperCase() : 'C',
                                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary),
                              ),
                            ),
                            title: Row(children: [
                              Expanded(child: Text(c['name'] as String? ?? '',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
                              if (isPrim)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                                  child: const Text('PRIMARY', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: AppColors.primary)),
                                ),
                            ]),
                            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              if (c['title'] != null) Text('${c['title']} ${c['department'] != null ? '• ${c['department']}' : ''}',
                                style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                              if (c['phone'] != null) Text(c['phone'] as String,
                                style: const TextStyle(fontSize: 11, color: AppColors.textSec)),
                            ]),
                            trailing: IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.textGhost),
                              onPressed: () async {
                                final result = await context.push<bool>('/crm/${widget.id}/contact/edit', extra: c);
                                if (result == true) _loadContacts();
                              },
                            ),
                          ),
                        );
                      },
                    ),
                  ),
      ),
    ]);
  }

  Widget _buildActivity(Map<String, dynamic> d) {
    final communications = d['communications'] as List? ?? [];
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          const Expanded(child: Text('Activity Log', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700))),
          ElevatedButton.icon(
            onPressed: () async {
              await context.push<bool>('/crm/log/${widget.id}', extra: d['name'] as String? ?? 'Party');
              ref.invalidate(_partyDetailProvider(widget.id));
            },
            icon: const Icon(Icons.add_comment_outlined, size: 16),
            label: const Text('Log', style: TextStyle(fontSize: 12)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success, foregroundColor: Colors.white,
              minimumSize: const Size(0, 34), padding: const EdgeInsets.symmetric(horizontal: 14),
            ),
          ),
        ]),
      ),
      Expanded(
        child: communications.isEmpty
            ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.history_outlined, size: 48, color: AppColors.textGhost.withOpacity(0.4)),
                const SizedBox(height: 12),
                const Text('No activity yet', style: TextStyle(fontSize: 14, color: AppColors.textGhost)),
              ])
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                itemCount: communications.length,
                itemBuilder: (_, i) {
                  final comm = communications[i] as Map<String, dynamic>;
                  final type = comm['type'] as String? ?? 'NOTE';
                  final c    = _commColor(type);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.cardLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                        child: Icon(_commIcon(type), size: 16, color: c),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                            child: Text(type, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
                          ),
                          const SizedBox(width: 6),
                          Text(comm['createdAt'] as String? ?? '', style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                        ]),
                        const SizedBox(height: 4),
                        if (comm['notes'] != null)
                          Text(comm['notes'] as String, style: const TextStyle(fontSize: 12, color: AppColors.textSec)),
                      ])),
                    ]),
                  );
                },
              ),
      ),
    ]);
  }

  Widget _typeBadge(String type) {
    final c = type == 'CUSTOMER' ? AppColors.success : type == 'SUPPLIER' ? AppColors.info : AppColors.secondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
      child: Text(type, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: c)),
    );
  }

  Color _commColor(String type) {
    switch (type) {
      case 'CALL':    return AppColors.success;
      case 'EMAIL':   return AppColors.primary;
      case 'MEETING': return AppColors.warning;
      case 'VISIT':   return AppColors.secondary;
      default:        return AppColors.textSec;
    }
  }

  IconData _commIcon(String type) {
    switch (type) {
      case 'CALL':    return Icons.phone_outlined;
      case 'EMAIL':   return Icons.email_outlined;
      case 'MEETING': return Icons.people_outline;
      case 'VISIT':   return Icons.location_on_outlined;
      default:        return Icons.notes_outlined;
    }
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    child: Row(children: [
      Icon(icon, size: 16, color: AppColors.textGhost),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
        Text(value, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
      ]),
    ]),
  );
}
