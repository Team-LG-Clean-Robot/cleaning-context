# ROADMAP — 생활 맥락 로봇청소기 시뮬레이터

> **마지막 업데이트**: 2026-05-26
> **현재 위치**: 2주차 진입 — 직무 분배(산출물 ownership) + 문서 정리 완료, hand-off 흐름 가동 직전
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

**산출물 ownership (2026-05-17 갱신)** — 5/30 발표일에 무엇이 산출돼야 하나 → 각 산출물을 한 명이 책임. 가이드: [`docs/onboarding/`](./docs/onboarding/).

| # | 산출물 | Owner | W2 성공 지표 |
|---|---|---|---|
| 1 | **라이브 데모** (웹 + 모바일 APK + IoT 시뮬) | 전유성 | 5/30 100% 작동 + 멘토 2차 일정 fixed |
| 2 | **사업계획서 제출본** (`BUSINESS_PLAN.md` → hwp) | **김준성** | 전 섹션 통합 작성 + 부수로 시뮬용 mock data·아파트 도면 납품 |
| 3 | **ML 분류 결과** (정확도·confusion matrix) | 박주상 | 정확도 ≥75% / 5-fold CV ≥70% (학습 데이터 본인 발굴) · 미달 시 5/24까지 정직 보고 → Plan B (rule + LLM 중심 발표) |
| 4 | **외부 증거 + 멘토 Q&A** | 조현서 | `docs/research/*.md` 자료 수집·hand-off + Q&A 10종 — 🔄 PR #3 머지 (persona.md + user_voice.md + DEMO_SCRIPT Q&A 10) · 시연 시나리오 placeholder는 전유성 후속
| (5) | 발표 PPT 8슬라이드 | TBD | W3 결정 |

**Hand-off 구조**:
- 조현서 (raw 자료) → 김준성 (BUSINESS_PLAN 본문 통합) → 전유성 (머지)
- 김준성 (mock data·도면) → 전유성 (코드 통합)
- 박주상 (학습 모델) → 전유성 (`/api/infer-events` 통합)

**작업 방식** — 각자 직무에 맞는 일을 본인이 발굴해 PR. 한 주 PR 2~3개 목표.

**ML Plan B** — 박주상 KPI 미달 시 발표는 "rule + LLM" 중심으로 가고 ML은 "학부 데이터 양 한계" 정직하게 프레이밍. 박주상에게 압박 X.

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
| ML 모델 v1 | backend/models/event_classifier.joblib | ✅ CASAS 85.1% |
| ML 모델 v2 | backend/models/event_classifier_v2.joblib | ✅ IoT multi-label 99.3% |
| 평가 리포트 | backend/reports/ml_metrics_v2.json | ✅ |
| 데모 영상 | (TBD) | ⬜ |

## KPI

| 카테고리 | 지표 | 목표 | 현재 |
|---|---|---|---|
| 기능 | 작동 시나리오 수 | ≥ 4 | 4 (확장 예정 +2) |
| ML | 이벤트 분류기 정확도 | ≥ 75% | ✅ v1 CASAS 85.1% / v2 IoT 99.3% |
| ML | 5-fold CV mean | ≥ 70% | ✅ v1 85.1% / v2 99.3% |
| 데이터 | 공개 데이터셋 기반 보정 근거 | ≥ 1건 | ✅ CASAS hh106 (Zenodo CC BY 4.0) |
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
