import 'package:flutter/material.dart';

import '../api/models/room_score.dart';

class ModeBadge extends StatelessWidget {
  const ModeBadge({super.key, required this.mode});
  final RoomMode mode;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (symbol, color) = switch (mode) {
      RoomMode.normal => ('○', cs.onSurface),
      RoomMode.quiet => ('◐', cs.primary),
      RoomMode.delayed => ('⏱', cs.secondary),
      RoomMode.excluded => ('✕', cs.error),
    };
    return Container(
      width: 24,
      height: 24,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: cs.outline),
      ),
      child: Text(symbol, style: TextStyle(color: color, fontSize: 14)),
    );
  }
}
