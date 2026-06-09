import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/connectivity.dart';
import '../../core/theme.dart';

/// Wraps [child] with a top banner that appears when the device goes offline.
/// Usage:
///   body: OfflineBanner(child: YourScreenBody()),
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(isOnlineProvider);
    return Column(
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          height: online ? 0 : 36,
          color: AppColors.danger,
          child: online
              ? const SizedBox.shrink()
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.wifi_off_rounded, size: 14, color: Colors.white),
                    SizedBox(width: 6),
                    Text(
                      'No internet connection',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
        ),
        Expanded(child: child),
      ],
    );
  }
}
