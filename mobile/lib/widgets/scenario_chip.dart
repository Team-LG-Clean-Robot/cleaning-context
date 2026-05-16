import 'package:flutter/material.dart';

import '../api/models/scenario.dart';

class ScenarioChip extends StatelessWidget {
  const ScenarioChip({super.key, required this.scenario, required this.onTap});
  final Scenario scenario;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      onPressed: onTap,
      label: Text(scenario.nameKo),
      avatar: const Icon(Icons.play_arrow, size: 16),
    );
  }
}
