import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

class AddContactScreen extends StatefulWidget {
  final String partyId;
  final String partyName;
  const AddContactScreen({super.key, required this.partyId, required this.partyName});

  @override
  State<AddContactScreen> createState() => _AddContactScreenState();
}

class _AddContactScreenState extends State<AddContactScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _nameCtrl  = TextEditingController();
  final _titleCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _deptCtrl  = TextEditingController();
  bool _loading    = false;
  bool _isPrimary  = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _titleCtrl.dispose();
    _phoneCtrl.dispose(); _emailCtrl.dispose();
    _deptCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiClient().createPartyContact(widget.partyId, {
        'name':       _nameCtrl.text.trim(),
        if (_titleCtrl.text.trim().isNotEmpty) 'title':      _titleCtrl.text.trim(),
        if (_phoneCtrl.text.trim().isNotEmpty) 'phone':      _phoneCtrl.text.trim(),
        if (_emailCtrl.text.trim().isNotEmpty) 'email':      _emailCtrl.text.trim(),
        if (_deptCtrl.text.trim().isNotEmpty)  'department': _deptCtrl.text.trim(),
        'isPrimary': _isPrimary,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Contact added'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to add contact'),
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
        title: Text('Add Contact • ${widget.partyName}'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : const Text('Save', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Full Name *',
                prefixIcon: Icon(Icons.person_outlined, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _titleCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Job Title',
                prefixIcon: Icon(Icons.work_outline, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _deptCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Department',
                prefixIcon: Icon(Icons.corporate_fare, size: 18, color: AppColors.textGhost),
              ),
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
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: SwitchListTile(
                value: _isPrimary,
                onChanged: (v) => setState(() => _isPrimary = v),
                activeColor: AppColors.primary,
                title: const Text('Primary Contact', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                subtitle: const Text('Mark as the main contact for this party', style: TextStyle(fontSize: 12, color: AppColors.textGhost)),
              ),
            ),
            const SizedBox(height: 28),
            FCButton(
              label: 'Add Contact',
              loading: _loading,
              onPressed: _submit,
              icon: Icons.person_add_outlined,
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }
}
