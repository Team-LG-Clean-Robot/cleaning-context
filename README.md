# 생활 맥락 로봇청소기

> LG전자 가전 멘토링 트랙 · 팀 럭키 금성 · 성균관대 AI Intensive Project (2026-05)

**IoT 멀티센서로 생활 맥락을 추론**하고, 로봇청소기가 어디를·언제·어떻게 청소할지 결정하고 그 이유를 **자연어로 설명**하는 시뮬레이터. 웹 + 모바일 두 클라이언트가 동일 백엔드를 공유.

## 라이브

- **웹**: https://robot-cleaner.askewly.com/  (backup: https://cleaning-context.vercel.app/)
- **API 헬스체크**: https://cleaning-context-backend.onrender.com/api/health
- **모바일 (Flutter)**: APK 배포 예정 (`mobile/`)

## 포지셔닝 — 두 축

> **맥락 인식 + Privacy-on-Edge**. 단순 청소가 아닌 *생활 맥락 기반* 우선순위 결정, raw 센서는 디바이스에 머물고 결과(event)만 클라우드로.

1. **맥락 인식 (context-aware cleaning).** 시간·요리·취침·날씨·손님 일정을 결합해 "지금 어디를 왜 청소해야 하는가"를 결정. "스케줄 청소"·"맵 기반 분할 청소"를 넘어선 다음 축.
2. **Privacy-on-Edge.** ML·rule 추론은 디바이스(엣지)에서, 클라우드로는 high-level event만 전송. 카메라·오디오·인체 위치 같은 민감 신호가 외부로 나가지 않음 — LG 차별화 + 규제 친화.
3. **(보조) 확장성 + 설명 가능성.** 새 센서·룰은 JSON만 수정해 30분 내 추가. 모든 결정은 점수 breakdown으로 추적 가능 — LLM 장애 시에도 룰만으로 동작.

자세한 기술·시장은 [TECHNICAL_PLAN.md](./TECHNICAL_PLAN.md) / [BUSINESS_PLAN.md](./BUSINESS_PLAN.md) (가상 회사 "무빙홈" 시나리오) 참조.

## 시스템 (6-Layer)

```
[IoT 센서 — 도어락/인덕션/냉장고/에어컨/CO₂/…]
   ↓  Sensor Layer  (raw readings)
[Rule + ML 추론]
   ↓  Event Layer   (cooking_done, user_returned, pre_sleep_30min…)
[Rule-based Scoring]   ← 결정론적, 재현 가능
   ↓  Decision Layer
[LLM Explanation]      ← 자연어로 이유 생성
```

- **Spatial** — 5개 공간 + 속성(오염도·사용 빈도·소음 민감도)
- **Behavioral** — 사용자 행동·이벤트
- **Sensor** *(신규, 2주차)* — 12 IoT 센서 + 13 추론 규칙. raw=디바이스, 결과=클라우드 분리 (Privacy on Edge)
- **Context · Decision · Explainable** — 위 다이어그램

Rule-based + LLM 분리: 점수 계산은 결정론적(재현성·디버깅), LLM은 점수표 해석만.

## 데모 시나리오 4종

| 시나리오 | 입력 | 핵심 의사결정 |
|---|---|---|
| 비 오는 날 귀가 | 20:30 · 비 · 사용자 귀가 · 취침 2h 전 | 현관 우선 + 침실 제외 |
| 요리 직후 | 19:20 · 요리 완료 · 거실에 사용자 | 주방 즉시 + 거실 지연 |
| 취침 직전 | 22:50 · 취침 30분 전 · 침실에 사용자 | 침실·거실 제외 + 현관·주방 저소음 |
| 손님 방문 예정 | 17:00 · 2시간 후 방문 | 거실·현관 우선 |

추가로 **직접 입력 모드** + **IoT 센서 추론 모드** (`POST /api/infer-events`).

## 기술 스택

| 영역 | 스택 |
|---|---|
| 백엔드 | Python 3.12 · FastAPI · Pydantic v2 · pytest 50 |
| LLM | OpenAI SDK via Timely GPT bridge · gpt-4o-mini |
| 웹 프론트 | Next.js 15 · TypeScript · Tailwind v4 |
| 모바일 | Flutter 3 · Riverpod · Dio · go_router |
| ML (2주차) | scikit-learn (DecisionTree → RF → GB) |
| 배포 | Render (백엔드) · Vercel (웹) · GitHub Release (APK 예정) |

## 디렉토리

```
backend/    # FastAPI — routers/schemas/services/data/tests
frontend/   # Next.js 웹 앱
mobile/     # Flutter 모바일 앱
docs/       # PRD · TRD · IOT_DOMAIN · SCORING_RULES · onboarding/
exports/    # Typst PDF (kickoff, planning-v2)
BUSINESS_PLAN.md / TECHNICAL_PLAN.md / ROADMAP.md
```

## 로컬 실행

```bash
# 백엔드
cd backend && python -m venv .venv && .venv/Scripts/activate
pip install -e . && cp .env.example .env  # TIMELY_API_KEY 채움
uvicorn app.main:app --port 8123 --reload

# 웹 프론트
cd frontend && pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8123 pnpm dev

# 모바일 (웹 미리보기)
cd mobile && flutter run -d chrome --web-port 8770

# 테스트
cd backend && pytest -v      # 50 케이스
cd frontend && pnpm typecheck
cd mobile && flutter analyze && flutter test
```

## 팀

| 이름 | 전공 | 역할 |
|---|---|---|
| **전유성** (팀장) | 글로벌경영 | 총괄·백엔드·LLM·배포·발표 스토리 |
| **김준성** | 글로벌경영 | 데이터·시장·발표 PPT 리드 |
| **박주상** | 인공지능 | ML 이벤트 분류 모델·LLM 프롬프트 |
| **조현서** | 글로벌경영 | (5/15 킥오프 결과 반영 예정) |

## 일정

총 3주 (2026-05-13 ~ 2026-05-30). 자세한 진척·KPI·블로커는 [ROADMAP.md](./ROADMAP.md).

| 주차 | 기간 | 핵심 |
|---|---|---|
| W1 | 5/13~19 | MVP 백·프론트·배포·사업계획서 v1 ✅ |
| W2 | 5/20~26 | 멘토 피벗 반영 + 모바일 + ML ← **현재** |
| W3 | 5/27~30 | 발표 PPT·리허설·**5/30 최종 발표** |

## 라이선스

학내 프로젝트 — 외부 배포 시 팀 문의.
