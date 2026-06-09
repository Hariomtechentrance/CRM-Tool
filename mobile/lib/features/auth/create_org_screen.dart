import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';
import '../../data/services/storage_service.dart';
import '../auth/auth_notifier.dart';

const _businessTypes = [
  'TRADING', 'MANUFACTURING', 'SERVICES', 'RETAIL', 'IMPORT_EXPORT',
  'RESTAURANT', 'HOTEL', 'HEALTHCARE', 'ECOMMERCE', 'IT_SERVICES',
  'CONSTRUCTION', 'LOGISTICS', 'EDUCATION', 'OTHER',
];

const _currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'];

class CreateOrgScreen extends ConsumerStatefulWidget {
  const CreateOrgScreen({super.key});

  @override
  ConsumerState<CreateOrgScreen> createState() => _CreateOrgScreenState();
}

class _CreateOrgScreenState extends ConsumerState<CreateOrgScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _nameCtrl     = TextEditingController();
  final _emailCtrl    = TextEditingController();
  final _phoneCtrl    = TextEditingController();
  final _addressCtrl  = TextEditingController();
  final _cityCtrl     = TextEditingController();
  final _gstCtrl      = TextEditingController();
  String _businessType = 'TRADING';
  String _currency     = 'INR';
  bool _loading        = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _phoneCtrl.dispose();
    _addressCtrl.dispose(); _cityCtrl.dispose(); _gstCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final res = await ApiClient().createOrganization({
        'name': _nameCtrl.text.trim(),
        'businessType': _businessType,
        'currency': _currency,
        if (_emailCtrl.text.trim().isNotEmpty) 'email': _emailCtrl.text.trim(),
        if (_phoneCtrl.text.trim().isNotEmpty) 'phone': _phoneCtrl.text.trim(),
        if (_addressCtrl.text.trim().isNotEmpty) 'address': _addressCtrl.text.trim(),
        if (_cityCtrl.text.trim().isNotEmpty) 'city': _cityCtrl.text.trim(),
        if (_gstCtrl.text.trim().isNotEmpty) 'taxId': _gstCtrl.text.trim(),
      });
      final orgData = res.data['data'];
      final orgId = orgData['id'] as String;
      await StorageService().saveActiveOrgId(orgId);
      // Reload auth state to pick up new org
      await ref.read(authNotifierProvider.notifier).refreshSession();
      if (mounted) context.go('/home/dashboard');
    } catch (e) {
      if (!mounted) return;
      String msg = 'Could not create organization. Please try again.';
      if (e.toString().contains('already exists')) msg = 'An organization with this name already exists.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),
                Center(
                  child: Container(
                    width: 60, height: 60,
                    decoration: BoxDecoration(gradient: AppColors.gradient, borderRadius: BorderRadius.circular(15)),
                    child: const Icon(Icons.business_outlined, color: Colors.white, size: 28),
                  ),
                ),
                const SizedBox(height: 20),
                const Center(
                  child: Text('Set up your organization',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                ),
                const SizedBox(height: 6),
                const Center(
                  child: Text('This creates your workspace on FlowCRM',
                    style: TextStyle(fontSize: 13, color: AppColors.textSec)),
                ),
                const SizedBox(height: 32),

                _sectionLabel('Organization Details'),
                const SizedBox(height: 12),

                // ── Org Name ──────────────────────────────────
                TextFormField(
                  controller: _nameCtrl,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Organization Name *',
                    prefixIcon: Icon(Icons.business_outlined, size: 18, color: AppColors.textGhost),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Organization name is required';
                    if (v.trim().length < 2) return 'Name must be at least 2 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // ── Business Type ─────────────────────────────
                DropdownButtonFormField<String>(
                  value: _businessType,
                  decoration: const InputDecoration(
                    labelText: 'Business Type',
                    prefixIcon: Icon(Icons.category_outlined, size: 18, color: AppColors.textGhost),
                  ),
                  items: _businessTypes.map((t) => DropdownMenuItem(
                    value: t,
                    child: Text(_formatEnum(t), style: const TextStyle(fontSize: 13)),
                  )).toList(),
                  onChanged: (v) => setState(() => _businessType = v!),
                ),
                const SizedBox(height: 14),

                // ── Currency ──────────────────────────────────
                DropdownButtonFormField<String>(
                  value: _currency,
                  decoration: const InputDecoration(
                    labelText: 'Default Currency',
                    prefixIcon: Icon(Icons.currency_rupee, size: 18, color: AppColors.textGhost),
                  ),
                  items: _currencies.map((c) => DropdownMenuItem(
                    value: c,
                    child: Text(c, style: const TextStyle(fontSize: 13)),
                  )).toList(),
                  onChanged: (v) => setState(() => _currency = v!),
                ),
                const SizedBox(height: 20),

                _sectionLabel('Contact Info (optional)'),
                const SizedBox(height: 12),

                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Business Email',
                    prefixIcon: Icon(Icons.mail_outline, size: 18, color: AppColors.textGhost),
                  ),
                  validator: (v) {
                    if (v != null && v.isNotEmpty && !RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v)) {
                      return 'Enter a valid email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number',
                    prefixIcon: Icon(Icons.phone_outlined, size: 18, color: AppColors.textGhost),
                  ),
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _gstCtrl,
                  textCapitalization: TextCapitalization.characters,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'GSTIN / Tax ID',
                    prefixIcon: Icon(Icons.receipt_long_outlined, size: 18, color: AppColors.textGhost),
                  ),
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _addressCtrl,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Address',
                    prefixIcon: Icon(Icons.location_on_outlined, size: 18, color: AppColors.textGhost),
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

                FCButton(label: 'Create Organization', loading: _loading, onPressed: _submit, icon: Icons.rocket_launch_outlined),
                const SizedBox(height: 16),

                Center(
                  child: TextButton(
                    onPressed: () => ref.read(authNotifierProvider.notifier).logout(),
                    child: const Text('Sign out', style: TextStyle(fontSize: 13, color: AppColors.textSec)),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String label) => Text(label,
    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
        color: AppColors.textGhost, letterSpacing: 0.5));

  String _formatEnum(String e) => e
      .split('_')
      .map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase())
      .join(' ');
}
