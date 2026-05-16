import 'package:freezed_annotation/freezed_annotation.dart';

part 'inferred_event.freezed.dart';
part 'inferred_event.g.dart';

@JsonEnum(valueField: 'wire')
enum InferSource {
  rule('rule'),
  ml('ml');

  const InferSource(this.wire);
  final String wire;
}

@freezed
class InferredEvent with _$InferredEvent {
  const factory InferredEvent({
    @JsonKey(name: 'event_id') required String eventId,
    required double confidence,
    required InferSource source,
    @JsonKey(name: 'triggered_by') @Default([]) List<String> triggeredBy,
    @JsonKey(name: 'rule_descriptions') @Default([]) List<String> ruleDescriptions,
  }) = _InferredEvent;

  factory InferredEvent.fromJson(Map<String, dynamic> json) =>
      _$InferredEventFromJson(json);
}
