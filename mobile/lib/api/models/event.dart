import 'package:freezed_annotation/freezed_annotation.dart';

part 'event.freezed.dart';
part 'event.g.dart';

@freezed
class EventEffect with _$EventEffect {
  const factory EventEffect({
    @JsonKey(name: 'room_id') required String roomId,
    required int delta,
  }) = _EventEffect;

  factory EventEffect.fromJson(Map<String, dynamic> json) =>
      _$EventEffectFromJson(json);
}

@freezed
class EventInfo with _$EventInfo {
  const factory EventInfo({
    required String id,
    @JsonKey(name: 'name_ko') required String nameKo,
    @Default([]) List<EventEffect> effects,
  }) = _EventInfo;

  factory EventInfo.fromJson(Map<String, dynamic> json) =>
      _$EventInfoFromJson(json);
}
