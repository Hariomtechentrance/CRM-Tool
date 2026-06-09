import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _nameCtrl     = TextEditingController();
  final _emailCtrl    = TextEditingController();
  final _phoneCtrl    = TextEditingController();
  final _passCtrl     = TextEditingController();
  final _confirmCtrl  = TextEditingController();
  bool _obscurePass   = true;
  bool _obscureConf   = true;
  bool _loading       = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _phoneCtrl.dispose();
    _passCtrl.dispose(); _confirmCtrl.dispose();
    super.dispose();
  }

  String? _validatePassword(String? v) {
    if (v == null || v.isEmpty) return 'Password is required';
    if (v.length < 8) return 'At least 8 characters';
    if (!v.contains(RegExp(r'[A-Z]'))) return 'Include at least one uppercase letter';
    if (!v.contains(RegExp(r'[0-9]'))) return 'Include at least one number';
    if (!v.contains(RegExp(r'[^A-Za-z0-9]'))) return 'Include at least one special character';
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiClient().register(
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account created! Please sign in.'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
      context.go('/login');
    } catch (e) {
      if (!mounted) return;
      String msg = 'Registration failed. Please try again.';
      final err = e.toString();
      if (err.contains('409') || err.contains('already exists')) msg = 'An account with this email already exists.';
      if (err.contains('phone')) msg = 'This phone number is already registered.';
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
                const SizedBox(height: 48),

                // ── Logo ──────────────────────────────────────
                Center(
                  child: Container(
                    width: 60, height: 60,
                    decoration: BoxDecoration(gradient: AppColors.gradient, borderRadius: BorderRadius.circular(15)),
                    child: const Center(
                      child: Text('FC', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Center(
                  child: Text('Create your account',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                ),
                const SizedBox(height: 6),
                const Center(
                  child: Text('Join FlowCRM — free to start',
                    style: TextStyle(fontSize: 13, color: AppColors.textSec)),
                ),
                const SizedBox(height: 32),

                // ── Full Name ─────────────────────────────────
                TextFormField(
                  controller: _nameCtrl,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    prefixIcon: Icon(Icons.person_outline, size: 18, color: AppColors.textGhost),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Name is required';
                    if (v.trim().length < 2) return 'Name must be at least 2 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // ── Email ─────────────────────────────────────
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: Icon(Icons.mail_outline, size: 18, color: AppColors.textGhost),
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Email is required';
                    if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v)) return 'Enter a valid email';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // ── Phone (optional) ──────────────────────────
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number (optional)',
                    prefixIcon: Icon(Icons.phone_outlined, size: 18, color: AppColors.textGhost),
                  ),
                  validator: (v) {
                    if (v != null && v.isNotEmpty && v.length < 10) return 'Enter a valid phone number';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // ── Password ──────────────────────────────────
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscurePass,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline, size: 18, color: AppColors.textGhost),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          size: 18, color: AppColors.textGhost),
                      onPressed: () => setState(() => _obscurePass = !_obscurePass),
                    ),
                  ),
                  validator: _validatePassword,
                ),
                const SizedBox(height: 8),
                // Password strength hint
                const Padding(
                  padding: EdgeInsets.only(left: 4),
                  child: Text('Min 8 chars · uppercase · number · special character',
                    style: TextStyle(fontSize: 11, color: AppColors.textGhost)),
                ),
                const SizedBox(height: 14),

                // ── Confirm Password ──────────────────────────
                TextFormField(
                  controller: _confirmCtrl,
                  obscureText: _obscureConf,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _submit(),
                  decoration: InputDecoration(
                    labelText: 'Confirm Password',
                    prefixIcon: const Icon(Icons.lock_outline, size: 18, color: AppColors.textGhost),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureConf ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          size: 18, color: AppColors.textGhost),
                      onPressed: () => setState(() => _obscureConf = !_obscureConf),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Please confirm your password';
                    if (v != _passCtrl.text) return 'Passwords do not match';
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                FCButton(label: 'Create Account', loading: _loading, onPressed: _submit),
                const SizedBox(height: 28),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Already have an account? ', style: TextStyle(fontSize: 13, color: AppColors.textSec)),
                    GestureDetector(
                      onTap: () => context.go('/login'),
                      child: const Text('Sign In',
                        style: TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
