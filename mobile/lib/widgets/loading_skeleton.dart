import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class PriorityListSkeleton extends StatelessWidget {
  const PriorityListSkeleton({super.key, this.count = 3});
  final int count;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: List.generate(
          count,
          (_) => Padding(
                padding: const EdgeInsets.only(bottom: kSpacing2),
                child: Container(
                  height: 56,
                  decoration: BoxDecoration(
                    color: cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(kRadiusMd),
                    border: Border.all(color: cs.outline),
                  ),
                ),
              )),
    );
  }
}
