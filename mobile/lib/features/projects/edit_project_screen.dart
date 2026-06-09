import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _projectStatuses = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
final _pFmt = DateFormat('dd/MM/yyyy');

class EditProjectScreen extends StatefulWidget {
  final Map<String, dynamic>? project;
  const EditProjectScreen({super.key, this.project});

  @override
  State<EditProjectScreen> createState() => _EditProjectScreenState();
}

class _EditProjectScreenState extends State<EditProjectScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _nameCtrl   = TextEditingController();
  final _clientCtrl = TextEditingController();
  final _descCtrl   = TextEditingController();
  final _budgetCtrl = TextEditingController();
  String   _status    = 'ACTIVE';
  DateTime? _startDate;
  DateTime? _dueDate;
  bool _loading       = false;

  bool get _isEdit => widget.project != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _populate();
  }

  void _populate() {
    final p = widget.project!;
    _nameCtrl.text   = p['name']        ?? '';
    _clientCtrl.text = p['client']      ?? '';
    _descCtrl.text   = p['description'] ?? '';
    _budgetCtrl.text = (p['budget']     ?? '').toString();
    _status          = p['status']      ?? 'ACTIVE';
    if (p['startDate'] != null) _startDate = DateTime.tryParse(p['startDate'] as String);
    if (p['dueDate']   != null) _dueDate   = DateTime.tryParse(p['dueDate']   as String);
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _clientCtrl.dispose();
    _descCtrl.dispose(); _budgetCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isDue) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isDue
          ? (_dueDate   ?? DateTime.now().add(const Duration(days: 30)))
          : (_startDate ?? DateTime.now()),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) setState(() => isDue ? _dueDate = picked : _startDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final data = {
      'name':   _nameCtrl.text.trim(),
      'status': _status,
      if (_clientCtrl.text.trim().isNotEmpty) 'client':      _clientCtrl.text.trim(),
      if (_descCtrl.text.trim().isNotEmpty)   'description': _descCtrl.text.trim(),
      if (_budgetCtrl.text.trim().isNotEmpty) 'budget':      double.tryParse(_budgetCtrl.text) ?? 0,
      if (_startDate != null) 'startDate': _startDate!.toIso8601String(),
      if (_dueDate   != null) 'dueDate':   _dueDate!.toIso8601String(),
    };
    try {
      if (_isEdit) {
        await ApiClient().updateProject(widget.project!['id'], data);
      } else {
        await ApiClient().createProject(data);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_isEdit ? 'Project updated' : 'Project created'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to save project'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _statusColor(String s) {
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
        title: Text(_isEdit ? 'Edit Project' : 'New Project'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
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
              children: _projectStatuses.map((s) {
                final sel = _status == s;
                final c   = _statusColor(s);
                return GestureDetector(
                  onTap: () => setState(() => _status = s),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: sel ? c : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: sel ? c : AppColors.border),
                    ),
                    child: Text(s.replaceAll('_', ' '),
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                        color: sel ? Colors.white : c)),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Project Name *',
                prefixIcon: Icon(Icons.folder_outlined, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _clientCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Client (optional)',
                prefixIcon: Icon(Icons.business_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _budgetCtrl,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Budget ₹ (optional)',
                prefixIcon: Icon(Icons.currency_rupee, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            Row(children: [
              Expanded(child: _dateTile('Start Date', _startDate, () => _pickDate(false))),
              const SizedBox(width: 12),
              Expanded(child: _dateTile('Due Date', _dueDate, () => _pickDate(true))),
            ]),
            const SizedBox(height: 14),

            TextFormField(
              controller: _descCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 28),

            FCButton(
              label: _isEdit ? 'Update Project' : 'Create Project',
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

  Widget _dateTile(String label, DateTime? date, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
      decoration: BoxDecoration(
        color: AppColors.bgLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textGhost),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
          Text(date == null ? 'Select' : _pFmt.format(date),
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
              color: date == null ? AppColors.textGhost : AppColors.textPrimary)),
        ])),
      ]),
    ),
  );
}
