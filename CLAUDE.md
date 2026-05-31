# CLAUDE.md — 생활 맥락 로봇청소기 (Lucky-GS)

> **⏹️ 프로젝트 종료 (2026-05-30 최종 발표 완료).** 본 문서는 개발 당시의 아키텍처·컨벤션·AI 행동 규칙을 보존한 동결본이다. 활성 개발은 종료됐고, 포트폴리오/참고 목적으로 유지한다. 최종 회고는 [`ROADMAP.md`](./ROADMAP.md), 외부 소개는 [`README.md`](./README.md).
>
> ※ 팀 운영용 내부 문서(`docs/onboarding/`, `docs/research/`, `docs/TEAM_BRIEF.md`, `docs/DEMO_SCRIPT.md`, `exports/kickoff/`, `exports/team-brief/`)는 종료 시점에 공개 레포 트래킹에서 제외(gitignore)하고 로컬에만 보관한다 — 아래 §0 문서 지도의 일부 링크는 레포에 더 이상 없을 수 있다.

> 본 프로젝트의 모든 AI 에이전트(Claude / Gemini / ChatGPT / Codex)는 **이 파일이 단일 진입점**.
> 사람이 읽는 외부 소개는 `README.md`.

---

## 0. 문서 지도 — 어디서 뭘 보는가

**작업 시작 전, 본인 역할에 해당하는 Tier 1·2만 읽어도 충분.** 17개 다 읽지 말 것.

### Tier 1 — 모두가 본다 (진입점)
| 파일 | 누가·언제 | 한 줄 |
|---|---|---|
| `CLAUDE.md` (본 문서) | **모든 AI 에이전트** 세션 시작 시 | 프로젝트 단일 진입점·아키텍처·컨벤션·행동 규칙 |
| `README.md` | 외부·신규 진입자 | 1page 프로젝트 소개·라이브 링크 |
| `ROADMAP.md` | 작업 시작 전 sprint·KPI·내 할 일 확인 | 마일스톤·W2 sprint 배정 표·KPI·멘토 피드백 트래커 |
| `docs/onboarding/{이름}-작업가이드.md` | **본인** 작업 직전 | 본인 역할·이번 주 할 일·산출물 위치 |

### Tier 2 — 트랙별 큰 그림
| 파일 | 누가 메인으로 보는가 | 한 줄 |
|---|---|---|
| `BUSINESS_PLAN.md` | 김준성 (사업·시장·PPT) | 가상 회사 "무빙홈" 사업성 트랙 — 시장·페르소나·STP·SWOT·재무 |
| `TECHNICAL_PLAN.md` | 전유성·박주상 (백엔드·ML) | 기술 트랙 — 6-Layer 아키텍처·시나리오·일정·KPI |

### Tier 3 — 영역별 명세 (필요할 때만)
| 파일 | 언제 보는가 |
|---|---|
| `docs/IOT_DOMAIN.md` | 박주상 (Sensor→Event 매핑) · 전유성 (`/api/infer-events` 변경) |
| `docs/PRD.md` | 새 기능 추가 전 요구사항 확인 |
| `docs/TRD.md` | 코드 구조·API·**기술 스택(§0)**·데이터 모델 — 백엔드 작업 전 |
| `docs/SCORING_RULES.md` | 점수 룰 수정 전 |
| `docs/MOCK_DATA_SCHEMA.md` | 김준성 mock dataset 설계 시 |
| `docs/SCENARIO_EXPANSION_TECH.md` | 신규 시나리오 (택배·식사 후) 구현 시 |
| `docs/DEMO_SCRIPT.md` | 발표·시연 시 + 조현서 Q&A 보강 시 |
| `DEPLOY.md` | 배포 매뉴얼 (Render·Vercel) |
| `DESIGN.md` | 디자인 토큰·컴포넌트 spec (semantic 토큰만 사용) |

### Tier 4 — 운영 (사람만, AI 거의 안 봄)
- `exports/kickoff/` · `exports/planning-v2/` — Typst PDF 산출 (`.typ` 만 편집)
- `CLAUDE.local.md` — 팀장 셀프 메모 (gitignored, 세션 시작 시 자동 로드)

### 작업 흐름 (전형적)
1. `CLAUDE.md` 본 문서 (지금 읽는 중)
2. `ROADMAP.md` §W2 sprint → 내 항목 확인
3. `docs/onboarding/{나}-작업가이드.md` → 산출물·예상 시간
4. 작업 영역의 Tier 3 명세 1~2개만 골라 읽기
5. 변경 후 ROADMAP 체크박스 본인이 갱신

---

## 1. 프로젝트 한 줄

LG 가전 멘토링 트랙. **맥락 인식 + Privacy-on-Edge** 두 축. IoT 멀티센서로 생활 맥락을 추론해 로봇청소기 청소 우선순위를 결정하고(맥락 인식), raw 센서는 엣지에 머물고 high-level event만 클라우드로 보낸다(Privacy-on-Edge). 웹 + 모바일 두 클라이언트가 동일 백엔드를 공유. **3주 안에 작동 데모 + 발표** 가 목표.

- **최종 발표**: 2026-05-30 (금) · **멘토 2차**: TBD · **멘토 1차**: 2026-05-16 ✅ 완료
- **팀 럭키 금성** 4인: 전유성 (팀장) · 김준성 · 박주상 · 조현서
- **가상 회사**: 무빙홈 (MovingHome) — 사업계획서용 시나리오 (학부 과제 가정)

---

## 2. 아키텍처 (요약)

```
[IoT 디바이스 — 도어락/인덕션/냉장고/에어컨/CO₂/…]
              ↓ raw readings (Sensor Layer)
        [Rule + ML 추론]
              ↓ events (Event Layer)
        [Rule-based Scoring]
              ↓ priorities
        [LLM Explanation]
```

- **Sensor Layer** (신규, 2주차) — 12 IoT 센서 raw 시그널. `backend/app/data/sensors.json` 카탈로그 + `SensorReading` Pydantic 모델
- **Event Layer** — 해석된 high-level 명제 (`user_returned`, `cooking_done`, `pre_sleep_30min` …). 사용자 명시 입력도 여기로 합류
- **Rule-based scoring** — 결정론적. 점수 계산은 LLM 금지. (`backend/app/services/scoring.py`)
- **LLM 설명** — 점수표 → 자연어. 4개 시나리오 응답은 디스크 캐시(`backend/app/data/cached_responses/*.json`) — 발표 중 LLM 장애 대비
- **6-Layer 호칭**: Sensor · Behavioral · Spatial · Context · Decision · Explanation (LLM) — 자세한 건 `TECHNICAL_PLAN.md` §3.3

**Privacy on Edge** — Sensor=raw는 디바이스/엣지, Event=결과만 클라우드. `docs/IOT_DOMAIN.md` §Privacy 참조.

---

## 3. 기술 스택

| 영역 | 스택 |
|---|---|
| 백엔드 | Python 3.12 · FastAPI · Pydantic v2 · pytest |
| LLM | OpenAI SDK (Timely GPT bridge) · `gpt-4o-mini` |
| 웹 프론트 | Next.js 15 (App Router · React 19) · TypeScript strict · Tailwind v4 |
| 모바일 | Flutter 3 (Riverpod · Dio · go_router) — Android APK 산출 예정 |
| ML | scikit-learn — 사용자 위치 추정 분류기 (박주상 v3 설계, `docs/CLEANING_DECISION_ALGORITHM.md`). KPI 정확도 ≥75% |
| 패키지 | pip (backend, venv) · pnpm (frontend) · flutter pub (mobile) |
| 배포 | Render (백엔드) · Vercel (웹 프론트) — `main` push 시 자동. 모바일은 GitHub Release APK |

---

## 4. 디렉터리 (루트 기준)

```
backend/   FastAPI 앱 (app/routers, schemas, services, data)
frontend/  Next.js 웹 앱
mobile/    Flutter 앱 (lib/api, screens, state, theme, widgets)
docs/      PRD · TRD · TECH_STACK · SCORING_RULES · IOT_DOMAIN · MOCK_DATA_SCHEMA · onboarding/
exports/   Typst 사업계획서·킥오프 PDF (kickoff/ · planning-v2/)
```

루트 stray 파일 금지 (글로벌 CLAUDE.md 규약). 임시는 `tmp/`, 폐기는 `archive/` (둘 다 gitignored).

---

## 5. 로컬 실행

```bash
# 백엔드 (pytest 50/50 expected)
cd backend && .venv/Scripts/activate && uvicorn app.main:app --port 8123 --reload

# 웹 프론트
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8123 pnpm dev

# 모바일 (웹 미리보기)
cd mobile && flutter run -d chrome --web-port 8770

# 테스트
cd backend && pytest -v
cd frontend && pnpm typecheck
cd mobile && flutter analyze && flutter test
```

LLM 호출 키: `backend/.env`의 `TIMELY_API_KEY` (출력 금지).

---

## 6. 컨벤션

- **백엔드**
  - Pydantic v2. 모든 외부 입력 검증 (시각 `HH:MM`, `user_location` 화이트리스트, 이벤트 ID 존재성, 센서 ID 화이트리스트).
  - 점수 엔진 변경 시 `backend/tests/test_scoring.py` golden test 깨지면 룰을 검토. 테스트를 임의 수정해 통과시키지 말 것.
  - LLM 응답 변경 후 `backend/scripts/seed_cache.py` 재실행해 캐시 동기화.
  - 새 센서·추론 규칙은 `sensors.json` / `sensor_inference_rules.json` 만 수정 (코드 분기 금지).
- **웹 프론트**
  - TypeScript strict. `any` 금지. API 타입은 `frontend/lib/types.ts`에서 단일 출처.
  - 디자인 토큰은 `app/globals.css` `@theme`. 색은 `paper / ink / lg-red / gold / line` — 임의 hex 추가 금지.
  - a11y: H1 1개, SVG `role="img" + aria-label`, 색 대비 AA.
  - 차트 라이브러리 도입 금지 (inline SVG + Tailwind).
- **모바일**
  - Riverpod state, Dio HTTP. API 모델은 `mobile/lib/api/models/` 단일 출처.
  - 디자인 토큰은 `mobile/lib/theme/tokens.dart` — 웹 토큰(paper/ink/lg-red/gold)과 1:1 매핑.
  - `flutter analyze` 0 issue 유지.
- **공통**
  - 한국어 UI·문서. 코드 식별자는 영어.
  - 커밋 메시지는 한국어 OK (기존 history 따름).

---

## 7. AI agent 행동 규칙

- **요청된 것만** — Karpathy 원칙 (글로벌 CLAUDE.md §LLM 코딩 행동 원칙) 그대로 적용. 인접 코드 개선·리팩터·추상화 도입 금지.
- **문서 우선 읽기** — 작업 전 `ROADMAP.md` (현재 sprint·블로커) + 관련 `docs/*.md` 확인. BUSINESS/TECHNICAL_PLAN은 큰 그림.
- **신규 파일 자제** — README·요약 문서 자동 생성 금지. 사용자 명시 요청 시에만.
- **배포 영향 변경** — `render.yaml`, `frontend/vercel.json`, `frontend/next.config.ts`, `mobile/pubspec.yaml`, `.env*` 손대기 전 사용자 확인.
- **킥오프/사업계획서 PDF** — `exports/kickoff/` · `exports/planning-v2/` 의 `.typ` 만 수정하고 `typst compile` 로 재생성. 손으로 `.pdf` 편집 금지.
- **점수 룰 / 센서 규칙 변경** — `backend/app/data/*.json` 만 변경하면 자동 반영. 코드 분기 추가 금지 (확장성 KPI: 새 이벤트·센서 추가 30분 이내).
- **모바일 ↔ 웹 동기화** — API 응답 스키마 바꾸면 양쪽 모델 같이 업데이트.

---

## 8. 팀 협업 도구

| 채널 | 용도 |
|---|---|
| **Slack** | 대화·실시간 소통 (질문·hand-off 알림·blocker) |
| **Notion** | 파일 공유 (정리된 문서·자료·산출물 링크) |
| **GitHub** (`Team-LG-Clean-Robot/cleaning-context`) | 코드·문서·PR (모든 작업물의 source of truth) |

원칙: **코드·문서 = GitHub PR**, **참고 자료·정리본 = Notion**, **빠른 대화 = Slack**. 같은 정보 두 곳에 두지 말 것.

---

## 9. 외부 참조

- **라이브 웹**: https://robot-cleaner.askewly.com/  (backup: https://cleaning-context.vercel.app/)
- **백엔드 헬스**: https://cleaning-context-backend.onrender.com/api/health
- **멘토 트랙**: 성균관대 RISE 사업단 · LG전자 가전 멘토링
