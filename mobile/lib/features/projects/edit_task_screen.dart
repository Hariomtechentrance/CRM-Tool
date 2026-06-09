import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _taskStatuses   = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'];
const _taskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

class EditTaskScreen extends StatefulWidget {
  final String projectId;
  final Map<String, dynamic>? task; // null = add mode
  const EditTaskScreen({super.key, required this.projectId, this.task});

  @override
  State<EditTaskScreen> createState() => _EditTaskScreenState();
}

class _EditTaskScreenState extends State<EditTaskScreen> {
  final _formKey       = GlobalKey<FormState>();
  final _titleCtrl     = TextEditingController();
  final _descCtrl      = TextEditingController();
  final _assigneeCtrl  = TextEditingController();
  String  _status      = 'TODO';
  String  _priority    = 'MEDIUM';
  DateTime? _dueDate;
  bool _loading        = false;

  bool get _isEdit => widget.task != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _populate();
  }

  void _populate() {
    final t = widget.task!;
    _titleCtrl.text    = t['title']      ?? '';
    _descCtrl.text     = t['description']?? '';
    _assigneeCtrl.text = t['assignedTo'] ?? '';
    _status            = t['status']     ?? 'TODO';
    _priority          = t['priority']   ?? 'MEDIUM';
    if (t['dueDate'] != null) _dueDate = DateTime.tryParse(t['dueDate'] as String);
  }

  @override
  void dispose() {
    _titleCtrl.dispose(); _descCtrl.dispose(); _assigneeCtrl.dispose();
    super.dispose();
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'TODO':        return AppColors.textGhost;
      case 'IN_PROGRESS': return AppColors.warning;
      case 'REVIEW':      return AppColors.info;
      case 'DONE':        return AppColors.success;
      case 'BLOCKED':     return AppColors.danger;
      default:            return AppColors.textSec;
    }
  }

  Color _priorityColor(String p) {
    switch (p) {
      case 'CRITICAL': return AppColors.danger;
      case 'HIGH':     return AppColors.warning;
      case 'MEDIUM':   return AppColors.info;
      default:         return AppColors.success;
    }
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final data = {
      'title':     _titleCtrl.text.trim(),
      'projectId': widget.projectId,
      'status':    _status,
      'priority':  _priority,
      if (_descCtrl.text.trim().isNotEmpty)    'description': _descCtrl.text.trim(),
      if (_assigneeCtrl.text.trim().isNotEmpty)'assignedTo':  _assigneeCtrl.text.trim(),
      if (_dueDate != null) 'dueDate': _dueDate!.toIso8601String(),
    };
    try {
      if (_isEdit) {
        await ApiClient().updateTask(widget.task!['id'], data);
      } else {
        await ApiClient().createTask(data);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_isEdit ? 'Task updated' : 'Task created'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to save task'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Task' : 'New Task'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : Text(_isEdit ? 'Update' : 'Save',
                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

            // ── Status ───────────────────────────────────────
            const Text('Status', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8,
              children: _taskStatuses.map((s) {
                final sel = _status == s;
                final c   = _statusColor(s);
                return GestureDetector(
                  onTap: () => setState(() => _status = s),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: sel ? c.withValues(alpha: 0.15) : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: sel ? c : AppColors.border, width: sel ? 1.5 : 1),
                    ),
                    child: Text(s.replaceAll('_', ' '),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                        color: sel ? c : AppColors.textGhost)),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // ── Priority ─────────────────────────────────────
            const Text('Priority', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 10),
            Row(children: _taskPriorities.map((p) {
              final sel = _priority == p;
              final c   = _priorityColor(p);
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _priority = p),
                  child: Container(
                    margin: const EdgeInsets.only(right: 6),
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: sel ? c : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: sel ? c : AppColors.border),
                    ),
                    child: Center(child: Text(p,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                        color: sel ? Colors.white : c))),
                  ),
                ),
              );
            }).toList()),
            const SizedBox(height: 20),

            // ── Title ────────────────────────────────────────
            TextFormField(
              controller: _titleCtrl,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Task Title *',
                prefixIcon: Icon(Icons.task_outlined, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Title is required' : null,
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _descCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Description',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _assigneeCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Assign To (name or email)',
                prefixIcon: Icon(Icons.person_outline, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            // ── Due date ──────────────────────────────────────
            GestureDetector(
              onTap: _pickDueDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.bgLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.textGhost),
                  const SizedBox(width: 12),
                  Text(
                    _dueDate == null
                        ? 'Set due date (optional)'
                        : 'Due: ${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}',
                    style: TextStyle(
                      fontSize: 13,
                      color: _dueDate == null ? AppColors.textGhost : AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  if (_dueDate != null)
                    GestureDetector(
                      onTap: () => setState(() => _dueDate = null),
                      child: const Icon(Icons.close, size: 16, color: AppColors.textGhost),
                    ),
                ]),
              ),
            ),
            const SizedBox(height: 28),

            FCButton(
              label: _isEdit ? 'Update Task' : 'Create Task',
              loading: _loading,
              onPressed: _submit,
              color: AppColors.secondary,
              icon: Icons.task_alt_outlined,
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }
}
