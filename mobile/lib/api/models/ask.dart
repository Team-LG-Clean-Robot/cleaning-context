import 'package:freezed_annotation/freezed_annotation.dart';

import 'room_score.dart';

part 'ask.freezed.dart';
part 'ask.g.dart';

@freezed
class AskRequest with _$AskRequest {
  const factory AskRequest({
    @JsonKey(name: 'context_summary') String? contextSummary,
    List<RoomScore>? rooms,
    required String question,
  }) = _AskRequest;

  factory AskRequest.fromJson(Map<String, dynamic> json) =>
      _$AskRequestFromJson(json);
}

@freezed
class AskResponse with _$AskResponse {
  const factory AskResponse({
    required String answer,
    required bool fallback,
    @JsonKey(name: 'duration_ms') required int durationMs,
  }) = _AskResponse;

  factory AskResponse.fromJson(Map<String, dynamic> json) =>
      _$AskResponseFromJson(json);
}
