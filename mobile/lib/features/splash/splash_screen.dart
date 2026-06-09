import 'package:flutter/material.dart';
import '../../core/theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                gradient: AppColors.gradient,
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Center(
                child: Text('FC', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
              ),
            ),
            const SizedBox(height: 20),
            const Text('FlowCRM', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            const SizedBox(height: 6),
            const Text('Business management for every industry', style: TextStyle(fontSize: 13, color: AppColors.textGhost)),
            const SizedBox(height: 40),
            const SizedBox(
              width: 24, height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}
