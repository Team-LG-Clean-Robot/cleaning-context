import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/sensor_reading.dart';
import '../api/models/simulate_request.dart';
import '../api/models/simulate_response.dart';
import 'api_provider.dart';

sealed class SimulationState {
  const SimulationState();
}

class SimIdle extends SimulationState {
  const SimIdle();
}

class SimLoading extends SimulationState {
  const SimLoading();
}

class SimLoaded extends SimulationState {
  const SimLoaded(this.response);
  final SimulateResponse response;
}

class SimError extends SimulationState {
  const SimError(this.message);
  final String message;
}

class SimulationController extends StateNotifier<SimulationState> {
  SimulationController(this._ref) : super(const SimIdle());
  final Ref _ref;

  Future<void> runPreset(String scenarioId) =>
      _run(() => _ref.read(endpointsProvider).simulate(SimulateRequest.preset(scenarioId)));

  Future<void> runCustom(CustomContext ctx) =>
      _run(() => _ref.read(endpointsProvider).simulate(SimulateRequest.custom(ctx)));

  Future<void> runWithSensors(
    List<SensorReading> readings, {
    CustomContext? override,
  }) => _run(
        () => _ref.read(endpointsProvider).simulate(
              SimulateRequest.withSensors(readings, override: override),
            ),
      );

  Future<void> _run(Future<SimulateResponse> Function() fn) async {
    state = const SimLoading();
    try {
      final res = await fn();
      state = SimLoaded(res);
    } catch (e) {
      state = SimError(_humanize(e));
    }
  }

  static String _humanize(Object e) {
    final s = e.toString();
    if (s.contains('timeout') || s.contains('Timeout')) {
      return '서버 응답이 늦어요. 잠시 후 다시 시도해주세요.';
    }
    if (s.contains('404')) return '해당 시나리오를 찾을 수 없어요.';
    if (s.contains('400')) return '입력 값에 문제가 있어요.';
    if (s.contains('503') || s.contains('502')) return '서버가 깨어나는 중이에요. 잠시만요.';
    return '오류가 발생했어요: $s';
  }
}

final simulationControllerProvider =
    StateNotifierProvider<SimulationController, SimulationState>(
  (ref) => SimulationController(ref),
);
