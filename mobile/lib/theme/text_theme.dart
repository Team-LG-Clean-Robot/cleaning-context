import 'package:flutter/material.dart';

/// Pretendard + JetBrainsMono 기반 TextTheme.
/// `flutter/text_theme.dart` Material 3 기본을 fontFamily만 swap.
TextTheme buildTextTheme(ColorScheme scheme) {
  const sans = 'Pretendard';
  final base = scheme.brightness == Brightness.light
      ? Typography.material2021(platform: TargetPlatform.android).black
      : Typography.material2021(platform: TargetPlatform.android).white;
  return base.apply(
    fontFamily: sans,
    bodyColor: scheme.onSurface,
    displayColor: scheme.onSurface,
  );
}

/// 점수표·디버그 텍스트용 monospace.
const TextStyle kMonoStyle = TextStyle(
  fontFamily: 'JetBrainsMono',
  fontFeatures: [FontFeature.tabularFigures()],
);
