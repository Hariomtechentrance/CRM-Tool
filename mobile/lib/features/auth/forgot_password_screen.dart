import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  bool _loading    = false;
  bool _sent       = false;

  @override
  void dispose() { _emailCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiClient().forgotPassword(_emailCtrl.text.trim());
      if (mounted) setState(() { _sent = true; _loading = false; });
    } catch (_) {
      // Always show success to prevent email enumeration
      if (mounted) setState(() { _sent = true; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => context.go('/login'),
        ),
        title: const Text('Forgot Password'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: _sent ? _buildSuccess() : _buildForm(),
        ),
      ),
    );
  }

  Widget _buildForm() => Form(
    key: _formKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 48),
        Center(
          child: Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.lock_reset, color: AppColors.primary, size: 30),
          ),
        ),
        const SizedBox(height: 24),
        const Center(
          child: Text('Reset your password',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        ),
        const SizedBox(height: 8),
        const Center(
          child: Text("Enter your email and we'll send a reset link",
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.textSec)),
        ),
        const SizedBox(height: 36),
        TextFormField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _submit(),
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
        const SizedBox(height: 24),
        FCButton(label: 'Send Reset Link', loading: _loading, onPressed: _submit),
        const SizedBox(height: 20),
        Center(
          child: GestureDetector(
            onTap: () => context.go('/login'),
            child: const Text('Back to Sign In',
              style: TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600)),
          ),
        ),
      ],
    ),
  );

  Widget _buildSuccess() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const SizedBox(height: 60),
      Center(
        child: Container(
          width: 72, height: 72,
          decoration: BoxDecoration(
            color: AppColors.success.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(Icons.mark_email_read_outlined, color: AppColors.success, size: 34),
        ),
      ),
      const SizedBox(height: 24),
      const Center(
        child: Text('Check your email',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
      ),
      const SizedBox(height: 10),
      Center(
        child: Text(
          "We've sent a password reset link to\n${_emailCtrl.text.trim()}",
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 14, color: AppColors.textSec, height: 1.5),
        ),
      ),
      const SizedBox(height: 12),
      const Center(
        child: Text("Didn't receive it? Check your spam folder.",
          style: TextStyle(fontSize: 12, color: AppColors.textGhost)),
      ),
      const SizedBox(height: 36),
      FCButton(label: 'Back to Sign In', onPressed: () => context.go('/login')),
      const SizedBox(height: 16),
      Center(
        child: GestureDetector(
          onTap: () => setState(() => _sent = false),
          child: const Text('Try a different email',
            style: TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600)),
        ),
      ),
    ],
  );
}
