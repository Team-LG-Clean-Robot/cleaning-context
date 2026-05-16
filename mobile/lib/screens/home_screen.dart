import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/scenarios_provider.dart';
import '../state/simulation_controller.dart';
import '../theme/tokens.dart';
import '../widgets/iot_device_stripe.dart';
import '../widgets/loading_skeleton.dart';
import '../widgets/priority_card.dart';
import '../widgets/scenario_chip.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final scenarios = ref.watch(scenariosProvider);
    final sim = ref.watch(simulationControllerProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(kSpacing4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. 컨텍스트 요약 카드
          _ContextCard(sim: sim),
          const SizedBox(height: kSpacing4),

          // 2. IoT 디바이스 스트립
          const IoTDeviceStripe(),
          const SizedBox(height: kSpacing4),

          // 3. 시나리오 chips
          Text('빠른 시나리오',
              style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.7))),
          const SizedBox(height: kSpacing2),
          scenarios.when(
            loading: () => const SizedBox(height: 80, child: Center(child: CircularProgressIndicator())),
            error: (e, _) => Text('시나리오 불러오기 실패: $e', style: TextStyle(color: cs.error)),
            data: (list) => Wrap(
              spacing: kSpacing2,
              runSpacing: kSpacing2,
              children: list
                  .map((s) => ScenarioChip(
                        scenario: s,
                        onTap: () =>
                            ref.read(simulationControllerProvider.notifier).runPreset(s.id),
                      ))
                  .toList(growable: false),
            ),
          ),
          const SizedBox(height: kSpacing6),

          // 4. Top 3 priority
          if (sim is SimLoading)
            const PriorityListSkeleton()
          else if (sim is SimLoaded) ...[
            Text('우선순위 (상위 3개)',
                style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.7))),
            const SizedBox(height: kSpacing2),
            ...sim.response.rooms
                .toList()
                .let((rs) {
                  rs.sort((a, b) => b.finalScore.compareTo(a.finalScore));
                  return rs;
                })
                .take(3)
                .map((r) => Padding(
                      padding: const EdgeInsets.only(bottom: kSpacing2),
                      child: PriorityCard(score: r),
                    )),
            const SizedBox(height: kSpacing4),
            FilledButton.icon(
              onPressed: () => context.go('/explain'),
              icon: const Icon(Icons.psychology),
              label: const Text('왜 이렇게 결정했어?'),
            ),
          ] else if (sim is SimError)
            _ErrorCard(message: sim.message)
          else
            const _HintCard(),
        ],
      ),
    );
  }
}

class _ContextCard extends StatelessWidget {
  const _ContextCard({required this.sim});
  final SimulationState sim;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final summary = switch (sim) {
      SimLoaded(:final response) => response.contextSummary,
      SimLoading() => '계산 중...',
      SimError(:final message) => message,
      _ => '시나리오 또는 센서 입력을 선택해주세요',
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(kSpacing4),
        child: Row(
          children: [
            Container(width: 2, height: 24, color: cs.primary),
            const SizedBox(width: kSpacing2),
            Expanded(
              child: Text(summary,
                  style: TextStyle(fontSize: 14, color: cs.onSurface.withValues(alpha: 0.85))),
            ),
          ],
        ),
      ),
    );
  }
}

class _HintCard extends StatelessWidget {
  const _HintCard();
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(kSpacing6),
        child: Column(
          children: [
            Icon(Icons.touch_app, size: 32, color: cs.onSurface.withValues(alpha: 0.4)),
            const SizedBox(height: kSpacing2),
            Text('위 시나리오 chip을 탭하거나, 센서 탭에서\nIoT 시그널을 토글해보세요',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.6))),
          ],
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(kSpacing4),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: cs.error),
            const SizedBox(width: kSpacing2),
            Expanded(child: Text(message, style: TextStyle(color: cs.error))),
          ],
        ),
      ),
    );
  }
}

// 간단한 List.let 헬퍼
extension<T> on T {
  R let<R>(R Function(T) f) => f(this);
}
