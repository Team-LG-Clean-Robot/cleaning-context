import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/sensor_reading.dart';
import '../state/sensors_controller.dart';
import '../theme/text_theme.dart';
import '../theme/tokens.dart';
import '../widgets/sensor_tile.dart';

/// 12개 IoT 센서 mock 토글 + AI 자동 모드 + 추론 결과 카드.
/// 사용자 product 메시지: "사용자가 시간·이벤트를 직접 누를 필요 없이 IoT 시그널로 추론".
class SensorsScreen extends ConsumerWidget {
  const SensorsScreen({super.key});

  // 12개 센서 mock 토글 spec. docs/IOT_DOMAIN.md §2.1 카탈로그 1:1.
  static const _catalog = [
    _SensorSpec(id: 'door_lock', nameKo: '현관 도어락 (바깥에서 열림)', icon: Icons.lock_open,
        state: {'state': 'unlocked', 'side': 'out'}),
    _SensorSpec(id: 'induction', nameKo: '인덕션 (6분째 가동)', icon: Icons.local_fire_department,
        state: {'state': 'on', 'duration_min': 6, 'power_level': 5}),
    _SensorSpec(id: 'microwave', nameKo: '전자레인지 (3분째 가동)', icon: Icons.microwave,
        state: {'state': 'on', 'duration_min': 3}),
    _SensorSpec(id: 'refrigerator', nameKo: '냉장고 (1시간 5회 개폐)', icon: Icons.kitchen,
        state: {'open_count_last_1h': 5}),
    _SensorSpec(id: 'air_conditioner', nameKo: '거실 에어컨 (가동 중)', icon: Icons.ac_unit,
        state: {'state': 'on', 'room_id': 'living'}, room: 'living'),
    _SensorSpec(id: 'tv', nameKo: 'TV (30분째 켜짐)', icon: Icons.tv,
        state: {'state': 'on', 'duration_min': 31}),
    _SensorSpec(id: 'bed_sensor', nameKo: '침대 압력 (점유)', icon: Icons.bed,
        state: {'occupied': true}),
    _SensorSpec(id: 'motion_sensor', nameKo: '거실 모션 감지', icon: Icons.directions_walk,
        state: {'room_id': 'living'}, room: 'living'),
    _SensorSpec(id: 'humidity_bath', nameKo: '욕실 습도 급증 (샤워 직후)', icon: Icons.shower,
        state: {'rh': 85, 'rh_delta_last_10min': 25}),
    _SensorSpec(id: 'smart_speaker', nameKo: '스마트 스피커 (음성 깨움)', icon: Icons.mic,
        state: {'room_id': 'living'}, room: 'living'),
    _SensorSpec(id: 'weather_api', nameKo: '날씨 (비)', icon: Icons.umbrella,
        state: {'condition': 'rain', 'last_1h_rain_mm': 3.2}),
    _SensorSpec(id: 'calendar', nameKo: '캘린더 (1시간 후 손님)', icon: Icons.event,
        state: {'upcoming_event_tag': 'guest', 'within_min': 60}),
  ];

  String _key(_SensorSpec s) => s.room != null ? '${s.id}#${s.room}' : s.id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final state = ref.watch(sensorsControllerProvider);
    final ctrl = ref.read(sensorsControllerProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(kSpacing4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 상단 안내 + AI 자동 모드 토글
          Card(
            child: Padding(
              padding: const EdgeInsets.all(kSpacing4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.sensors, size: 18, color: cs.primary),
                    const SizedBox(width: kSpacing1),
                    const Text('IoT 센서 입력',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: kSpacing1),
                  Text(
                    '"나 지금 귀가" 같은 이벤트를 누를 필요 없이, 도어락·인덕션·침대 센서 등 IoT 시그널로 상황을 추론합니다.',
                    style: TextStyle(
                        fontSize: 13, color: cs.onSurface.withValues(alpha: 0.7)),
                  ),
                  const SizedBox(height: kSpacing2),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('AI 자동 모드'),
                    subtitle: Text(state.autoInfer ? '토글 즉시 추론 + 시뮬레이션' : '수동 — 아래 "시뮬레이션 실행" 버튼',
                        style: const TextStyle(fontSize: 12)),
                    value: state.autoInfer,
                    onChanged: ctrl.setAutoInfer,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: kSpacing4),

          // 추론 결과
          if (state.lastInfer != null && state.lastInfer!.inferredEvents.isNotEmpty)
            _InferResultCard(events: state.lastInfer!.inferredEvents
                .map((e) => '${e.eventId} (${(e.confidence * 100).toStringAsFixed(0)}%)')
                .toList()),
          if (state.lastInfer != null && state.lastInfer!.inferredEvents.isNotEmpty)
            const SizedBox(height: kSpacing4),

          // 센서 카탈로그
          ..._catalog.map((s) {
            final k = _key(s);
            final active = state.readings.containsKey(k);
            return Padding(
              padding: const EdgeInsets.only(bottom: kSpacing2),
              child: SensorTile(
                icon: s.icon,
                nameKo: s.nameKo,
                sensorId: s.id,
                active: active,
                onChanged: (v) {
                  if (v) {
                    ctrl.toggleSensor(
                      k,
                      SensorReading(
                        sensorId: s.id,
                        state: Map<String, dynamic>.from(s.state),
                        ts: DateTime.now(),
                        roomId: s.room,
                      ),
                    );
                  } else {
                    ctrl.toggleSensor(k, null);
                  }
                },
              ),
            );
          }),
          const SizedBox(height: kSpacing4),

          // 액션 버튼
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: state.readings.isEmpty ? null : () => ctrl.clearAll(),
                  icon: const Icon(Icons.clear_all),
                  label: const Text('전부 해제'),
                ),
              ),
              const SizedBox(width: kSpacing2),
              Expanded(
                child: FilledButton.icon(
                  onPressed: state.readings.isEmpty || state.loading
                      ? null
                      : () => ctrl.runOnce(),
                  icon: state.loading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.play_arrow),
                  label: const Text('시뮬레이션 실행'),
                ),
              ),
            ],
          ),
          const SizedBox(height: kSpacing4),
        ],
      ),
    );
  }
}

class _SensorSpec {
  const _SensorSpec({
    required this.id,
    required this.nameKo,
    required this.icon,
    required this.state,
    this.room,
  });
  final String id;
  final String nameKo;
  final IconData icon;
  final Map<String, dynamic> state;
  final String? room;
}

class _InferResultCard extends StatelessWidget {
  const _InferResultCard({required this.events});
  final List<String> events;
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(kSpacing4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.psychology, size: 18, color: cs.primary),
              const SizedBox(width: kSpacing1),
              const Text('추론된 events', style: TextStyle(fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: kSpacing2),
            Wrap(
              spacing: kSpacing2,
              runSpacing: kSpacing1,
              children: events
                  .map((e) => Chip(
                        label: Text(e, style: kMonoStyle.copyWith(fontSize: 12)),
                        visualDensity: VisualDensity.compact,
                      ))
                  .toList(growable: false),
            ),
          ],
        ),
      ),
    );
  }
}
