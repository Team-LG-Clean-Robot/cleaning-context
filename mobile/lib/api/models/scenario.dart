import 'package:freezed_annotation/freezed_annotation.dart';

part 'scenario.freezed.dart';
part 'scenario.g.dart';

@freezed
class Scenario with _$Scenario {
  const factory Scenario({
    required String id,
    @JsonKey(name: 'name_ko') required String nameKo,
    String? description,
    @JsonKey(name: 'current_time') required String currentTime,
    @JsonKey(name: 'sleep_time') required String sleepTime,
    @JsonKey(name: 'user_location') String? userLocation,
    @JsonKey(name: 'active_events') @Default([]) List<String> activeEvents,
    @JsonKey(name: 'gap_rooms') @Default([]) List<String> gapRooms,
  }) = _Scenario;

  factory Scenario.fromJson(Map<String, dynamic> json) =>
      _$ScenarioFromJson(json);
}
