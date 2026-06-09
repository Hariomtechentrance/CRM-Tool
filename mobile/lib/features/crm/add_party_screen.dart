import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/fc_button.dart';

class AddPartyScreen extends ConsumerStatefulWidget {
  const AddPartyScreen({super.key});
  @override
  ConsumerState<AddPartyScreen> createState() => _AddPartyScreenState();
}

class _AddPartyScreenState extends ConsumerState<AddPartyScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _name      = TextEditingController();
  final _phone     = TextEditingController();
  final _email     = TextEditingController();
  final _gstin     = TextEditingController();
  final _address   = TextEditingController();
  String _type     = 'CUSTOMER';
  bool _saving     = false;

  @override
  void dispose() {
    _name.dispose(); _phone.dispose(); _email.dispose();
    _gstin.dispose(); _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ApiClient().dio.post('/parties', data: {
        'name':    _name.text.trim(),
        'phone':   _phone.text.trim(),
        'email':   _email.text.trim(),
        'gstin':   _gstin.text.trim(),
        'address': _address.text.trim(),
        'type':    _type,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Party added successfully'), backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add party: $e'), backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating),
        );
      }
    }
    if (!mounted) return;
    setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(title: const Text('Add Party')),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          // ── Type ─────────────────────────────────────────────
          const Text('Party Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSec)),
          const SizedBox(height: 8),
          Row(children: [
            for (final t in ['CUSTOMER', 'SUPPLIER', 'BOTH'])
              Expanded(child: Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(t, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _type == t ? Colors.white : AppColors.primary)),
                  selected: _type == t,
                  onSelected: (_) => setState(() => _type = t),
                  backgroundColor: AppColors.primary.withOpacity(0.05),
                  selectedColor: AppColors.primary,
                  showCheckmark: false,
                  side: BorderSide(color: _type == t ? AppColors.primary : AppColors.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              )),
          ]),
          const SizedBox(height: 16),

          // ── Name ─────────────────────────────────────────────
          TextFormField(
            controller: _name,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Full Name / Company Name *',
              prefixIcon: Icon(Icons.business_outlined, size: 18, color: AppColors.textGhost),
            ),
            validator: (v) => (v?.isEmpty ?? true) ? 'Name is required' : null,
          ),
          const SizedBox(height: 12),

          // ── Phone ─────────────────────────────────────────────
          TextFormField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Phone Number',
              prefixIcon: Icon(Icons.phone_outlined, size: 18, color: AppColors.textGhost),
            ),
          ),
          const SizedBox(height: 12),

          // ── Email ─────────────────────────────────────────────
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Email Address',
              prefixIcon: Icon(Icons.email_outlined, size: 18, color: AppColors.textGhost),
            ),
          ),
          const SizedBox(height: 12),

          // ── GSTIN ─────────────────────────────────────────────
          TextFormField(
            controller: _gstin,
            textCapitalization: TextCapitalization.characters,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'GSTIN (optional)',
              prefixIcon: Icon(Icons.receipt_long_outlined, size: 18, color: AppColors.textGhost),
              hintText: '22AAAAA0000A1Z5',
            ),
          ),
          const SizedBox(height: 12),

          // ── Address ───────────────────────────────────────────
          TextFormField(
            controller: _address,
            maxLines: 3,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(
              labelText: 'Address',
              prefixIcon: Icon(Icons.location_on_outlined, size: 18, color: AppColors.textGhost),
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 24),

          FCButton(label: 'Save Party', loading: _saving, onPressed: _save),
        ]),
      ),
    );
  }
}
