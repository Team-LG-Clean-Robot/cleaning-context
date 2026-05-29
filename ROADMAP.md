# ROADMAP — 생활 맥락 로봇청소기 시뮬레이터

> **마지막 업데이트**: 2026-05-30
> **현재 위치**: 3주차 — 프론트 완성 + 백엔드 분리 + 데모 UX 재설계 + 스코어링/설계문서 정합 ✅ + **발표 당일 (D-DAY)**
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

**데모 UX 재설계 (5/29)**:
- [x] 세로 레이아웃 — HERO 결정카드(지도+현재 위치+우선순위) → IoT → 시나리오 → AI 설명(최하단)
- [x] HERO·AI 설명 카드 실시간화 (로봇 현재 청소 방·점수 반영)
- [x] 초기 진입 base 상태(시나리오 미선택) + 히트맵 기본 OFF
- [x] 로봇 끊김 수정 (orbit 스냅 제거) + 지연·제외 방 청소 스킵
- [x] 이모지 전면 제거 → 인라인 SVG 아이콘 (components/icons.tsx)
- [x] rainy_return 사용자 위치(거실) 표시 버그 + 거실 점유 지연
- [x] base_score 프론트/백엔드/문서 정합 (22/20/28/12/18) + SCORING_RULES.md v2 재작성
- [x] 프론트 enrich 제거 → 정적/라이브 점수 일치 (pytest 53/53)

**발표 덱·공유자료 (5/30 새벽)**:
- [x] 팀 공유 브리핑 — `docs/TEAM_BRIEF.md` → `exports/team-brief/team-brief.pdf` (이후 사용자가 typ를 "팀 오리엔테이션"으로 재작성 → PDF 재컴파일 대기)
- [x] 라이브 데모 QHD 점검 — 어제 배포분 라이브 정합 확인 (base·rainy_return 거실지연/침실제외·콘솔0). 발표는 ~1920 프로젝터라 폭 변경 불필요
- [x] 표지(01) — 이름/설명 위계 분리 + 가로 줄(중앙 페이드, 300px) + 폰트 30% 확대 (인터랙티브 연출은 보류)
- [x] 목차(02) — 질문형 제목·설명 4파트 (무엇·왜/돈/작동/더똑똑) + 카드 여정 연결선
- [x] 영상 임베드(03) + Pretendard 폰트 자체 호스팅 (19파일 CDN→`assets/fonts/`, 오프라인 대비). 영상 `assets/service-intro.mp4` (gitignore: mp4만)
- [x] 04 — `04-market-1.html`을 "Lumos란?" 설명 슬라이드로 repurpose (문제 vs Lumos 대비). 순서: 03 영상 후킹 → 04 설명
- [x] 김준성 재무 9장 병합 — 덱 21→27장 재번호 (06~14 재무, 09~21→15~27 시프트) + nav/카운터/폰트 정규화 + index 재생성 (커밋 9493c90)
- [x] 발표 대본 `docs/DEMO_SCRIPT.md` — 전유성 파트 풀 대본 + 팀원 핸드오프 큐 + 예상 Q&A 10

**빌드 (5/28~29)**:
- [ ] APK 형식만 갖추기 (발표는 스마트폰 프레임 이미지로 대체)

**발표 (5/29~30)** — 팀장 본인 작업:
- [ ] **5/30 (토) 최종 발표**

## 산출물 목록

| 종류 | 산출물 | 상태 |
|---|---|---|
| 웹 시뮬레이터 | https://robot-cleaner.askewly.com | ✅ 라이브 (8 시나리오 + 타임라인) |
| 백엔드 API | https://cleaning-context-backend.onrender.com | ✅ 라이브 (50 pytest, 8 시나리오) |
| 모바일 앱 (APK) | mobile/build/.../app-release.apk | 🔄 SDK 설치 후 |
| 사업계획서 | BUSINESS_PLAN.md + exports/planning-v2/planning.pdf | ✅ + 갱신 예정 |
| 기술 기획서 | TECHNICAL_PLAN.md | ✅ |
| ML 설계 v3 | docs/CLEANING_DECISION_ALGORITHM.md (박주상) | ✅ 머지 (2026-05-28) |
| ML 모델 (위치 추정) | 박주상 학습 진행 | 🔄 |
| ML v1·v2 아카이브 | archive/ml-v2/ (gitignored) | ✅ 폐기 |
| 데모 영상 | (TBD) | ⬜ |

## KPI

| 카테고리 | 지표 | 목표 | 현재 |
|---|---|---|---|
| 기능 | 작동 시나리오 수 | ≥ 4 | ✅ 8 (라이브 확인) |
| ML | 사용자 위치 추정 정확도 (박주상 v3) | ≥ 75% | 🔄 박주상 학습 중 |
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
