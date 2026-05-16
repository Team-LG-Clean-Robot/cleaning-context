import 'package:freezed_annotation/freezed_annotation.dart';

import 'sensor_reading.dart';

part 'infer_request.freezed.dart';
part 'infer_request.g.dart';

@JsonEnum(valueField: 'wire')
enum InferMode {
  rule('rule'),
  ml('ml'),
  hybrid('hybrid');

  const InferMode(this.wire);
  final String wire;
}

@freezed
class InferRequest with _$InferRequest {
  const factory InferRequest({
    @Default([]) List<SensorReading> readings,
    @JsonKey(name: 'current_time') required String currentTime,
    required int weekday,
    @JsonKey(name: 'sleep_time') @Default('23:00') String sleepTime,
    @Default(InferMode.hybrid) InferMode mode,
  }) = _InferRequest;

  factory InferRequest.fromJson(Map<String, dynamic> json) =>
      _$InferRequestFromJson(json);
}
