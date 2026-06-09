import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

final _orgProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await ApiClient().getOrganization();
  return res.data['data'] as Map<String, dynamic>? ?? {};
});

const _businessTypes = ['TRADING','MANUFACTURING','SERVICES','RETAIL','IMPORT_EXPORT',
  'RESTAURANT','HOTEL','HEALTHCARE','ECOMMERCE','IT_SERVICES','CONSTRUCTION','LOGISTICS','EDUCATION','OTHER'];
const _currencies = ['INR','USD','EUR','GBP','AED','SGD','AUD'];

class OrgSettingsScreen extends ConsumerStatefulWidget {
  const OrgSettingsScreen({super.key});
  @override
  ConsumerState<OrgSettingsScreen> createState() => _OrgSettingsScreenState();
}

class _OrgSettingsScreenState extends ConsumerState<OrgSettingsScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _nameCtrl   = TextEditingController();
  final _emailCtrl  = TextEditingController();
  final _phoneCtrl  = TextEditingController();
  final _gstinCtrl  = TextEditingController();
  final _addressCtrl= TextEditingController();
  final _cityCtrl   = TextEditingController();
  String _type     = 'TRADING';
  String _currency = 'INR';
  bool _loading    = false;
  bool _populated  = false;

  void _populate(Map<String, dynamic> org) {
    if (_populated) return;
    _populated = true;
    _nameCtrl.text    = org['name']    as String? ?? '';
    _emailCtrl.text   = org['email']   as String? ?? '';
    _phoneCtrl.text   = org['phone']   as String? ?? '';
    _gstinCtrl.text   = org['gstin']   as String? ?? '';
    _addressCtrl.text = org['address'] as String? ?? '';
    _cityCtrl.text    = org['city']    as String? ?? '';
    _type     = org['businessType'] as String? ?? 'TRADING';
    _currency = org['currency']    as String? ?? 'INR';
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _phoneCtrl.dispose();
    _gstinCtrl.dispose(); _addressCtrl.dispose(); _cityCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiClient().updateOrganization({
        'name':         _nameCtrl.text.trim(),
        'businessType': _type,
        'currency':     _currency,
        if (_emailCtrl.text.trim().isNotEmpty)   'email':   _emailCtrl.text.trim(),
        if (_phoneCtrl.text.trim().isNotEmpty)   'phone':   _phoneCtrl.text.trim(),
        if (_gstinCtrl.text.trim().isNotEmpty)   'gstin':   _gstinCtrl.text.trim(),
        if (_addressCtrl.text.trim().isNotEmpty) 'address': _addressCtrl.text.trim(),
        if (_cityCtrl.text.trim().isNotEmpty)    'city':    _cityCtrl.text.trim(),
      });
      if (!mounted) return;
      ref.invalidate(_orgProvider);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Organization updated'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to update organization'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final org = ref.watch(_orgProvider);
    org.whenData((d) => _populate(d));

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(title: const Text('Organization Settings')),
      body: org.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error:   (e, _) => Center(child: Text('Error: $e')),
        data: (d) => Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              TextFormField(
                controller: _nameCtrl,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Organization Name *',
                  prefixIcon: Icon(Icons.business_outlined, size: 18, color: AppColors.textGhost),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                value: _businessTypes.contains(_type) ? _type : _businessTypes.first,
                decoration: const InputDecoration(
                  labelText: 'Business Type',
                  prefixIcon: Icon(Icons.category_outlined, size: 18, color: AppColors.textGhost),
                ),
                items: _businessTypes.map((t) => DropdownMenuItem(value: t, child: Text(t.replaceAll('_', ' ')))).toList(),
                onChanged: (v) => setState(() => _type = v!),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                value: _currencies.contains(_currency) ? _currency : 'INR',
                decoration: const InputDecoration(
                  labelText: 'Currency',
                  prefixIcon: Icon(Icons.attach_money, size: 18, color: AppColors.textGhost),
                ),
                items: _currencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => setState(() => _currency = v!),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Contact Email',
                  prefixIcon: Icon(Icons.email_outlined, size: 18, color: AppColors.textGhost),
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
                controller: _gstinCtrl,
                textCapitalization: TextCapitalization.characters,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'GSTIN',
                  prefixIcon: Icon(Icons.badge_outlined, size: 18, color: AppColors.textGhost),
                ),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _addressCtrl,
                maxLines: 2,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Address',
                  prefixIcon: Icon(Icons.location_on_outlined, size: 18, color: AppColors.textGhost),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _cityCtrl,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'City',
                  prefixIcon: Icon(Icons.location_city_outlined, size: 18, color: AppColors.textGhost),
                ),
              ),
              const SizedBox(height: 28),
              FCButton(label: 'Save Changes', loading: _loading, onPressed: _submit, icon: Icons.save_outlined),
              const SizedBox(height: 24),
            ]),
          ),
        ),
      ),
    );
  }
}
