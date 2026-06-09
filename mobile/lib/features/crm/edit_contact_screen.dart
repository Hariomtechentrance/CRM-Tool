import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

class EditContactScreen extends StatefulWidget {
  final String partyId;
  final Map<String, dynamic> contact;
  const EditContactScreen({super.key, required this.partyId, required this.contact});

  @override
  State<EditContactScreen> createState() => _EditContactScreenState();
}

class _EditContactScreenState extends State<EditContactScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _nameCtrl  = TextEditingController();
  final _titleCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _deptCtrl  = TextEditingController();
  bool _loading    = false;
  bool _isPrimary  = false;

  @override
  void initState() {
    super.initState();
    final c = widget.contact;
    _nameCtrl.text  = c['name']       as String? ?? '';
    _titleCtrl.text = c['title']      as String? ?? '';
    _phoneCtrl.text = c['phone']      as String? ?? '';
    _emailCtrl.text = c['email']      as String? ?? '';
    _deptCtrl.text  = c['department'] as String? ?? '';
    _isPrimary      = c['isPrimary']  as bool?   ?? false;
  }

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
      await ApiClient().updatePartyContact(
        widget.partyId,
        widget.contact['id'] as String,
        {
          'name':      _nameCtrl.text.trim(),
          if (_titleCtrl.text.trim().isNotEmpty) 'title':      _titleCtrl.text.trim(),
          if (_phoneCtrl.text.trim().isNotEmpty) 'phone':      _phoneCtrl.text.trim(),
          if (_emailCtrl.text.trim().isNotEmpty) 'email':      _emailCtrl.text.trim(),
          if (_deptCtrl.text.trim().isNotEmpty)  'department': _deptCtrl.text.trim(),
          'isPrimary': _isPrimary,
        },
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Contact updated'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to update contact'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Contact'),
        content: const Text('Are you sure you want to delete this contact?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _loading = true);
    try {
      await ApiClient().deletePartyContact(widget.partyId, widget.contact['id'] as String);
      if (!mounted) return;
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to delete contact'),
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
        title: const Text('Edit Contact'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline, color: AppColors.danger),
            onPressed: _loading ? null : _delete,
          ),
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : const Text('Update', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15)),
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
              label: 'Update Contact',
              loading: _loading,
              onPressed: _submit,
              icon: Icons.save_outlined,
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }
}
