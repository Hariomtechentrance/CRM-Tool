import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

class ProjectDetailScreen extends StatefulWidget {
  final String id;
  const ProjectDetailScreen({super.key, required this.id});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  Map<String, dynamic>? _project;
  List<dynamic> _tasks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res  = await ApiClient().getProjectDetail(widget.id);
      final data = res.data['data'] as Map<String, dynamic>? ?? {};
      final taskRes = await ApiClient().getProjectTasks(widget.id);
      final taskRaw = taskRes.data['data'];
      if (!mounted) return;
      setState(() {
        _project = data;
        _tasks = taskRaw is List ? taskRaw : (taskRaw?['tasks'] as List? ?? []);
      });
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

  Color _taskColor(String? s) {
    switch (s) {
      case 'TODO':        return AppColors.textGhost;
      case 'IN_PROGRESS': return AppColors.warning;
      case 'REVIEW':      return AppColors.info;
      case 'DONE':        return AppColors.success;
      case 'BLOCKED':     return AppColors.danger;
      default:            return AppColors.textSec;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.secondary)));
    if (_project == null) return Scaffold(appBar: AppBar(title: const Text('Project')), body: const Center(child: Text('Not found')));

    final status   = _project!['status'] as String? ?? 'ACTIVE';
    final sc       = _statusColor(status);
    final progress = ((_project!['progress'] as num? ?? 0).toDouble()) / 100;
    final total    = _project!['totalTasks'] as int? ?? _tasks.length;
    final done     = _project!['completedTasks'] as int?
        ?? _tasks.where((t) => t['status'] == 'DONE').length;

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(_project!['name'] as String? ?? 'Project'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_task_outlined),
            tooltip: 'Add Task',
            onPressed: () async {
              final result = await context.push<bool>('/projects/${widget.id}/task/add');
              if (result == true) _load();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.secondary,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.secondary,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Overview'), Tab(text: 'Tasks')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        // ── Overview ────────────────────────────────────────────
        RefreshIndicator(
          onRefresh: _load,
          color: AppColors.secondary,
          child: ListView(padding: const EdgeInsets.all(16), children: [
            // Progress card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(_project!['name'] as String? ?? '',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: sc.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                    child: Text(status.replaceAll('_', ' '),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: sc)),
                  ),
                ]),
                if (_project!['client'] != null) ...[
                  const SizedBox(height: 4),
                  Text(_project!['client'] as String, style: const TextStyle(fontSize: 13, color: AppColors.textGhost)),
                ],
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: sc.withValues(alpha: 0.1),
                      valueColor: AlwaysStoppedAnimation<Color>(sc),
                      minHeight: 8,
                    ),
                  )),
                  const SizedBox(width: 12),
                  Text('${(progress * 100).toInt()}%',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: sc)),
                ]),
                const SizedBox(height: 8),
                Text('$done of $total tasks completed',
                  style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
              ]),
            ),
            const SizedBox(height: 12),

            // Details
            Container(
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(children: [
                if (_project!['description'] != null) ...[
                  Padding(
                    padding: const EdgeInsets.all(14),
                    child: Text(_project!['description'] as String,
                      style: const TextStyle(fontSize: 13, color: AppColors.textSec, height: 1.5)),
                  ),
                  const Divider(height: 1, color: AppColors.border),
                ],
                if (_project!['startDate'] != null)
                  _detailRow('Start Date', _project!['startDate'] as String),
                if (_project!['dueDate'] != null)
                  _detailRow('Due Date', _project!['dueDate'] as String),
                if (_project!['budget'] != null)
                  _detailRow('Budget', '₹${_project!['budget']}'),
              ]),
            ),

            // Task summary by status
            const SizedBox(height: 16),
            const Text('Task Summary', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            const SizedBox(height: 10),
            _TaskSummary(tasks: _tasks, colorFn: _taskColor),
          ]),
        ),

        // ── Tasks list ───────────────────────────────────────────
        _tasks.isEmpty
            ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.task_alt_outlined, size: 48, color: AppColors.textGhost),
                const SizedBox(height: 8),
                const Text('No tasks yet', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () async {
                    final result = await context.push<bool>('/projects/${widget.id}/task/add');
                    if (result == true) _load();
                  },
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add Task'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white),
                ),
              ]))
            : RefreshIndicator(
                onRefresh: _load,
                color: AppColors.secondary,
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                  itemCount: _tasks.length,
                  itemBuilder: (_, i) {
                    final t = _tasks[i] as Map<String, dynamic>;
                    final ts = t['status'] as String? ?? 'TODO';
                    final tc = _taskColor(ts);
                    final pri = t['priority'] as String? ?? 'MEDIUM';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: AppColors.cardLight,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: InkWell(
                        onTap: () async {
                          final result = await context.push<bool>(
                            '/projects/${widget.id}/task/${t['id']}',
                            extra: t,
                          );
                          if (result == true) _load();
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(children: [
                            Container(
                              width: 36, height: 36,
                              decoration: BoxDecoration(
                                color: tc.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                ts == 'DONE' ? Icons.check_circle_outline : Icons.radio_button_unchecked,
                                size: 18, color: tc,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(t['title'] as String? ?? 'Task',
                                style: TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                  decoration: ts == 'DONE' ? TextDecoration.lineThrough : null,
                                )),
                              if (t['assignedTo'] != null)
                                Text(t['assignedTo'] as String,
                                  style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                            ])),
                            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: tc.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                                child: Text(ts.replaceAll('_', ' '),
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: tc)),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(color: AppColors.bgLight, borderRadius: BorderRadius.circular(4)),
                                child: Text(pri, style: const TextStyle(fontSize: 9, color: AppColors.textGhost, fontWeight: FontWeight.w600)),
                              ),
                            ]),
                          ]),
                        ),
                      ),
                    );
                  },
                ),
              ),
      ]),
    );
  }

  Widget _detailRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    child: Row(children: [
      Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSec)),
      const Spacer(),
      Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
    ]),
  );
}

class _TaskSummary extends StatelessWidget {
  final List<dynamic> tasks;
  final Color Function(String?) colorFn;
  const _TaskSummary({required this.tasks, required this.colorFn});

  @override
  Widget build(BuildContext context) {
    final counts = <String, int>{};
    for (final t in tasks) {
      final s = (t as Map<String, dynamic>)['status'] as String? ?? 'TODO';
      counts[s] = (counts[s] ?? 0) + 1;
    }
    final statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'];
    return Wrap(spacing: 8, runSpacing: 8, children: statuses.map((s) {
      final c = counts[s] ?? 0;
      final color = colorFn(s);
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(children: [
          Text('$c', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
          Text(s.replaceAll('_', ' '), style: const TextStyle(fontSize: 9, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
        ]),
      );
    }).toList());
  }
}
