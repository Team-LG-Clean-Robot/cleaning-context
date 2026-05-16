import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../api/models/room_score.dart';

/// frontend/lib/types.ts ROOMS_SEED (viewBox 420×280)를 그대로 옮긴 평면도 painter.
/// 점수 → fill lightness, mode=excluded → 빗금, 가구 힌트는 추후 추가.
class HouseMapPainter extends CustomPainter {
  HouseMapPainter({required this.rooms, required this.scheme});

  final List<RoomScore> rooms;
  final ColorScheme scheme;

  static const viewBoxSize = Size(420, 280);

  /// 5개 방 bbox (viewBox 좌표계, frontend/lib/types.ts:82 그대로).
  static const Map<String, Rect> _bboxes = {
    'entrance': Rect.fromLTWH(0, 0, 80, 180),
    'living': Rect.fromLTWH(80, 0, 200, 180),
    'kitchen': Rect.fromLTWH(280, 0, 140, 100),
    'bedroom': Rect.fromLTWH(0, 180, 280, 100),
    'bathroom': Rect.fromLTWH(280, 100, 140, 180),
  };

  /// 문 5개 (벽 잘라내기 — white rect overlay).
  static const List<Rect> _doors = [
    Rect.fromLTWH(78, 110, 4, 18), // entrance ↔ living
    Rect.fromLTWH(278, 30, 4, 18), // living ↔ kitchen
    Rect.fromLTWH(170, 178, 18, 4), // living ↔ bedroom
    Rect.fromLTWH(340, 98, 18, 4), // kitchen ↔ bathroom
    Rect.fromLTWH(30, 178, 18, 4), // entrance ↔ bedroom
  ];

  static double _fit(Size widget) =>
      math.min(widget.width / viewBoxSize.width, widget.height / viewBoxSize.height);

  /// (탭한 local 좌표, widget size) → 어느 방인지.
  static String? hitTest(Offset localPos, Size widgetSize) {
    final scale = _fit(widgetSize);
    final dx = (localPos.dx - (widgetSize.width - viewBoxSize.width * scale) / 2) / scale;
    final dy = (localPos.dy - (widgetSize.height - viewBoxSize.height * scale) / 2) / scale;
    for (final entry in _bboxes.entries) {
      if (entry.value.contains(Offset(dx, dy))) return entry.key;
    }
    return null;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final scale = _fit(size);
    final dx = (size.width - viewBoxSize.width * scale) / 2;
    final dy = (size.height - viewBoxSize.height * scale) / 2;
    canvas.save();
    canvas.translate(dx, dy);
    canvas.scale(scale);

    // 1. 방 fill
    final scoreByRoom = {for (final r in rooms) r.roomId: r};
    _bboxes.forEach((id, bbox) {
      final r = scoreByRoom[id];
      final fill = _scoreToFill(r);
      canvas.drawRect(bbox, Paint()..color = fill);
      if (r?.mode == RoomMode.excluded) {
        _drawHatching(canvas, bbox);
      }
      // 점수 라벨
      final score = r?.finalScore;
      if (score != null) {
        _drawText(canvas, bbox.center, score.toString(),
            color: scheme.onSurface, size: 20, weight: FontWeight.w600);
      } else {
        _drawText(canvas, bbox.center, _roomName(id),
            color: scheme.onSurface.withValues(alpha: 0.4), size: 13);
      }
    });

    // 2. 외벽 + 방 경계
    final wall = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = scheme.outline;
    canvas.drawRect(Offset.zero & viewBoxSize, wall);
    _bboxes.values.forEach((b) => canvas.drawRect(b, wall));

    // 3. 문 — surface로 덮어 벽 끊기
    for (final d in _doors) {
      canvas.drawRect(d, Paint()..color = scheme.surface);
    }

    canvas.restore();
  }

  Color _scoreToFill(RoomScore? r) {
    // 점수 없으면 빈 surface
    if (r == null) return scheme.surface;
    // mode별 색
    if (r.mode == RoomMode.excluded) {
      return scheme.surfaceContainerHighest;
    }
    // 점수가 높을수록 진하게 (lightness 96 → 66 mapping)
    final clamped = r.finalScore.clamp(0, 100);
    final t = clamped / 100.0;
    // 라이트 모드: surface(밝음) → primary 톤
    if (scheme.brightness == Brightness.light) {
      return Color.lerp(scheme.surfaceContainerHighest, scheme.primary.withValues(alpha: 0.4),
              t)! ;
    }
    // 다크 모드
    return Color.lerp(scheme.surfaceContainerHighest, scheme.primary.withValues(alpha: 0.6),
            t)!;
  }

  void _drawHatching(Canvas canvas, Rect bbox) {
    final paint = Paint()
      ..color = scheme.error.withValues(alpha: 0.35)
      ..strokeWidth = 1.2;
    canvas.save();
    canvas.clipRect(bbox);
    const step = 8.0;
    for (double x = bbox.left - bbox.height; x < bbox.right; x += step) {
      canvas.drawLine(
        Offset(x, bbox.top),
        Offset(x + bbox.height, bbox.bottom),
        paint,
      );
    }
    canvas.restore();
  }

  void _drawText(Canvas canvas, Offset center, String text,
      {required Color color, double size = 14, FontWeight? weight}) {
    final tp = TextPainter(
      text: TextSpan(
          text: text,
          style: TextStyle(
              fontSize: size,
              color: color,
              fontWeight: weight ?? FontWeight.w500,
              fontFamily: 'Pretendard')),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, center - Offset(tp.width / 2, tp.height / 2));
  }

  String _roomName(String id) => switch (id) {
        'entrance' => '현관',
        'living' => '거실',
        'kitchen' => '주방',
        'bedroom' => '침실',
        'bathroom' => '욕실',
        _ => id,
      };

  @override
  bool shouldRepaint(covariant HouseMapPainter old) =>
      old.rooms != rooms || old.scheme != scheme;
}
