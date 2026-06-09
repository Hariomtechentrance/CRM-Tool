import 'package:flutter/material.dart';
import '../../core/theme.dart';

class FCButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;
  final Color? color;

  const FCButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading = false,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) => ElevatedButton(
    onPressed: loading ? null : onPressed,
    style: ElevatedButton.styleFrom(
      backgroundColor: color ?? AppColors.primary,
      foregroundColor: Colors.white,
      minimumSize: const Size.fromHeight(48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      elevation: 0,
    ),
    child: loading
      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
      : Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[Icon(icon, size: 16), const SizedBox(width: 8)],
            Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          ],
        ),
  );
}
