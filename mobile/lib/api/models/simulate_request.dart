import 'package:freezed_annotation/freezed_annotation.dart';

import 'sensor_reading.dart';

part 'simulate_request.freezed.dart';
part 'simulate_request.g.dart';

/// /api/simulate payload — preset 시나리오 / 직접 입력 / IoT 센서 입력 중 택1 (혹은 sensor+override 병용).
@freezed
class SimulateRequest with _$SimulateRequest {
  const factory SimulateRequest({
    @JsonKey(name: 'scenario_id') String? scenarioId,
    CustomContext? custom,
    @JsonKey(name: 'sensor_readings') List<SensorReading>? sensorReadings,
  }) = _SimulateRequest;

  factory SimulateRequest.preset(String scenarioId) =>
      SimulateRequest(scenarioId: scenarioId);

  factory SimulateRequest.custom(CustomContext ctx) =>
      SimulateRequest(custom: ctx);

  factory SimulateRequest.withSensors(
    List<SensorReading> readings, {
    CustomContext? override,
  }) => SimulateRequest(sensorReadings: readings, custom: override);

  factory SimulateRequest.fromJson(Map<String, dynamic> json) =>
      _$SimulateRequestFromJson(json);
}

@freezed
class CustomContext with _$CustomContext {
  const factory CustomContext({
    @JsonKey(name: 'current_time') required String currentTime,
    @JsonKey(name: 'sleep_time') required String sleepTime,
    @JsonKey(name: 'user_location') String? userLocation,
    @JsonKey(name: 'active_events') @Default([]) List<String> activeEvents,
    @JsonKey(name: 'gap_rooms') @Default([]) List<String> gapRooms,
  }) = _CustomContext;

  factory CustomContext.fromJson(Map<String, dynamic> json) =>
      _$CustomContextFromJson(json);
}
