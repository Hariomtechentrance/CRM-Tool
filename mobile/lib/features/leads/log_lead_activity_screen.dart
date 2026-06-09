import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _activityTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'WHATSAPP'];

class LogLeadActivityScreen extends StatefulWidget {
  final String leadId;
  final String leadName;
  const LogLeadActivityScreen({super.key, required this.leadId, required this.leadName});

  @override
  State<LogLeadActivityScreen> createState() => _LogLeadActivityScreenState();
}

class _LogLeadActivityScreenState extends State<LogLeadActivityScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _titleCtrl  = TextEditingController();
  final _notesCtrl  = TextEditingController();
  String _type      = 'CALL';
  DateTime _date    = DateTime.now();
  bool _loading     = false;

  @override
  void dispose() { _titleCtrl.dispose(); _notesCtrl.dispose(); super.dispose(); }

  IconData _icon(String t) {
    switch (t) {
      case 'CALL':     return Icons.phone_outlined;
      case 'EMAIL':    return Icons.mail_outline;
      case 'MEETING':  return Icons.groups_outlined;
      case 'WHATSAPP': return Icons.chat_bubble_outline;
      default:         return Icons.notes_outlined;
    }
  }

  Color _color(String t) {
    switch (t) {
      case 'CALL':     return AppColors.success;
      case 'EMAIL':    return AppColors.info;
      case 'MEETING':  return AppColors.warning;
      case 'WHATSAPP': return const Color(0xFF25D366);
      default:         return AppColors.textSec;
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiClient().createLeadActivity(widget.leadId, {
        'type':        _type,
        'title':       _titleCtrl.text.trim().isEmpty ? _type : _titleCtrl.text.trim(),
        'notes':       _notesCtrl.text.trim(),
        'activityDate': _date.toIso8601String(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Activity logged'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to log activity'),
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
      appBar: AppBar(title: Text('Log Activity – ${widget.leadName}')),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

            // ── Type chips ───────────────────────────────────
            const Text('Activity Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8,
              children: _activityTypes.map((t) {
                final sel = _type == t;
                final c   = _color(t);
                return GestureDetector(
                  onTap: () => setState(() => _type = t),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: sel ? c.withValues(alpha: 0.12) : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: sel ? c : AppColors.border),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(_icon(t), size: 14, color: sel ? c : AppColors.textGhost),
                      const SizedBox(width: 6),
                      Text(t, style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600,
                        color: sel ? c : AppColors.textGhost,
                      )),
                    ]),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            TextFormField(
              controller: _titleCtrl,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Title (optional)',
                prefixIcon: Icon(Icons.title, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _notesCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Notes *',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Notes are required' : null,
            ),
            const SizedBox(height: 14),

            // ── Date ─────────────────────────────────────────
            GestureDetector(
              onTap: _pickDate,
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
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Activity Date', style: TextStyle(fontSize: 10, color: AppColors.textGhost)),
                    Text('${_date.day}/${_date.month}/${_date.year}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  ]),
                ]),
              ),
            ),
            const SizedBox(height: 28),

            FCButton(
              label: 'Log Activity',
              loading: _loading,
              onPressed: _submit,
              icon: _icon(_type),
            ),
          ]),
        ),
      ),
    );
  }
}
