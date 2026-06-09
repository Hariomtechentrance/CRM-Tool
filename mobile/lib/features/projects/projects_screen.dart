import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});
  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  bool _loading = true;
  List<dynamic> _projects = [];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getProjects();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _projects = raw is List ? raw : (raw?['projects'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _statusColor(String? s) {
    switch (s) {
      case 'ACTIVE':    return AppColors.success;
      case 'ON_HOLD':   return AppColors.warning;
      case 'COMPLETED': return AppColors.primary;
      case 'CANCELLED': return AppColors.danger;
      default:          return AppColors.textGhost;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Projects'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await context.push<bool>('/projects/add');
              if (result == true) _load();
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
          : _projects.isEmpty
              ? EmptyState(
                  icon: Icons.task_alt_outlined,
                  message: 'No projects yet',
                  subtitle: 'Create your first project to track tasks and milestones',
                  actionLabel: 'New Project',
                  onAction: () async {
                    final result = await context.push<bool>('/projects/add');
                    if (result == true) _load();
                  },
                )
              : RefreshIndicator(
                  color: AppColors.secondary,
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                    itemCount: _projects.length,
                    itemBuilder: (_, i) {
                      final p        = _projects[i] as Map<String, dynamic>;
                      final status   = p['status'] as String? ?? 'ACTIVE';
                      final c        = _statusColor(status);
                      final progress = (p['progress'] as num? ?? 0).toDouble() / 100;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: AppColors.cardLight,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: InkWell(
                          onTap: () => context.push('/projects/${p['id']}'),
                          borderRadius: BorderRadius.circular(14),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                Container(
                                  width: 40, height: 40,
                                  decoration: BoxDecoration(
                                    color: c.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(Icons.task_alt, size: 20, color: c),
                                ),
                                const SizedBox(width: 10),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(p['name'] as String? ?? 'Project',
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                  Text(p['client'] as String? ?? '',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
                                ])),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: c.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(status.replaceAll('_', ' '),
                                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
                                ),
                              ]),
                              const SizedBox(height: 12),
                              Row(children: [
                                Expanded(child: ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: progress,
                                    backgroundColor: c.withOpacity(0.1),
                                    valueColor: AlwaysStoppedAnimation<Color>(c),
                                    minHeight: 6,
                                  ),
                                )),
                                const SizedBox(width: 8),
                                Text('${(progress * 100).toInt()}%',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: c)),
                              ]),
                              const SizedBox(height: 8),
                              Row(children: [
                                Icon(Icons.calendar_today_outlined, size: 12, color: AppColors.textGhost),
                                const SizedBox(width: 4),
                                Text(p['dueDate'] as String? ?? 'No deadline',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                                const Spacer(),
                                Icon(Icons.task_outlined, size: 12, color: AppColors.textGhost),
                                const SizedBox(width: 4),
                                Text('${p['completedTasks'] ?? 0}/${p['totalTasks'] ?? 0} tasks',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                              ]),
                            ]),
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push<bool>('/projects/add');
          if (result == true) _load();
        },
        backgroundColor: AppColors.secondary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Project', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
