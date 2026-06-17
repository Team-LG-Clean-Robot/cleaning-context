# ROADMAP — 4주 회고 (Lumos · 생활 맥락 로봇청소기)

> **프로젝트 종료**: 2026-05-30 (최종 발표 완료) · 성균관대 RISE × LG전자 가전 멘토링 · 팀 럭키 금성 4인
> 이 문서는 진행 중 sprint 보드에서 **종료 후 회고**로 다듬은 것이다. 제품 개요는 [README](./README.md), 트랙별 상세는 [TECHNICAL_PLAN](./TECHNICAL_PLAN.md) / [BUSINESS_PLAN](./BUSINESS_PLAN.md).

## Current Horizon

<!-- harness:goal id="portfolio-public-readiness" -->
목표: 공개 포트폴리오 레포로서 외부인이 README와 문서만 보고 프로젝트 범위, 실행법, 산출물 위치를 이해할 수 있게 정리한다.

## Active Milestones

<!-- harness:milestone id="P1-public-repo-cleanup" status="completed" priority="P0" evidence="python -m pytest (backend): 57 passed, 4 xpassed; targeted rg scan: no matches" -->
### P1 — 공개 포트폴리오 레포 정리
- DoD: README/하위 README/문서의 실행 경로와 환경변수 설명이 일치하고, 공개 레포에 부적절한 내부 운영 흔적과 개인 로컬 경로가 제거 또는 명확히 격리됨.
- Evidence: python -m pytest (backend): 57 passed, 4 xpassed; targeted rg scan: no matches
- Gap: 현재 레포는 외부 공개 상태지만 회고/AI 운영 문서/exports/실행 안내가 섞여 있어 포트폴리오 독자의 진입점이 흐려짐.
- Status: [x]

- Completed at: 2026-06-18
- Summary: Public repo docs surface aligned for portfolio readers
## 한눈에

2026년 5월, 약 4주 동안 **IoT 맥락 인식 + Privacy-on-Edge** 두 축의 로봇청소기 의사결정 시뮬레이터를 기획부터 라이브 데모·발표까지 완주했다. 멘토 1차 피드백을 받아 한 차례 크게 피벗했고, 발표 직전까지 데모 UX·발표 덱을 다듬었다.

## 마일스톤

### W1 (5/13~19) — MVP + 사업 기획서 v1
- 백엔드(FastAPI · pytest) · 프론트(Next.js 15 시뮬레이터) · 배포(Render + Vercel)
- 5-Layer 시뮬레이터 + rule-based scoring + LLM explainer + Ask 챗
- 데모 시나리오 4종 + 직접 입력 모드 + 다크/라이트 토글
- 사업 기획서 v2 (14섹션, 시장 출처 4건)

### W2 (5/20~26) — 멘토 피벗 반영 + 모바일 + ML 설계
**5/16 멘토 1차 피드백 2종을 반영:**
1. 사업계획서가 기술에 치우침 → 사업성/기술 트랙 분리, 가상 회사 "무빙홈" 시나리오로 사업성 채움
2. IoT 멀티센서(도어락·인덕션·냉장고·에어컨…) + 개인정보 보안 고려

- `BUSINESS_PLAN.md` (가상 회사 + TAM/SAM/SOM + 페르소나 + 단위경제, 실 시장 수치 반영)
- `TECHNICAL_PLAN.md` 분리 (6-Layer 반영)
- IoT 멀티센서 도메인 — 12 센서 + 13 추론 규칙 + Privacy-on-Edge (`docs/IOT_DOMAIN.md`)
- 백엔드 v2 — `POST /api/infer-events` + `sensor_readings` 옵션 + cold_start 필드
- Flutter 앱 — 5-tab BottomNav + Riverpod + HouseMapPainter + IoT Sensors 화면

### W3 (5/27~30) — 서비스 완성도 + 발표
- **서비스 완성도** — 하루 24h 타임라인 재생(센서→이벤트→점수→로봇이동 연동) · 시나리오 +4(총 8종) · cold start UX(폴링 + 스피너) · 에러 retry · 백엔드 분리(정적 JSON 번들) · 파이프라인 시각화 탭
- **데모 UX 재설계** — 세로 레이아웃(HERO 결정카드 → IoT → 시나리오 → AI 설명) · 실시간 점수 반영 · 이모지 전면 제거 → inline SVG · base_score 프론트/백엔드/문서 정합(`SCORING_RULES.md` v2, pytest 정합)
- **발표 덱** — 27 슬라이드(표지·목차·서비스 영상·도입부·재무 9장·디자인·라이브 데모·기술/ML/시뮬·요약·팀·Q&A) · Pretendard 자체 호스팅 · 제출용 PDF 산출
- **5/30 최종 발표 완료** ✅

## KPI — 최종 결과

| 카테고리 | 지표 | 목표 | 결과 |
|---|---|---|---|
| 기능 | 작동 시나리오 수 | ≥ 4 | ✅ 8 (라이브) |
| 일관성 | 동일 입력 우선순위 일치 | 100% | ✅ (rule-based) |
| 응답 | 이벤트 입력 → 설명 출력 | ≤ 5s | ✅ ~3s (캐시 적중 시 즉시) |
| 설명 품질 | 점수 근거 포함 비율 | ≥ 95% | ✅ |
| 확장성 | 새 센서·이벤트 추가 시간 | ≤ 30분 | ✅ (JSON만 수정) |
| 멀티 클라이언트 | 같은 백엔드 / 두 클라이언트 | 웹 + 앱 | ✅ |
| 데모 안정성 | 발표 중 시연 성공 | 100% | ✅ (캐시·폴백 + 백업) |
| ML | 사용자 위치 추정 정확도 | ≥ 75% | 🔶 미달성 — 설계 완료, heuristic fallback 운영 (아래) |

## 배운 점 · 솔직한 회고

- **멘토 피벗에서 가장 많이 배웠다.** "기술에 치우쳤다"는 1차 피드백이 사업성/기술 트랙 분리와 가상 회사 시나리오로 이어졌고, IoT 멀티센서·Privacy-on-Edge라는 차별화 축이 여기서 나왔다. 초기 가설을 버릴 수 있느냐가 핵심이었다.
- **판단은 룰, 번역만 LLM.** 점수 계산을 결정론적 룰로 묶고 LLM을 설명에만 쓴 결정이, 재현성·디버깅·데모 안정성을 모두 가져갔다. 발표 중 LLM 장애에도 캐시·룰 폴백으로 무사했다.
- **ML은 Plan B로 정직하게.** scikit-learn 기반 사용자 위치 추정(v3, CASAS hh106)을 설계까지 마쳤으나 학부 일정 안에서 KPI(정확도 ≥75%)를 만족하는 모델 학습은 끝내지 못했다. 무리해서 수치를 만들기보다 **heuristic fallback으로 운영**하고 발표는 "rule + LLM" 중심으로 프레이밍했다. ML 경로 테스트는 학습 모델 도입을 게이트로 남겨 두었다(`docs/CLEANING_DECISION_ALGORITHM.md`).
- **확장성은 코드가 아니라 데이터 모델에서.** 센서·룰·점수를 모두 JSON 카탈로그로 빼서 코드 분기 없이 시나리오를 늘릴 수 있게 한 게, 발표 직전 시나리오 8종까지 빠르게 늘릴 수 있었던 이유다.

## 산출물

| 종류 | 산출물 | 상태 |
|---|---|---|
| 웹 시뮬레이터 | https://robot-cleaner.askewly.com | ✅ 라이브 (8 시나리오 + 타임라인) |
| 백엔드 API | https://cleaning-context-backend.onrender.com | ✅ 라이브 |
| 모바일 앱 | `mobile/` (Flutter) | ✅ 웹 프리뷰 동작 |
| 사업 기획서 | `BUSINESS_PLAN.md` + `exports/planning-v2/` | ✅ |
| 기술 기획서 | `TECHNICAL_PLAN.md` + `exports/technical-plan/` | ✅ |
| ML 설계 v3 | `docs/CLEANING_DECISION_ALGORITHM.md` | ✅ (설계) |
| 발표 덱 | `exports/rehearsal-deck/` (27장) | ✅ |

## 멘토 피드백 트래커

| 일자 | 피드백 | 반영 |
|---|---|---|
| 2026-05-16 | 사업계획서가 기술에 치우침 — 사업성/기술 트랙 분리, 가상 회사 시나리오 | ✅ BUSINESS_PLAN + TECHNICAL_PLAN |
| 2026-05-16 | IoT 멀티센서 통합 + 개인정보 보안 고려 | ✅ IOT_DOMAIN (12 센서·13 규칙·Privacy-on-Edge) + 백엔드 v2 + Flutter Sensors |
