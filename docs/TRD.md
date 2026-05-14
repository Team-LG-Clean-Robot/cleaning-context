# TRD — 기술 설계

> [PRD.md](./PRD.md)의 요구사항을 코드 구조·API·데이터 모델로 변환한다.
> Scoring 룰의 구체 수치는 [SCORING_RULES.md](./SCORING_RULES.md), 데이터 형태는 [MOCK_DATA_SCHEMA.md](./MOCK_DATA_SCHEMA.md).

## 1. 시스템 구성

```
┌─────────────────────┐         ┌──────────────────────────────┐
│  Next.js (3000)     │  HTTP   │  FastAPI (8000)              │
│  - 2D 맵 / 패널     │ ──────▶ │  /api/scenarios              │
│  - 우선순위 리스트   │         │  /api/simulate               │
│  - AI 설명 카드     │ ◀────── │  /api/health                 │
└─────────────────────┘         │                              │
                                │  ┌────────────────────────┐  │
                                │  │ Context Builder        │  │
                                │  │  (시나리오→컨텍스트)    │  │
                                │  └─────────┬──────────────┘  │
                                │            ▼                 │
                                │  ┌────────────────────────┐  │
                                │  │ Scoring Engine         │  │
                                │  │  (Rule-based, pure fn) │  │
                                │  └─────────┬──────────────┘  │
                                │            ▼                 │
                                │  ┌────────────────────────┐  │
                                │  │ LLM Explainer          │  │
                                │  │  (OpenAI gpt-4o-mini)  │  │
                                │  │  + disk cache          │  │
                                │  └────────────────────────┘  │
                                └──────────────────────────────┘
```

PLANNING.md §3.2 5-Layer 매핑:
- Spatial Layer → `data/rooms.json`
- Behavioral Layer → `data/events.json`
- Context Layer → `services/context_builder.py`
- Decision Layer → `services/scoring.py`
- Explainable AI Layer → `services/llm_explainer.py`

## 2. 디렉토리 구조

```
team-project-lg/
├── PLANNING.md
├── docs/
│   ├── TECH_STACK.md
│   ├── PRD.md
│   ├── TRD.md
│   ├── SCORING_RULES.md
│   └── MOCK_DATA_SCHEMA.md
├── backend/
│   ├── pyproject.toml
│   ├── .env.example
│   ├── app/
│   │   ├── main.py              # FastAPI app, routers 등록
│   │   ├── config.py            # 환경변수
│   │   ├── schemas/
│   │   │   ├── room.py
│   │   │   ├── event.py
│   │   │   ├── scenario.py
│   │   │   └── simulation.py    # 요청·응답 모델
│   │   ├── services/
│   │   │   ├── context_builder.py
│   │   │   ├── scoring.py       # pure functions, 단위 테스트 대상
│   │   │   ├── llm_explainer.py
│   │   │   └── cache.py
│   │   ├── routers/
│   │   │   ├── scenarios.py
│   │   │   └── simulate.py
│   │   └── data/
│   │       ├── rooms.json
│   │       ├── events.json
│   │       └── scenarios.json
│   ├── cache/
│   │   └── scenarios/           # gitignored or committed (TBD)
│   └── tests/
│       ├── test_scoring.py
│       └── test_simulate.py
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx             # 메인 시뮬레이터 페이지
    │   └── api/                 # (사용 X — 백엔드 직접 호출)
    ├── components/
    │   ├── HouseMap.tsx         # SVG 2D 맵 + heatmap
    │   ├── ScenarioPanel.tsx
    │   ├── PriorityList.tsx
    │   └── ExplanationCard.tsx
    ├── lib/
    │   ├── api.ts               # fetch wrapper
    │   └── types.ts             # 백엔드 schema와 1:1
    └── styles/
        └── globals.css
```

## 3. 데이터 모델 (Pydantic)

```python
# schemas/room.py
class Room(BaseModel):
    id: str                     # "entrance", "living", "kitchen", "bedroom", "bathroom"
    name_ko: str
    base_score: int             # rest 상태 우선순위 (PLANNING.md 표의 "기본")
    noise_sensitivity: int      # 0-10
    last_cleaned_hours: float
    bbox: dict                  # {x, y, w, h} — 프론트 SVG 좌표
```

```python
# schemas/event.py
class EventEffect(BaseModel):
    room_id: str
    delta: int                  # 점수 가산/차감

class Event(BaseModel):
    id: str                     # "rain", "user_returned", "cooking_done", ...
    name_ko: str
    effects: list[EventEffect]
```

```python
# schemas/simulation.py
class SimulateRequest(BaseModel):
    scenario_id: str | None = None     # 사전 정의 시나리오
    custom: CustomContext | None = None # P2: 직접 입력

class RoomScore(BaseModel):
    room_id: str
    base: int
    breakdown: list[ScoreContribution]  # [{event_id, delta}, ...]
    final: int
    mode: Literal["normal", "quiet", "delayed", "excluded"]
    exclusion_reason: str | None

class SimulateResponse(BaseModel):
    scenario_id: str
    context_summary: str
    rooms: list[RoomScore]              # 점수 내림차순
    explanation: str                    # LLM 출력
    fallback: bool                      # LLM 실패 시 true
    duration_ms: int
```

## 4. API 명세

### `GET /api/scenarios`
사전 정의된 4개 시나리오 메타 반환.
**응답:** `[{id, name_ko, description, time, weather, ...}]`

### `POST /api/simulate`
**요청:** `SimulateRequest`
**응답:** `SimulateResponse`
**처리:**
1. `context_builder.build(scenario_id)` → context dict
2. `scoring.compute(context, rooms)` → list[RoomScore]
3. cache hit 검사 (key = scenario_id)
4. miss면 `llm_explainer.generate(context, scores)` → explanation
5. 캐시 저장 후 응답

### `GET /api/health`
`{status: "ok", llm_available: bool, cache_size: int}`

## 5. Scoring Engine (핵심)

순수 함수. 부수효과·LLM·I/O 없음. 단위 테스트 100% 커버.

```python
def compute_scores(
    rooms: list[Room],
    events: list[Event],
    time_context: TimeContext,    # current_time, sleep_time, etc
) -> list[RoomScore]:
    ...
```

룰 정의는 [SCORING_RULES.md](./SCORING_RULES.md). 코드는 그 표를 그대로 데이터로 읽어 적용 (하드코딩 X).

**모드 결정:**
- `final < 0` → `excluded`
- 시간이 취침 30분 이내 & noise_sensitivity ≥ 7 → `quiet`
- 사용자 점유 공간 → `delayed`
- 그 외 → `normal`

## 6. LLM Explainer

```python
def generate_explanation(
    context_summary: str,
    scores: list[RoomScore],
) -> str:
    prompt = build_prompt(context_summary, scores)
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": SYSTEM_PROMPT},
                  {"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=400,
    )
    return response.choices[0].message.content
```

**프롬프트 원칙 (PLANNING.md §3.4 LLM의 역할 한정):**
- 점수 계산 X. 점수표를 컨텍스트로 받아 자연어로 설명만.
- "왜 이 공간을 먼저?", "왜 이 공간을 제외?" 두 질문에 답하는 구조 강제.
- 출력 길이 200-300자.

## 7. 캐싱

`backend/cache/scenarios/{scenario_id}.json` — 시나리오 ID 단위 디스크 캐시. 발표 안정성용. TTL 없음 (수동 invalidate).

## 8. 환경변수 (`.env.example`)

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
LLM_TIMEOUT_SEC=10
CACHE_DIR=./cache/scenarios
CORS_ORIGINS=http://localhost:3000
```

## 9. 테스트 전략

| 레이어 | 도구 | 범위 |
|---|---|---|
| Scoring engine | pytest | PLANNING.md §4 시나리오 4종 점수표 reproducibility (golden test) |
| API | pytest + httpx TestClient | `/simulate` 4 시나리오 200 응답, 응답 schema 검증 |
| LLM explainer | mock + 1회 실호출 smoke | timeout·fallback 동작 |
| Frontend | (생략, 발표 데모 우선) | |

## 10. 배포 순서 (실행 시점)

1. 백엔드 로컬 검증 → Render 배포 (이때 OPENAI_API_KEY env 등록)
2. 프론트엔드 `NEXT_PUBLIC_API_URL` env 설정 → Vercel 배포
3. Vercel URL을 백엔드 CORS_ORIGINS에 추가 → 재배포

## 11. 결정 보류

- ML 이벤트 분류기 (`/api/classify-event`) 라우트는 P2. 모델 학습 후 별도 router 추가
- 인증 X — 누구나 호출 가능. rate limit 필요 시 slowapi 추가 검토
