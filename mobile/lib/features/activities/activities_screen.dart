import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class ActivitiesScreen extends ConsumerStatefulWidget {
  const ActivitiesScreen({super.key});
  @override
  ConsumerState<ActivitiesScreen> createState() => _ActivitiesScreenState();
}

class _ActivitiesScreenState extends ConsumerState<ActivitiesScreen> {
  bool _loading = true;
  List<dynamic> _activities = [];
  String _filter = 'ALL';

  static const _types = ['ALL', 'NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK'];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/activities');
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _activities = raw is List ? raw : (raw?['activities'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _color(String? t) {
    switch (t) {
      case 'NOTE':    return AppColors.info;
      case 'CALL':    return AppColors.success;
      case 'EMAIL':   return AppColors.primary;
      case 'MEETING': return AppColors.secondary;
      case 'TASK':    return AppColors.warning;
      default:        return AppColors.textGhost;
    }
  }

  IconData _icon(String? t) {
    switch (t) {
      case 'NOTE':    return Icons.sticky_note_2_outlined;
      case 'CALL':    return Icons.phone_outlined;
      case 'EMAIL':   return Icons.email_outlined;
      case 'MEETING': return Icons.people_outline;
      case 'TASK':    return Icons.task_alt_outlined;
      default:        return Icons.timeline_outlined;
    }
  }

  List<dynamic> get _filtered => _filter == 'ALL'
      ? _activities
      : _activities.where((a) => a['type'] == _filter).toList();

  Future<void> _logActivity() async {
    String selType = 'NOTE';
    final descCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: const Text('Log Activity'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField<String>(
              value: selType,
              decoration: const InputDecoration(
                labelText: 'Type',
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK']
                  .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                  .toList(),
              onChanged: (v) => setS(() => selType = v ?? 'NOTE'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Add notes...',
                alignLabelWithHint: true,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
              child: const Text('Log'),
            ),
          ],
        ),
      ),
    );
    final desc = descCtrl.text.trim();
    descCtrl.dispose();
    if (confirmed != true || desc.isEmpty) return;
    try {
      await ApiClient().createActivity({'type': selType, 'description': desc});
      _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Activity logged'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to log activity'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Activities'),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: _logActivity),
        ],
      ),
      body: Column(children: [
        // Filter
        SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            children: _types.map((t) {
              final sel = _filter == t;
              final c   = t == 'ALL' ? AppColors.primary : _color(t);
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  avatar: t != 'ALL' ? Icon(_icon(t), size: 12, color: sel ? Colors.white : c) : null,
                  label: Text(t, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: sel ? Colors.white : c)),
                  selected: sel,
                  onSelected: (_) => setState(() => _filter = t),
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

        // Timeline
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : _filtered.isEmpty
                  ? EmptyState(icon: Icons.timeline_outlined, message: 'No activities', subtitle: 'Log calls, notes, emails and meetings')
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                        itemCount: _filtered.length,
                        itemBuilder: (_, i) {
                          final a    = _filtered[i] as Map<String, dynamic>;
                          final type = a['type'] as String?;
                          final c    = _color(type);
                          final isLast = i == _filtered.length - 1;
                          return IntrinsicHeight(
                            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                              // Timeline spine
                              Column(children: [
                                Container(
                                  width: 32, height: 32,
                                  decoration: BoxDecoration(color: c.withOpacity(0.12), shape: BoxShape.circle),
                                  child: Icon(_icon(type), size: 15, color: c),
                                ),
                                if (!isLast)
                                  Expanded(child: Container(width: 1, color: AppColors.border)),
                              ]),
                              const SizedBox(width: 12),
                              // Card
                              Expanded(
                                child: Container(
                                  margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppColors.cardLight,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Row(children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                                        child: Text(type ?? 'ACTIVITY', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
                                      ),
                                      const Spacer(),
                                      Text(a['createdAt'] as String? ?? '', style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                                    ]),
                                    const SizedBox(height: 4),
                                    Text(a['description'] as String? ?? a['title'] as String? ?? 'Activity',
                                      style: const TextStyle(fontSize: 12, color: AppColors.textSec, height: 1.4)),
                                    if (a['party'] != null || a['lead'] != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        'Re: ${a['party']?['name'] ?? a['lead']?['name'] ?? ''}',
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                                      ),
                                    ],
                                  ]),
                                ),
                              ),
                            ]),
                          );
                        },
                      ),
                    ),
        ),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _logActivity,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Log Activity', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
