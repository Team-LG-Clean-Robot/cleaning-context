# ROADMAP — 생활 맥락 로봇청소기 시뮬레이터

> **마지막 업데이트**: 2026-05-29
> **현재 위치**: 3주차 — 프론트 완성 + 백엔드 분리 + 서비스·문서 정리 + 스코어링/설계문서 정합 ✅ + 발표 준비 (D-1)
> **최종 발표**: 2026-05-30 (토)
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

### 📅 3주차 (5/27~30) — 서비스 완성도 + 발표

**서비스 완성도 (5/27~28)**:
- [x] simulate 캐시 inferred_events 중복 키워드 버그 수정
- [x] 타임라인 시뮬레이션 — 하루 24h 재생 모드 (10 키프레임, 센서→이벤트→점수→로봇이동 연동)
- [x] 타임라인 prefetch 배치 처리 (2개씩 순차, 2개 로드 시 즉시 재생) — ✅ 배포 확인 완료
- [x] Cold start UX 개선 (서버 준비 중 로딩 UI) — waitForBackend() 폴링 + 스피너
- [x] 시나리오 +2 추가 (택배 도착·식사 후) — 8종 라이브 확인 완료
- [x] ML 런타임 의존성 수정 (numpy/scikit-learn/joblib → pyproject.toml) + v2 모델 전환
- [x] 에러 retry (fetchWithRetry — 5xx/네트워크 에러 시 1.5s 후 1회 재시도)
- [x] health 엔드포인트 ML 분류기 상태 실측 반영 (하드코딩 False → 실제 로드 체크)
- [x] 시나리오 모드에서 룰 기반 추론 결과 표시 (이벤트→센서 합성→inferred_events) — ML v2는 박주상 v3 설계로 폐기, archive/ml-v2/
- [x] 로봇청소기 문 통과 경로 + 방 내부 원형 청소 패턴 + 속도 조정
- [x] 먼지 파티클 (점수 순위 기반 개수, 청소 시 순차 제거, 점수 감소 + 히트맵 연동)
- [x] 사용자 아이콘 파란색 뱃지 재디자인
- [x] 백엔드 분리 — 정적 JSON 번들 (시나리오 8종 + 타임라인 10 키프레임, cold start 제거)
- [x] 백엔드 파이프라인 시각화 탭 (5단계 순차 reveal)
- [x] 타임라인 일시정지 시 로봇 정지 + 먼지 위치 안정화
- [x] 두 축 산식 (Need × Opportunity) 적용 — ScoreContribution.axis 필드 + ExplanationCard/RoomDetail 두 박스 시각화
- [x] ~~baseline 항목 2종 (cleanup_recency·time_of_day_fit)~~ → **v2 정합 시 제거** (5/29): 프론트 enrich가 백엔드 룰값과 어긋나 정적/라이브 점수 불일치 유발. 현재 점수 = base + 이벤트 delta + modifier 순수 합
- [x] 청소 완료 시 score → base × 0.2 + opportunity (0 아닌 residual)
- [x] 로봇 closure 버그 fix (scheduleRoom의 stale pos 텔레포트) + 먼지 제거 robot reach 18px 기반
- [x] 점수 설명서 모달 (ScoringRulebook) — RoomDetail에서 📖 버튼으로 호출
- [x] 기본 시나리오 post_cooking → rainy_return (richer signals)
- [x] PRESENTATION.md 발표 순서 (Why → Vision → Reality → Inside, 5~7분/인) + ML 프레이밍 ("ambient 추정기")
- [x] SCORING_RULES.md 두 축 산식 재서술 + 입력→축 매핑 표
- [x] 헤더 정리 (다크모드·두 축 뱃지 제거), 디지털 시계 (무채색 우측 상단)

**정합·발표 준비 (5/29)**:
- [x] 데모 UX 재설계 — HERO 결정카드(지도+현재 위치+우선순위) 세로 흐름 + 초기 base 상태 진입 + 사이트 전반 이모지→인라인 SVG 아이콘 (`components/icons.tsx`)
- [x] 스코어링 정합 — base_score v2(22/20/28/12/18) 프론트·백엔드·문서 일치 + 프론트 enrich 제거 → 정적/라이브 점수 1:1 (pytest 53/53)
- [x] 설계 문서(`CLEANING_DECISION_ALGORITHM.md`) v2 동기화 — 박주상 설계 골격(§0~§2) 보존 + §3~5 실측값·변경점 주석 (박주상 사전 동의)
- [ ] 박주상 ML 위치 추정 결과(정확도·confusion matrix) hand-off + 슬라이드 두 축 개념 공유
- [ ] 발표 슬라이드 8장 제작 (Why → Vision → Reality → Inside, Need×Opportunity 1슬라이드 포함) — `docs/PRESENTATION.md` 기반
- [ ] 데모 백업 영상 녹화 (rainy_return → 방 클릭 → 점수 설명서 → 청소 후 residual)

**빌드 (5/28~29)**:
- [ ] APK 형식만 갖추기 (발표는 스마트폰 프레임 이미지로 대체)

**발표 (5/29~30)** — 팀장 본인 작업:
- [ ] **5/30 최종 발표**

## 산출물 목록

| 종류 | 산출물 | 상태 |
|---|---|---|
| 웹 시뮬레이터 | https://robot-cleaner.askewly.com | ✅ 라이브 (8 시나리오 + 타임라인) |
| 백엔드 API | https://cleaning-context-backend.onrender.com | ✅ 라이브 (61 pytest, 8 시나리오, ML 위치추정) |
| 모바일 앱 (APK) | mobile/build/.../app-release.apk | 🔄 SDK 설치 후 |
| 사업계획서 | BUSINESS_PLAN.md + exports/planning-v2/planning.pdf | ✅ + 갱신 예정 |
| 기술 기획서 | TECHNICAL_PLAN.md | ✅ |
| ML 설계 v3 | docs/CLEANING_DECISION_ALGORITHM.md (박주상) | ✅ 머지 (2026-05-28) |
| ML 모델 (위치 추정) | backend/app/ml/ (CASAS hh106 학습 RandomForest) | ✅ test 98.9% / CV 99.0% |
| ML v1·v2 아카이브 | archive/ml-v2/ (gitignored) | ✅ 폐기 |
| 데모 영상 | (TBD) | ⬜ |

## KPI

| 카테고리 | 지표 | 목표 | 현재 |
|---|---|---|---|
| 기능 | 작동 시나리오 수 | ≥ 4 | ✅ 8 (라이브 확인) |
| ML | 사용자 위치 추정 정확도 (박주상 v3) | ≥ 75% | ✅ 98.9% / 5-fold CV 99.0% (CASAS hh106) |
| 데이터 | 공개 데이터셋 기반 보정 근거 | ≥ 1건 | ✅ CASAS hh106 (v2 아카이브에서 검증 완료) |
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
