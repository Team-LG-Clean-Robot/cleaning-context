/// OKLch → sRGB hex 변환 토큰.
///
/// 원본: frontend/app/theme.generated.css (DESIGN.md → desing-manual 빌드 산출).
/// 본 파일은 빌드 시점에 1회 변환된 상수 — 런타임에 OKLch 재계산하지 않음.
library;

import 'package:flutter/material.dart';

// ── Gray scale (neutral) ────────────────────────────────────────────────
const kGray50  = Color(0xFFFCFCFC); // oklch(99% 0 0)
const kGray100 = Color(0xFFF5F5F5); // oklch(97% 0 0)
const kGray300 = Color(0xFFD1D1D1); // oklch(85% 0 0)
const kGray500 = Color(0xFF6E6E6E); // oklch(55% 0 0)
const kGray700 = Color(0xFF363636); // oklch(30% 0 0)
const kGray900 = Color(0xFF0F0F0F); // oklch(12% 0 0)

// ── Accent ─────────────────────────────────────────────────────────────
const kAccent500 = Color(0xFF5F5F5F); // oklch(50% 0 0)

// ── Spacing (Material 3 권장에 맞춰 4의 배수) ──────────────────────────
const kSpacing1  = 4.0;
const kSpacing2  = 8.0;
const kSpacing4  = 16.0;
const kSpacing6  = 24.0;
const kSpacing8  = 32.0;
const kSpacing12 = 48.0;
const kSpacing16 = 64.0;

// ── Radius ─────────────────────────────────────────────────────────────
const kRadiusSm = 2.0;
const kRadiusMd = 4.0;
const kRadiusLg = 8.0;
