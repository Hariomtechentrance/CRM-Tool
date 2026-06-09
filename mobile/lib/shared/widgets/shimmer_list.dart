import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/theme.dart';

/// Drop-in replacement for a loading spinner inside list screens.
/// Shows [itemCount] shimmer rows of [itemHeight] while data is loading.
class ShimmerList extends StatelessWidget {
  const ShimmerList({
    super.key,
    this.itemCount = 8,
    this.itemHeight = 72.0,
    this.padding = const EdgeInsets.fromLTRB(16, 8, 16, 80),
  });

  final int itemCount;
  final double itemHeight;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.border,
      highlightColor: AppColors.bgLight,
      child: ListView.builder(
        padding: padding,
        itemCount: itemCount,
        itemBuilder: (_, __) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Container(
            height: itemHeight,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(height: 13, width: double.infinity, color: Colors.white),
                      const SizedBox(height: 6),
                      Container(height: 11, width: 160, color: Colors.white),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(height: 13, width: 60, color: Colors.white),
                    const SizedBox(height: 6),
                    Container(height: 11, width: 40, color: Colors.white),
                  ],
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
