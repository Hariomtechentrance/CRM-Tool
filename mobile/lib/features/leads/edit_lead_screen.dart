import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
const _leadSources  = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'OTHER'];

class EditLeadScreen extends StatefulWidget {
  final Map<String, dynamic>? lead;
  const EditLeadScreen({super.key, this.lead});

  @override
  State<EditLeadScreen> createState() => _EditLeadScreenState();
}

class _EditLeadScreenState extends State<EditLeadScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _nameCtrl    = TextEditingController();
  final _emailCtrl   = TextEditingController();
  final _phoneCtrl   = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _valueCtrl   = TextEditingController();
  final _notesCtrl   = TextEditingController();
  String  _status    = 'NEW';
  String  _source    = 'OTHER';
  DateTime? _followUp;
  bool _loading      = false;

  bool get _isEdit => widget.lead != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _populate();
  }

  void _populate() {
    final l = widget.lead!;
    _nameCtrl.text    = l['name']    ?? '';
    _emailCtrl.text   = l['email']   ?? '';
    _phoneCtrl.text   = l['phone']   ?? '';
    _companyCtrl.text = l['company'] ?? '';
    _valueCtrl.text   = (l['value']  ?? '').toString();
    _notesCtrl.text   = l['notes']   ?? '';
    _status           = l['status']  ?? 'NEW';
    _source           = l['source']  ?? 'OTHER';
    if (l['followUpDate'] != null) {
      _followUp = DateTime.tryParse(l['followUpDate'] as String);
    }
  }

  @override
  void dispose() {
    for (final c in [_nameCtrl, _emailCtrl, _phoneCtrl, _companyCtrl, _valueCtrl, _notesCtrl]) {
      c.dispose();
    }
    super.dispose();
  }

  Color _statusColor(String s) {
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

  Future<void> _pickFollowUp() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _followUp ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _followUp = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final data = {
      'name':   _nameCtrl.text.trim(),
      'status': _status,
      'source': _source,
      if (_emailCtrl.text.trim().isNotEmpty)   'email':   _emailCtrl.text.trim(),
      if (_phoneCtrl.text.trim().isNotEmpty)   'phone':   _phoneCtrl.text.trim(),
      if (_companyCtrl.text.trim().isNotEmpty) 'company': _companyCtrl.text.trim(),
      if (_valueCtrl.text.trim().isNotEmpty)   'value':   double.tryParse(_valueCtrl.text) ?? 0,
      if (_notesCtrl.text.trim().isNotEmpty)   'notes':   _notesCtrl.text.trim(),
      if (_followUp != null) 'followUpDate': _followUp!.toIso8601String(),
    };
    try {
      if (_isEdit) {
        await ApiClient().updateLead(widget.lead!['id'], data);
      } else {
        await ApiClient().createLead(data);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_isEdit ? 'Lead updated' : 'Lead created'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to save lead'),
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
        title: Text(_isEdit ? 'Edit Lead' : 'New Lead'),
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

            // ── Status selector ──────────────────────────────
            const Text('Status', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8,
              children: _leadStatuses.map((s) {
                final sel = _status == s;
                final c   = _statusColor(s);
                return GestureDetector(
                  onTap: () => setState(() => _status = s),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: sel ? c : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: sel ? c : AppColors.border),
                    ),
                    child: Text(s, style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w700,
                      color: sel ? Colors.white : c,
                    )),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // ── Name ─────────────────────────────────────────
            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Full Name *',
                prefixIcon: Icon(Icons.person_outline, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
            ),
            const SizedBox(height: 14),

            // ── Company ──────────────────────────────────────
            TextFormField(
              controller: _companyCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Company',
                prefixIcon: Icon(Icons.business_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            // ── Email + Phone ─────────────────────────────────
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.mail_outline, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v != null && v.isNotEmpty && !v.contains('@')) ? 'Invalid email' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Phone',
                prefixIcon: Icon(Icons.phone_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            // ── Value ─────────────────────────────────────────
            TextFormField(
              controller: _valueCtrl,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Deal Value (₹)',
                prefixIcon: Icon(Icons.currency_rupee, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            // ── Source ────────────────────────────────────────
            DropdownButtonFormField<String>(
              value: _source,
              decoration: const InputDecoration(
                labelText: 'Lead Source',
                prefixIcon: Icon(Icons.source_outlined, size: 18, color: AppColors.textGhost),
              ),
              items: _leadSources.map((s) => DropdownMenuItem(
                value: s,
                child: Text(_fmtEnum(s), style: const TextStyle(fontSize: 13)),
              )).toList(),
              onChanged: (v) => setState(() => _source = v!),
            ),
            const SizedBox(height: 14),

            // ── Follow-up date ────────────────────────────────
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
                    _followUp == null
                        ? 'Set follow-up date (optional)'
                        : 'Follow-up: ${_followUp!.day}/${_followUp!.month}/${_followUp!.year}',
                    style: TextStyle(
                      fontSize: 13,
                      color: _followUp == null ? AppColors.textGhost : AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  if (_followUp != null)
                    GestureDetector(
                      onTap: () => setState(() => _followUp = null),
                      child: const Icon(Icons.close, size: 16, color: AppColors.textGhost),
                    ),
                ]),
              ),
            ),
            const SizedBox(height: 14),

            // ── Notes ─────────────────────────────────────────
            TextFormField(
              controller: _notesCtrl,
              maxLines: 4,
              textInputAction: TextInputAction.newline,
              decoration: const InputDecoration(
                labelText: 'Notes',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 28),

            FCButton(
              label: _isEdit ? 'Update Lead' : 'Create Lead',
              loading: _loading,
              onPressed: _submit,
              icon: Icons.trending_up_outlined,
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  String _fmtEnum(String e) => e.split('_')
      .map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase())
      .join(' ');
}
