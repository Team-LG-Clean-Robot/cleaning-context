import 'package:flutter/material.dart';

import 'tokens.dart';

/// 라이트 모드 ColorScheme (웹 라이트 모드와 1:1 매핑).
const ColorScheme lightScheme = ColorScheme(
  brightness: Brightness.light,
  primary: kGray900,
  onPrimary: kGray50,
  secondary: kAccent500,
  onSecondary: kGray50,
  surface: kGray50,
  onSurface: kGray900,
  surfaceContainerHighest: kGray100,
  outline: kGray300,
  outlineVariant: kGray100,
  error: Color(0xFFB42626),
  onError: kGray50,
);

/// 다크 모드 ColorScheme.
const ColorScheme darkScheme = ColorScheme(
  brightness: Brightness.dark,
  primary: kGray50,
  onPrimary: kGray900,
  secondary: kAccent500,
  onSecondary: kGray50,
  surface: kGray900,
  onSurface: kGray50,
  surfaceContainerHighest: kGray700,
  outline: kGray700,
  outlineVariant: kGray700,
  error: Color(0xFFE57373),
  onError: kGray900,
);
