import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/room_score.dart';
import '../state/sensors_controller.dart';
import '../state/simulation_controller.dart';
import '../theme/text_theme.dart';
import '../theme/tokens.dart';
import '../widgets/mode_badge.dart';

class ExplainScreen extends ConsumerWidget {
  const ExplainScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final sim = ref.watch(simulationControllerProvider);
    final sensors = ref.watch(sensorsControllerProvider);

    if (sim is! SimLoaded) {
      return _Empty(cs: cs);
    }
    final res = sim.response;
    final sortedRooms = [...res.rooms]..sort((a, b) => b.finalScore.compareTo(a.finalScore));
    final excluded = res.rooms.where((r) => r.mode == RoomMode.excluded).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(kSpacing4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // AI 설명
          Card(
            child: Padding(
              padding: const EdgeInsets.all(kSpacing4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.psychology, size: 18, color: cs.primary),
                    const SizedBox(width: kSpacing1),
                    Text('AI 해석',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: cs.onSurface.withValues(alpha: 0.6))),
                  ]),
                  const SizedBox(height: kSpacing2),
                  Text(res.explanation,
                      style: const TextStyle(fontSize: 15, height: 1.5)),
                ],
              ),
            ),
          ),
          const SizedBox(height: kSpacing4),

          // 점수 breakdown
          Text('점수 breakdown',
              style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.7))),
          const SizedBox(height: kSpacing2),
          ...sortedRooms.map((r) => _BreakdownCard(score: r)),

          // 제외 방
          if (excluded.isNotEmpty) ...[
            const SizedBox(height: kSpacing4),
            Text('제외된 공간',
                style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.7))),
            const SizedBox(height: kSpacing2),
            ...excluded.map((r) => Card(
                  child: ListTile(
                    leading: Icon(Icons.block, color: cs.error),
                    title: Text(_roomName(r.roomId)),
                    subtitle: Text(r.exclusionReason ?? '점수가 0 이하'),
                  ),
                )),
          ],

          // Sensor → Event trace (v2)
          if (sensors.lastInfer != null && sensors.lastInfer!.inferredEvents.isNotEmpty) ...[
            const SizedBox(height: kSpacing6),
            Text('Sensor → Event trace',
                style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.7))),
            const SizedBox(height: kSpacing2),
            ...sensors.lastInfer!.inferredEvents.map((e) => Card(
                  child: Padding(
                    padding: const EdgeInsets.all(kSpacing4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Text(e.eventId,
                              style: const TextStyle(fontFamily: 'JetBrainsMono', fontWeight: FontWeight.w600)),
                          const Spacer(),
                          Text('${(e.confidence * 100).toStringAsFixed(0)}%',
                              style: kMonoStyle.copyWith(color: cs.primary)),
                        ]),
                        const SizedBox(height: kSpacing1),
                        Text('${e.source.name} · ${e.triggeredBy.join(", ")}',
                            style: kMonoStyle.copyWith(
                                fontSize: 11, color: cs.onSurface.withValues(alpha: 0.5))),
                        if (e.ruleDescriptions.isNotEmpty) ...[
                          const SizedBox(height: kSpacing1),
                          ...e.ruleDescriptions.map(
                            (d) => Text('• $d',
                                style: TextStyle(
                                    fontSize: 13, color: cs.onSurface.withValues(alpha: 0.75))),
                          ),
                        ],
                      ],
                    ),
                  ),
                )),
          ],
        ],
      ),
    );
  }
}

class _BreakdownCard extends StatelessWidget {
  const _BreakdownCard({required this.score});
  final RoomScore score;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: kSpacing2),
      child: Card(
        child: ExpansionTile(
          shape: const RoundedRectangleBorder(),
          collapsedShape: const RoundedRectangleBorder(),
          tilePadding: const EdgeInsets.symmetric(horizontal: kSpacing4),
          childrenPadding: const EdgeInsets.fromLTRB(kSpacing4, 0, kSpacing4, kSpacing4),
          title: Row(
            children: [
              ModeBadge(mode: score.mode),
              const SizedBox(width: kSpacing2),
              Expanded(child: Text(_roomName(score.roomId), style: const TextStyle(fontSize: 15))),
              Text('${score.finalScore}', style: kMonoStyle.copyWith(fontSize: 16, color: cs.primary)),
            ],
          ),
          children: [
            for (final c in score.breakdown)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Expanded(child: Text(c.labelKo, style: const TextStyle(fontSize: 13))),
                    Text((c.delta >= 0 ? '+' : '') + c.delta.toString(),
                        style: kMonoStyle.copyWith(
                            fontSize: 13, color: c.delta >= 0 ? cs.primary : cs.error)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.cs});
  final ColorScheme cs;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(kSpacing8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.psychology, size: 48, color: cs.onSurface.withValues(alpha: 0.3)),
              const SizedBox(height: kSpacing4),
              Text('홈 탭에서 시나리오를 먼저 실행해주세요',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: cs.onSurface.withValues(alpha: 0.6))),
            ],
          ),
        ),
      );
}

String _roomName(String id) => switch (id) {
      'entrance' => '현관',
      'living' => '거실',
      'kitchen' => '주방',
      'bedroom' => '침실',
      'bathroom' => '욕실',
      _ => id,
    };
