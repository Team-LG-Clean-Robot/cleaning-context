import 'package:flutter/material.dart';

import '../api/models/room_score.dart';
import '../theme/text_theme.dart';
import '../theme/tokens.dart';
import 'mode_badge.dart';

class PriorityCard extends StatelessWidget {
  const PriorityCard({super.key, required this.score});
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: kSpacing4, vertical: kSpacing2),
        child: Row(
          children: [
            ModeBadge(mode: score.mode),
            const SizedBox(width: kSpacing2),
            Expanded(
              child: Text(_names[score.roomId] ?? score.roomId,
                  style: const TextStyle(fontSize: 15)),
            ),
            Text('${score.finalScore}',
                style: kMonoStyle.copyWith(fontSize: 18, color: cs.primary)),
          ],
        ),
      ),
    );
  }
}
