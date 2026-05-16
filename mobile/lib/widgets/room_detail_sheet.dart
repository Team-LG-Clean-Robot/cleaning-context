import 'package:flutter/material.dart';

import '../api/models/room_score.dart';
import '../theme/text_theme.dart';
import '../theme/tokens.dart';
import 'mode_badge.dart';

class RoomDetailSheet extends StatelessWidget {
  const RoomDetailSheet({super.key, required this.score});
  final RoomScore score;

  static const _names = {
    'entrance': '현관',
    'living': '거실',
    'kitchen': '주방',
    'bedroom': '침실',
    'bathroom': '욕실',
  };

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(kSpacing6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ModeBadge(mode: score.mode),
                const SizedBox(width: kSpacing2),
                Text(_names[score.roomId] ?? score.roomId,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                const Spacer(),
                Text('${score.finalScore}',
                    style: kMonoStyle.copyWith(fontSize: 24, color: cs.primary)),
              ],
            ),
            const SizedBox(height: kSpacing4),
            const Divider(),
            const SizedBox(height: kSpacing2),
            Text('점수 breakdown',
                style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.6))),
            const SizedBox(height: kSpacing2),
            if (score.breakdown.isEmpty)
              Text('(데이터 없음)',
                  style: TextStyle(color: cs.onSurface.withValues(alpha: 0.5)))
            else
              ...score.breakdown.map((c) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      children: [
                        Expanded(child: Text(c.labelKo)),
                        Text((c.delta >= 0 ? '+' : '') + c.delta.toString(),
                            style: kMonoStyle.copyWith(
                                color: c.delta >= 0 ? cs.primary : cs.error)),
                      ],
                    ),
                  )),
            if (score.exclusionReason != null) ...[
              const SizedBox(height: kSpacing4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(kSpacing2),
                decoration: BoxDecoration(
                  color: cs.error.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(kRadiusMd),
                ),
                child: Text('제외 사유: ${score.exclusionReason}',
                    style: TextStyle(color: cs.error, fontSize: 13)),
              ),
            ],
            const SizedBox(height: kSpacing4),
          ],
        ),
      ),
    );
  }
}
