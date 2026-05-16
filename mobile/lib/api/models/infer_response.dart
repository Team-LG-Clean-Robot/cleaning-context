import 'package:freezed_annotation/freezed_annotation.dart';

import 'inferred_event.dart';

part 'infer_response.freezed.dart';
part 'infer_response.g.dart';

@freezed
class InferResponse with _$InferResponse {
  const factory InferResponse({
    @JsonKey(name: 'inferred_events') @Default([]) List<InferredEvent> inferredEvents,
    @JsonKey(name: 'user_location_hint') String? userLocationHint,
    @JsonKey(name: 'model_version') String? modelVersion,
  }) = _InferResponse;

  factory InferResponse.fromJson(Map<String, dynamic> json) =>
      _$InferResponseFromJson(json);
}
