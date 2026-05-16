import 'package:freezed_annotation/freezed_annotation.dart';

part 'room_score.freezed.dart';
part 'room_score.g.dart';

@JsonEnum(valueField: 'wire')
enum RoomId {
  entrance('entrance'),
  living('living'),
  kitchen('kitchen'),
  bedroom('bedroom'),
  bathroom('bathroom');

  const RoomId(this.wire);
  final String wire;
}

@JsonEnum(valueField: 'wire')
enum RoomMode {
  normal('normal'),
  quiet('quiet'),
  delayed('delayed'),
  excluded('excluded');

  const RoomMode(this.wire);
  final String wire;
}

@freezed
class ScoreContribution with _$ScoreContribution {
  const factory ScoreContribution({
    required String source,
    @JsonKey(name: 'label_ko') required String labelKo,
    required int delta,
  }) = _ScoreContribution;

  factory ScoreContribution.fromJson(Map<String, dynamic> json) =>
      _$ScoreContributionFromJson(json);
}

@freezed
class RoomScore with _$RoomScore {
  const factory RoomScore({
    @JsonKey(name: 'room_id') required String roomId,
    required int base,
    required List<ScoreContribution> breakdown,
    @JsonKey(name: 'final') required int finalScore,
    required RoomMode mode,
    @JsonKey(name: 'exclusion_reason') String? exclusionReason,
  }) = _RoomScore;

  factory RoomScore.fromJson(Map<String, dynamic> json) =>
      _$RoomScoreFromJson(json);
}
