import 'package:freezed_annotation/freezed_annotation.dart';

part 'sensor_reading.freezed.dart';
part 'sensor_reading.g.dart';

/// 단일 IoT 센서의 시점 시그널. (v2, docs/IOT_DOMAIN.md)
@freezed
class SensorReading with _$SensorReading {
  const factory SensorReading({
    @JsonKey(name: 'sensor_id') required String sensorId,
    required Map<String, dynamic> state,
    required DateTime ts,
    @JsonKey(name: 'room_id') String? roomId,
  }) = _SensorReading;

  factory SensorReading.fromJson(Map<String, dynamic> json) =>
      _$SensorReadingFromJson(json);
}
