import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const _categories = ['BILLING', 'TECHNICAL', 'GENERAL', 'ACCOUNT', 'FEATURE_REQUEST', 'OTHER'];

class CreateTicketScreen extends StatefulWidget {
  const CreateTicketScreen({super.key});

  @override
  State<CreateTicketScreen> createState() => _CreateTicketScreenState();
}

class _CreateTicketScreenState extends State<CreateTicketScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _titleCtrl   = TextEditingController();
  final _descCtrl    = TextEditingController();
  final _customerCtrl= TextEditingController();
  final _emailCtrl   = TextEditingController();
  String _priority   = 'MEDIUM';
  String _category   = 'GENERAL';
  bool _loading      = false;

  @override
  void dispose() {
    _titleCtrl.dispose(); _descCtrl.dispose();
    _customerCtrl.dispose(); _emailCtrl.dispose();
    super.dispose();
  }

  Color _priorityColor(String p) {
    switch (p) {
      case 'URGENT': return AppColors.danger;
      case 'HIGH':   return AppColors.warning;
      case 'MEDIUM': return AppColors.info;
      default:       return AppColors.success;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiClient().createTicket({
        'title':        _titleCtrl.text.trim(),
        'description':  _descCtrl.text.trim(),
        'priority':     _priority,
        'category':     _category,
        if (_customerCtrl.text.trim().isNotEmpty) 'customerName': _customerCtrl.text.trim(),
        if (_emailCtrl.text.trim().isNotEmpty)    'customerEmail': _emailCtrl.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Ticket created'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to create ticket'),
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
        title: const Text('New Support Ticket'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : const Text('Submit', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

            // ── Priority selector ────────────────────────────
            const Text('Priority', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 10),
            Row(children: _priorities.map((p) {
              final sel = _priority == p;
              final c   = _priorityColor(p);
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _priority = p),
                  child: Container(
                    margin: const EdgeInsets.only(right: 6),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: sel ? c : AppColors.cardLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: sel ? c : AppColors.border),
                    ),
                    child: Center(child: Text(p,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                        color: sel ? Colors.white : c))),
                  ),
                ),
              );
            }).toList()),
            const SizedBox(height: 20),

            // ── Title ─────────────────────────────────────────
            TextFormField(
              controller: _titleCtrl,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Issue Title *',
                prefixIcon: Icon(Icons.title, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Title is required' : null,
            ),
            const SizedBox(height: 14),

            // ── Description ───────────────────────────────────
            TextFormField(
              controller: _descCtrl,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Description *',
                prefixIcon: Icon(Icons.description_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Description is required' : null,
            ),
            const SizedBox(height: 14),

            // ── Category ──────────────────────────────────────
            DropdownButtonFormField<String>(
              value: _category,
              decoration: const InputDecoration(
                labelText: 'Category',
                prefixIcon: Icon(Icons.category_outlined, size: 18, color: AppColors.textGhost),
              ),
              items: _categories.map((c) => DropdownMenuItem(
                value: c,
                child: Text(_fmtEnum(c), style: const TextStyle(fontSize: 13)),
              )).toList(),
              onChanged: (v) => setState(() => _category = v!),
            ),
            const SizedBox(height: 14),

            // ── Customer ──────────────────────────────────────
            TextFormField(
              controller: _customerCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Customer Name (optional)',
                prefixIcon: Icon(Icons.person_outline, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Customer Email (optional)',
                prefixIcon: Icon(Icons.mail_outline, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v != null && v.isNotEmpty && !v.contains('@')) ? 'Invalid email' : null,
            ),
            const SizedBox(height: 28),

            FCButton(
              label: 'Submit Ticket',
              loading: _loading,
              onPressed: _submit,
              icon: Icons.headset_mic_outlined,
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
