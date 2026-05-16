import 'package:flutter/material.dart';

import '../theme/text_theme.dart';
import '../theme/tokens.dart';

class SensorTile extends StatelessWidget {
  const SensorTile({
    super.key,
    required this.icon,
    required this.nameKo,
    required this.sensorId,
    required this.active,
    required this.onChanged,
  });

  final IconData icon;
  final String nameKo;
  final String sensorId;
  final bool active;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(kRadiusMd),
        onTap: () => onChanged(!active),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: kSpacing4, vertical: kSpacing2),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: active ? cs.primary : cs.surfaceContainerHighest,
                ),
                child: Icon(icon,
                    size: 18, color: active ? cs.onPrimary : cs.onSurface.withValues(alpha: 0.6)),
              ),
              const SizedBox(width: kSpacing4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(nameKo, style: const TextStyle(fontSize: 14)),
                    Text(sensorId,
                        style: kMonoStyle.copyWith(
                            fontSize: 11, color: cs.onSurface.withValues(alpha: 0.4))),
                  ],
                ),
              ),
              Switch(value: active, onChanged: onChanged),
            ],
          ),
        ),
      ),
    );
  }
}
