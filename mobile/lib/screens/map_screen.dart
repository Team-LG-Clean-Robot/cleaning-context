import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/room_score.dart';
import '../state/simulation_controller.dart';
import '../theme/text_theme.dart';
import '../theme/tokens.dart';
import '../widgets/house_map_painter.dart';
import '../widgets/mode_badge.dart';
import '../widgets/room_detail_sheet.dart';

class MapScreen extends ConsumerWidget {
  const MapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final sim = ref.watch(simulationControllerProvider);

    final rooms = sim is SimLoaded ? sim.response.rooms : const <RoomScore>[];

    return Padding(
      padding: const EdgeInsets.all(kSpacing4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 평면도 (탭 가능)
          AspectRatio(
            aspectRatio: HouseMapPainter.viewBoxSize.width /
                HouseMapPainter.viewBoxSize.height,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return GestureDetector(
                  onTapDown: (d) {
                    final room = HouseMapPainter.hitTest(d.localPosition, constraints.biggest);
                    if (room != null) {
                      final score = rooms.firstWhere(
                        (r) => r.roomId == room,
                        orElse: () => RoomScore(
                          roomId: room,
                          base: 0,
                          breakdown: const [],
                          finalScore: 0,
                          mode: RoomMode.normal,
                        ),
                      );
                      showModalBottomSheet(
                        context: context,
                        builder: (_) => RoomDetailSheet(score: score),
                      );
                    }
                  },
                  child: CustomPaint(
                    painter: HouseMapPainter(rooms: rooms, scheme: cs),
                    size: Size.infinite,
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: kSpacing4),

          if (rooms.isEmpty)
            Padding(
              padding: const EdgeInsets.all(kSpacing4),
              child: Text('시나리오를 먼저 실행하면 방별 점수가 표시돼요',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: cs.onSurface.withValues(alpha: 0.5))),
            )
          else
            Expanded(
              child: ListView(
                children: rooms
                    .toList()
                    .let((r) {
                      r.sort((a, b) => b.finalScore.compareTo(a.finalScore));
                      return r;
                    })
                    .map((r) => ListTile(
                          leading: ModeBadge(mode: r.mode),
                          title: Text(_roomName(r.roomId)),
                          trailing: Text('${r.finalScore}',
                              style: kMonoStyle.copyWith(fontSize: 15, color: cs.primary)),
                          dense: true,
                        ))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}

String _roomName(String id) => switch (id) {
      'entrance' => '현관',
      'living' => '거실',
      'kitchen' => '주방',
      'bedroom' => '침실',
      'bathroom' => '욕실',
      _ => id,
    };

extension<T> on T {
  R let<R>(R Function(T) f) => f(this);
}
