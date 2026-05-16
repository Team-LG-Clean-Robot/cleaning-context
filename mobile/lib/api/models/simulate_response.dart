import 'package:freezed_annotation/freezed_annotation.dart';

import 'room_score.dart';

part 'simulate_response.freezed.dart';
part 'simulate_response.g.dart';

@freezed
class SimulateResponse with _$SimulateResponse {
  const factory SimulateResponse({
    @JsonKey(name: 'scenario_id') String? scenarioId,
    @JsonKey(name: 'context_summary') required String contextSummary,
    required List<RoomScore> rooms,
    required String explanation,
    required bool fallback,
    @JsonKey(name: 'duration_ms') required int durationMs,
  }) = _SimulateResponse;

  factory SimulateResponse.fromJson(Map<String, dynamic> json) =>
      _$SimulateResponseFromJson(json);
}
