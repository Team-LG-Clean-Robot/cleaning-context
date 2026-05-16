import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/sensors_controller.dart';
import '../theme/tokens.dart';

/// Home 화면 상단의 "연결된 IoT 디바이스" 가로 칩 스트립.
/// 현재는 mock — 토글된 센서 수에 따라 활성 색.
class IoTDeviceStripe extends ConsumerWidget {
  const IoTDeviceStripe({super.key});

  static const _devices = [
    ('door_lock', Icons.lock_outline, '도어락'),
    ('induction', Icons.local_fire_department, '인덕션'),
    ('refrigerator', Icons.kitchen, '냉장고'),
    ('air_conditioner', Icons.ac_unit, '에어컨'),
    ('tv', Icons.tv, 'TV'),
    ('bed_sensor', Icons.bed, '침대'),
    ('weather_api', Icons.umbrella, '날씨'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final state = ref.watch(sensorsControllerProvider);
    final activeIds = state.readings.values.map((r) => r.sensorId).toSet();

    return SizedBox(
      height: 64,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        separatorBuilder: (_, __) => const SizedBox(width: kSpacing2),
        itemCount: _devices.length,
        itemBuilder: (_, i) {
          final (id, icon, label) = _devices[i];
          final active = activeIds.contains(id);
          return Container(
            width: 72,
            padding: const EdgeInsets.symmetric(vertical: kSpacing1, horizontal: kSpacing1),
            decoration: BoxDecoration(
              border: Border.all(color: active ? cs.primary : cs.outline),
              borderRadius: BorderRadius.circular(kRadiusMd),
              color: active ? cs.surfaceContainerHighest : cs.surface,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 20, color: active ? cs.primary : cs.onSurface.withValues(alpha: 0.5)),
                const SizedBox(height: 2),
                Text(label,
                    style: TextStyle(
                        fontSize: 11,
                        color: active ? cs.primary : cs.onSurface.withValues(alpha: 0.7))),
              ],
            ),
          );
        },
      ),
    );
  }
}
