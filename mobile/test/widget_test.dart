import 'package:flutter_test/flutter_test.dart';

import 'package:robotic/api/models/room_score.dart';

void main() {
  test('RoomId enum wire values match backend', () {
    expect(RoomId.entrance.wire, 'entrance');
    expect(RoomId.living.wire, 'living');
    expect(RoomId.kitchen.wire, 'kitchen');
    expect(RoomId.bedroom.wire, 'bedroom');
    expect(RoomId.bathroom.wire, 'bathroom');
  });

  test('RoomMode enum wire values match backend', () {
    expect(RoomMode.normal.wire, 'normal');
    expect(RoomMode.quiet.wire, 'quiet');
    expect(RoomMode.delayed.wire, 'delayed');
    expect(RoomMode.excluded.wire, 'excluded');
  });
}
