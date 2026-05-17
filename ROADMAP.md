# ROADMAP — 생활 맥락 로봇청소기 시뮬레이터

> **현재 위치**: 2주차 진입 (5/16 멘토 1차 미팅 후 대규모 피벗 반영)
> **최종 발표**: 2026-05-30 (금)
> 사업성 트랙은 [BUSINESS_PLAN.md](./BUSINESS_PLAN.md), 기술 트랙은 [TECHNICAL_PLAN.md](./TECHNICAL_PLAN.md), 모바일·IoT 도메인은 [docs/IOT_DOMAIN.md](./docs/IOT_DOMAIN.md) 참조.

## 마일스톤

### ✅ 1주차 (5/13~19) — MVP + 사업계획서 v1
- 백엔드 (FastAPI · pytest 24) · 프론트 (Next.js 15 시뮬레이터) · 배포 (Render + Vercel)
- 5-Layer 시뮬레이터 + Rule-based scoring + LLM explainer + Ask 챗
- 데모 시나리오 4종 + 직접 입력 모드
- 사업계획서 v2 (14섹션, 시장 출처 4건)
- 다크/라이트 모드 토글

### 🔄 2주차 (5/20~26) — 멘토 피벗 반영 + 모바일 + ML
**5/16 멘토 1차 미팅 피드백 2종**:
1. 사업계획서 사업성/기술 트랙 분리 → 가상 회사 "무빙홈"으로 사업성 채움
2. IoT 멀티센서 (도어락·인덕션·냉장고·에어컨…) + 개인정보 보안 고려

**완료** (5/16):
- [x] BUSINESS_PLAN.md (가상 회사 "무빙홈" + TAM/SAM/SOM + 페르소나 + 단위경제) — 시장 리서치 6,500억 시장·중국 4사 70%·CAGR 14.3% 등 실 수치 반영
- [x] TECHNICAL_PLAN.md (PLANNING.md에서 분리, 6-Layer 반영)
- [x] IoT 멀티센서 도메인 (12 센서 + 13 추론 규칙 + Privacy on Edge) — docs/IOT_DOMAIN.md
- [x] 백엔드 v2 — `POST /api/infer-events` + `/api/simulate sensor_readings` 옵션 + cold_start 필드 — pytest 50/50
- [x] Flutter 앱 "로보틱" — 5-tab BottomNav + Riverpod + HouseMapPainter + IoT Sensors 화면. 47 파일
- [x] Flutter Web 실행 (localhost:8770)

**W2 sprint 배정 (2026-05-17 갱신)** — 각 팀원 가이드: [`docs/onboarding/`](./docs/onboarding/)

| 담당 | 항목 | 산출물 |
|---|---|---|
| 전유성 | Android SDK + APK 빌드 | GitHub Release APK |
| 전유성 | `/api/infer-events`에 박주상 ML 통합 (rule fallback 유지) | 응답 `source: ml\|rule` |
| 전유성 | IoT 신규 시나리오 2개 (`morning_quick_clean`, `cooking_in_progress`) | `scenarios.json` + 캐시 + golden test |
| 전유성 | 멘토 2차 일정 + 자료 갱신 | `team-kickoff.pdf` v3.3 |
| 전유성 | 앱 아이콘 (`flutter_launcher_icons`) | `mobile/assets/icon/` |
| 김준성 | `BUSINESS_PLAN §5` 경쟁사 표 보강 (LG·삼성·로보락 사양·가격) | BUSINESS_PLAN 갱신 |
| 김준성 | Mock IoT 센서 dataset CSV v2 (24h × 7일 × 12 센서) | `backend/app/data/mock_sensor_dataset.csv` |
| 김준성 | W3 PPT 8슬라이드 outline | `exports/presentation/outline.md` |
| 박주상 | UCI ADL Ordonez 다운로드 + 12 센서 매핑 | `backend/scripts/dataset_mapping.md` |
| 박주상 | 전처리 + 모델 학습·평가 (KPI 75% / CV 70%) | `event_classifier.joblib` + `reports/metrics.json` |
| 박주상 | LLM 프롬프트 톤 검토 + 6 시나리오 캐시 재시드 | `cached_responses/*.json` |
| 조현서 | IoT 데이터셋 후보 3개 비교 리포트 (Gemini CLI) | `docs/research/datasets_compare.md` |
| 조현서 | 한국 사용자 정성 리뷰 50건 수집 | `docs/research/user_voice.md` |
| 조현서 | 멘토·심사위원 예상 Q&A 10종 | `docs/DEMO_SCRIPT.md §Q&A` |

### 📅 3주차 (5/27~30) — 발표 준비
- [ ] 최종 발표 PPT 8슬라이드
- [ ] 데모 영상 백업 (라이브 실패 시 대비)
- [ ] 리허설 3회 (5/27, 5/28, 5/29)
- [ ] README 영문화 + 기술 블로그 1편 (외부 검증 축)
- [ ] **5/30 최종 발표**

## 산출물 목록

| 종류 | 산출물 | 상태 |
|---|---|---|
| 웹 시뮬레이터 | https://robot-cleaner.askewly.com | ✅ 라이브 |
| 백엔드 API | https://cleaning-context-backend.onrender.com | ✅ 라이브 (50 pytest) |
| 모바일 앱 (APK) | mobile/build/.../app-release.apk | 🔄 SDK 설치 후 |
| 사업계획서 | BUSINESS_PLAN.md + exports/planning-v2/planning.pdf | ✅ + 갱신 예정 |
| 기술 기획서 | TECHNICAL_PLAN.md | ✅ |
| ML 모델 | backend/models/event_classifier.joblib | ⬜ 학습 후 |
| 평가 리포트 | backend/reports/metrics.json | ⬜ |
| 데모 영상 | (TBD) | ⬜ |

## KPI

| 카테고리 | 지표 | 목표 | 현재 |
|---|---|---|---|
| 기능 | 작동 시나리오 수 | ≥ 4 | 4 (확장 예정 +2) |
| ML | 이벤트 분류기 정확도 | ≥ 75% | — |
| ML | 5-fold CV mean | ≥ 70% | — |
| 데이터 | 공개 데이터셋 기반 보정 근거 | ≥ 1건 | — |
| 응답 | 이벤트 입력 → 설명 출력 | ≤ 5s | ~3s |
| 일관성 | 동일 입력 우선순위 일치 | 100% | ✅ (Rule-based) |
| 설명 품질 | 점수 근거 포함 비율 | ≥ 95% | ✅ |
| 데모 안정성 | 발표 중 시연 성공 | 100% (백업 영상) | — |
| 외부 증거 | GitHub Release APK + 블로그 1편 | 1 + 1 | — |
| 멀티 클라이언트 | 같은 백엔드 / 두 클라이언트 | 웹 + 앱 | ✅ + 🔄 |

## 멘토 피드백 트래커

| 일자 | 피드백 | 반영 |
|---|---|---|
| 2026-05-16 | 사업계획서가 기술에 치우침 — 사업성/기술 트랙 분리, 가상 회사 시나리오로 사업성 채우기 | ✅ BUSINESS_PLAN.md + TECHNICAL_PLAN.md |
| 2026-05-16 | IoT 멀티센서 통합 + 개인정보 보안 고려 (도어락·주방기기·냉장고·에어컨 등) | ✅ docs/IOT_DOMAIN.md (12 센서·13 규칙·Privacy on Edge) + 백엔드 v2 + Flutter Sensors 화면 |
