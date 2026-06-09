import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _commTypes = ['CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'NOTE'];
const _callOutcomes = ['ANSWERED', 'NO_ANSWER', 'BUSY', 'CALLBACK_REQUESTED', 'WRONG_NUMBER', 'VOICEMAIL'];

class LogCommunicationScreen extends StatefulWidget {
  final String partyId;
  final String partyName;
  const LogCommunicationScreen({super.key, required this.partyId, required this.partyName});

  @override
  State<LogCommunicationScreen> createState() => _LogCommunicationScreenState();
}

class _LogCommunicationScreenState extends State<LogCommunicationScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _subjectCtrl = TextEditingController();
  final _descCtrl    = TextEditingController();
  final _durationCtrl= TextEditingController();
  String _type        = 'CALL';
  String _callOutcome = 'ANSWERED';
  DateTime? _followUpDate;
  bool _loading       = false;

  @override
  void dispose() {
    _subjectCtrl.dispose(); _descCtrl.dispose(); _durationCtrl.dispose();
    super.dispose();
  }

  IconData _typeIcon(String t) {
    switch (t) {
      case 'CALL':     return Icons.phone_outlined;
      case 'EMAIL':    return Icons.mail_outline;
      case 'WHATSAPP': return Icons.chat_bubble_outline;
      case 'MEETING':  return Icons.groups_outlined;
      default:         return Icons.notes_outlined;
    }
  }

  Color _typeColor(String t) {
    switch (t) {
      case 'CALL':     return AppColors.success;
      case 'EMAIL':    return AppColors.info;
      case 'WHATSAPP': return const Color(0xFF25D366);
      case 'MEETING':  return AppColors.warning;
      default:         return AppColors.textSec;
    }
  }

  Future<void> _pickFollowUp() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _followUpDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiClient().createPartyCommunication(widget.partyId, {
        'type':        _type,
        if (_subjectCtrl.text.trim().isNotEmpty) 'subject': _subjectCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        if (_type == 'CALL') 'callOutcome': _callOutcome,
        if (_type == 'CALL' && _durationCtrl.text.isNotEmpty)
          'duration': int.tryParse(_durationCtrl.text) ?? 0,
        if (_followUpDate != null)
          'followUpDate': _followUpDate!.toIso8601String(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Activity logged'), backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to log activity'), backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(title: Text('Log Activity – ${widget.partyName}')),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // ── Type selector ────────────────────────────────
            const Text('Activity Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _commTypes.map((t) {
                final sel = _type == t;
                return GestureDetector(
                  onTap: () => setState(() => _type = t),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: sel ? _typeColor(t).withValues(alpha: 0.12) : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: sel ? _typeColor(t) : AppColors.border),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(_typeIcon(t), size: 14, color: sel ? _typeColor(t) : AppColors.textGhost),
                      const SizedBox(width: 6),
                      Text(t, style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600,
                        color: sel ? _typeColor(t) : AppColors.textGhost,
                      )),
                    ]),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            TextFormField(
              controller: _subjectCtrl,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Subject (optional)',
                prefixIcon: Icon(Icons.title, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _descCtrl,
              maxLines: 4,
              textInputAction: TextInputAction.newline,
              decoration: const InputDecoration(
                labelText: 'Notes / Description *',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Description is required' : null,
            ),
            const SizedBox(height: 14),

            // ── Call-specific fields ─────────────────────────
            if (_type == 'CALL') ...[
              DropdownButtonFormField<String>(
                value: _callOutcome,
                decoration: const InputDecoration(
                  labelText: 'Call Outcome',
                  prefixIcon: Icon(Icons.phone_callback_outlined, size: 18, color: AppColors.textGhost),
                ),
                items: _callOutcomes.map((o) => DropdownMenuItem(
                  value: o,
                  child: Text(_fmtEnum(o), style: const TextStyle(fontSize: 13)),
                )).toList(),
                onChanged: (v) => setState(() => _callOutcome = v!),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _durationCtrl,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Duration (minutes)',
                  prefixIcon: Icon(Icons.timer_outlined, size: 18, color: AppColors.textGhost),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // ── Follow-up date ───────────────────────────────
            GestureDetector(
              onTap: _pickFollowUp,
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
                    _followUpDate == null
                      ? 'Set follow-up date (optional)'
                      : 'Follow-up: ${_followUpDate!.day}/${_followUpDate!.month}/${_followUpDate!.year}',
                    style: TextStyle(
                      fontSize: 13,
                      color: _followUpDate == null ? AppColors.textGhost : AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  if (_followUpDate != null)
                    GestureDetector(
                      onTap: () => setState(() => _followUpDate = null),
                      child: const Icon(Icons.close, size: 16, color: AppColors.textGhost),
                    ),
                ]),
              ),
            ),
            const SizedBox(height: 28),

            FCButton(label: 'Log Activity', loading: _loading, onPressed: _submit,
              icon: _typeIcon(_type)),
          ]),
        ),
      ),
    );
  }

  String _fmtEnum(String e) => e.split('_')
      .map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase())
      .join(' ');
}
