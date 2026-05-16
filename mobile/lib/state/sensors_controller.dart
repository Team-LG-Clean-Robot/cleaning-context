import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/infer_request.dart';
import '../api/models/infer_response.dart';
import '../api/models/sensor_reading.dart';
import 'api_provider.dart';
import 'simulation_controller.dart';

/// Sensors 화면 상태: 현재 토글된 센서 readings + 마지막 추론 결과 + AI 자동 모드.
class SensorsState {
  const SensorsState({
    this.readings = const <String, SensorReading>{},
    this.lastInfer,
    this.autoInfer = false,
    this.loading = false,
  });

  /// sensor_id 또는 sensor_id#room_id (room별 인스턴스) → SensorReading
  final Map<String, SensorReading> readings;
  final InferResponse? lastInfer;
  final bool autoInfer;
  final bool loading;

  SensorsState copyWith({
    Map<String, SensorReading>? readings,
    InferResponse? lastInfer,
    bool? autoInfer,
    bool? loading,
  }) =>
      SensorsState(
        readings: readings ?? this.readings,
        lastInfer: lastInfer ?? this.lastInfer,
        autoInfer: autoInfer ?? this.autoInfer,
        loading: loading ?? this.loading,
      );

  List<SensorReading> get readingsList => readings.values.toList(growable: false);
}

class SensorsController extends StateNotifier<SensorsState> {
  SensorsController(this._ref) : super(const SensorsState());
  final Ref _ref;

  void toggleSensor(String key, SensorReading? reading) {
    final next = Map<String, SensorReading>.from(state.readings);
    if (reading == null) {
      next.remove(key);
    } else {
      next[key] = reading;
    }
    state = state.copyWith(readings: next);
    if (state.autoInfer) {
      // 자동 모드면 토글 즉시 추론 + simulate 체인
      _runChain();
    }
  }

  void clearAll() => state = const SensorsState();

  void setAutoInfer(bool v) {
    state = state.copyWith(autoInfer: v);
    if (v && state.readings.isNotEmpty) _runChain();
  }

  /// 수동 "시뮬레이션 실행" 버튼 핸들러 + 자동 모드 트리거가 공유.
  Future<void> runOnce() async => _runChain();

  Future<void> _runChain({String currentTime = '19:30', int weekday = 1, String sleepTime = '23:00'}) async {
    state = state.copyWith(loading: true);
    final api = _ref.read(endpointsProvider);
    try {
      final res = await api.inferEvents(InferRequest(
        readings: state.readingsList,
        currentTime: currentTime,
        weekday: weekday,
        sleepTime: sleepTime,
      ));
      state = state.copyWith(lastInfer: res, loading: false);
      await _ref.read(simulationControllerProvider.notifier).runWithSensors(state.readingsList);
    } catch (e) {
      state = state.copyWith(loading: false);
      // 에러는 simulationController가 흡수
    }
  }
}

final sensorsControllerProvider =
    StateNotifierProvider<SensorsController, SensorsState>((ref) => SensorsController(ref));
