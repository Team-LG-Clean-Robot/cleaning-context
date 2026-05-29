# 기술 기획서 (Technical Plan)

**과제명**: 생활 맥락을 이해하는 로봇청소기 — 가정용 Physical AI Agent 시뮬레이터
**팀명**: 럭키 금성
**최초 작성**: 2026.05.14 · **분리**: 2026.05.16 (사업성·기술 트랙 분리) · **기술 중심 재구성**: 2026.05.29
**소속**: 성균관대 RISE 사업단 · AI Intensive Project · LG전자 가전 멘토링 트랙
**구성원**: 전유성 (팀장) · 김준성 · 박주상 · 조현서

---

## 0. 문서 위치 — 이 문서가 다루는 것 / 다루지 않는 것

본 문서는 **기술 트랙**이다. 시스템 아키텍처·데이터 모델·추론/스코어링 엔진·클라이언트·배포를 다룬다.

| 다루지 않음 (다른 문서) | 위치 |
|---|---|
| 시장·페르소나·STP·SWOT·경쟁 분석·수익모델·재무 | [BUSINESS_PLAN.md](./BUSINESS_PLAN.md) (가상 회사 "무빙홈") |
| 발표 서사·슬라이드·멘토 Q&A | [docs/PRESENTATION.md](./docs/PRESENTATION.md) · [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) |
| 코드 구조·API 상세·데이터 모델 전체 | [docs/TRD.md](./docs/TRD.md) |
| IoT 센서 카탈로그·추론 규칙·Privacy 경계 | [docs/IOT_DOMAIN.md](./docs/IOT_DOMAIN.md) |
| 점수 룰·golden 값 상세 | [docs/SCORING_RULES.md](./docs/SCORING_RULES.md) |
| ML v3 위치 추정 설계 | [docs/CLEANING_DECISION_ALGORITHM.md](./docs/CLEANING_DECISION_ALGORITHM.md) |

> 본 문서는 **기술 내러티브 + 단일 진입 요약**이다. 깊은 명세는 위 문서로 연결하고 여기서 중복하지 않는다. 런타임 ground truth는 항상 `backend/app/data/*.json`.

---

## 1. 요약 & 기술적 문제 정의

### 1.1 한 줄 요약

사용자의 생활 이벤트·공간 정보·외부 상황 데이터를 분석해 로봇청소기가 **언제·어디를·어떻게** 청소할지 결정론적으로 판단하고, 그 이유를 자연어로 설명하는 AI 의사결정 시뮬레이터. **청소 경로 최적화가 아니라, AI 가전의 의사결정 UX를 설계하는 실험.**

### 1.2 기술적 문제 — "센서 → 결정·이유" 매핑의 부재

현재 로봇청소기는 **공간(SLAM)** 은 인식하지만 **상황·맥락**은 모델링하지 않는다. 기술적으로 빠진 것은:

1. **이질적 IoT 시그널을 high-level 명제로 변환하는 추론 계층** — 도어락 unlock·인덕션 OFF·습도 급증 같은 raw readings를 `user_returned`·`cooking_done`·`recent_shower` 같은 이벤트로 묶는 단계
2. **맥락 → 공간별 우선순위를 결정론적으로 산출하는 엔진** — "비가 왔고 방금 귀가했으니 현관"을 재현 가능하게 계산
3. **결정의 근거를 추적·설명하는 계층** — 블랙박스 분류가 아니라 점수 breakdown
4. **이 모든 추론을 디바이스(엣지)에서 끝내는 경계** — raw 시그널을 클라우드로 보내지 않음 (Privacy-on-Edge)

본 프로젝트는 이 4가지를 6-Layer 파이프라인으로 구현한다. (경쟁 제품·시장 비교는 BUSINESS_PLAN §5)

### 1.3 두 축 포지셔닝 (기술 관점)

- **맥락 인식** — 시간·요리·취침·날씨·손님 일정·재실을 결합해 우선순위 결정 (스케줄·맵 분할을 넘어선 결정 계층)
- **Privacy-on-Edge** — ML·rule 추론을 디바이스에서 끝내고, 클라우드로는 high-level event만 전송 (§2.2)

---

## 2. 시스템 아키텍처

### 2.1 6-Layer 구조

```
[IoT 디바이스 — 도어락·인덕션·냉장고·에어컨·TV·침대·모션·욕실습도·스피커 + 날씨/캘린더 API]
              ↓ raw readings (edge only)
    [1. Sensor Layer]        12종 센서 카탈로그 + SensorReading 스키마
              ↓ ML(위치) + Rule(이벤트 추론)
    [2. Behavioral Layer]    user_room 추정 + high-level event 생성  ← 박주상 v3
              ↓ high-level event only ────────→ ( 클라우드 경계 )
    [3. Spatial Layer]       5개 방 + 속성(base_score·noise_sensitivity)
              ↓
    [4. Context Layer]       시간·이벤트·공간상태 결합 (날씨=rain 이벤트, 청소이력=gap_rooms)
              ↓
    [5. Decision Layer]      Rule-based 두 축 스코어링 (결정론·재현)
              ↓ priorities
    [6. Explanation Layer]   LLM 자연어 설명 (장애 시 fallback)
```

각 레이어 호칭: Sensor · Behavioral · Spatial · Context · Decision · Explanation. Layer 1~2는 엣지(디바이스), 3~6은 클라우드(또는 디바이스 내 상위 모듈)에 위치한다고 가정한다.

### 2.2 Privacy-on-Edge 경계 — 목표 아키텍처 vs 현재 데모

**목표 아키텍처.** Layer 1~2(Sensor·Behavioral)를 디바이스/엣지에 둔다. raw readings(도어락 상태·인덕션 W·습도 %·모션·침대 압력 등, `SensorReading.state`)는 엣지에서 추론에만 쓰이고, 클라우드로는 high-level event(`user_returned`·`cooking_done`·`pre_sleep_30min` 등 + confidence)만 나간다. 엣지 디바이스가 실재하면 raw 시그널이 네트워크를 떠나지 않는다.

| | 데이터 | 목표 위치 | 클라우드로 나가는가 (목표) |
|---|---|---|---|
| **raw readings** | 센서 원시 상태 (`SensorReading.state`) | 디바이스/엣지 | ✗ |
| **high-level event** | 추론된 명제 + confidence | 엣지 → 클라우드 | ✓ 이것만 |

**현재 데모 구현 (정직한 단서).** 본 프로젝트엔 실제 엣지 디바이스가 없어, 추론을 **클라우드 백엔드(Render)가 대행**한다 — 즉 `POST /api/simulate`(sensor_readings)·`/api/infer-events`는 raw `SensorReading`을 네트워크로 받는다. 다만:

- raw readings는 **비저장(ephemeral)** — 디스크·DB·로그에 쓰는 경로가 코드에 전혀 없다(캐시는 시나리오 응답만, 키=scenario_id). 코드로 검증 가능.
- 우선순위 계산·LLM 설명은 raw가 아니라 **파생 이벤트(`active_events`)** 로만 동작한다. raw → 추론 경계가 코드에서 분리돼 있어, 엣지 배치 시 Layer 1~2만 디바이스로 옮기면 그대로 Privacy-on-Edge가 성립한다.

상세 경계 정의는 [docs/IOT_DOMAIN.md](./docs/IOT_DOMAIN.md) §Privacy.

### 2.3 AI vs Rule vs LLM — 역할 분리

"GPT 한 번 호출" 구조와 구별하는 핵심. 세 컴포넌트를 명확히 분리한다.

| 컴포넌트 | 입력 → 출력 | 성격 |
|---|---|---|
| **ML 위치 추정** | 위치성 센서 벡터 → `user_room` 5-class + `location_confidence` | 박주상 v3 — **구현 완료** (CASAS hh106, RandomForest, §4.2) |
| **Rule 추론 + Scoring** | 센서/이벤트 + 외부변수(weather·calendar·time) → 추론 이벤트 + 공간별 priority | 결정론·재현 100%, "왜?" 설명 가능 (§4·§5) |
| **LLM (보조)** | 점수표 → 자연어 설명 | 점수 계산에 **불관여**, 장애 시 fallback (§6) |

---

## 3. 데이터 모델 & 도메인

### 3.1 도메인 규모 (현행)

| 엔티티 | 수 | 단일 출처 |
|---|:-:|---|
| 방 (Room) | 5 (현관·거실·주방·침실·욕실) | `data/rooms.json` (점수 modifier는 `scoring_rules.json`) |
| 이벤트 (Event) | 14 | `data/events.json` |
| 데모 시나리오 | 8 | `data/scenarios.json` |
| IoT 센서 | 12 | `data/sensors.json` |
| 센서 추론 규칙 | 13 | `data/sensor_inference_rules.json` |

### 3.2 JSON 단일 출처 원칙 — 확장성 KPI

룰·이벤트·센서·점수를 **코드에 박지 않고** JSON으로 외부화한다. 새 센서·이벤트·룰 추가 시 코드 분기 없이 JSON만 수정 → **30분 내 추가**(확장성 KPI, §14). 점수 계산 로직(`scoring.py`)은 데이터 주도(data-driven)이므로 도메인이 늘어도 엔진은 그대로다.

### 3.3 핵심 스키마 (`backend/app/schemas/`)

상세 필드·검증은 [docs/TRD.md](./docs/TRD.md). 요지만:

```python
# 센서 raw readings (엣지 입력)
SensorReading(sensor_id, state: dict, ts: datetime, room_id: str | None)

# 추론된 high-level event (엣지 → 클라우드)
InferredEvent(event_id, confidence: float[0..1], source: "rule"|"ml",
              triggered_by: list[str], rule_descriptions: list[str])

# 공간별 점수 결과 (두 축 분해 포함)
ScoreContribution(source, label_ko, delta: int, axis: "need"|"opportunity")
RoomScore(room_id, base, breakdown: list[ScoreContribution],
          final: int, mode: Mode, exclusion_reason: str | None)
Mode = "normal" | "quiet" | "delayed" | "excluded"
```

입력 검증(Pydantic v2): 시각 `HH:MM` 정규식, `user_location` 화이트리스트(5개 방), 이벤트/센서 ID 존재성, 이벤트 최대 10개·중복 금지.

### 3.4 14개 이벤트

`rain` · `user_returned` · `user_left` · `cooking_done` · `cooking_active` · `meal_prep` · `meal_finished` · `recent_shower` · `tv_watching` · `package_delivery` · `pre_sleep_2h` · `pre_sleep_30min` · `guest_arriving_2h` · `guest_visit_recent`. axis 분류는 §5.2.

---

## 4. 추론 파이프라인 (Sensor → Event)

raw readings를 active_events로 변환하는 Behavioral Layer. `POST /api/infer-events`(`InferRequest` → `InferResponse`).

### 4.1 룰 기반 추론 엔진 (현재 작동)

`services/sensor_inference.py`가 13개 규칙(`sensor_inference_rules.json`)을 평가한다.

- **규칙 구조**: `trigger`(sensor·match·within_min) → `emit_event`. 예: 도어락 외부→안 → `user_returned`(R-RETURN-1) · 인덕션 ON→OFF(직전 30분 ON) → `cooking_done`(R-COOK-DONE-1) · 냉장고 1h 내 4회+ 개폐 → `meal_prep`(R-FRIDGE-MEAL-1) · 욕실 습도 80%+·급증 → `recent_shower`(R-SHOWER-1)
- **confidence**: 규칙은 라벨(`high`·`medium`·`deterministic`)을 달고, 엔진이 float로 매핑(high 0.9 / medium 0.6 / deterministic 1.0, 미정의 시 0.5). weather·calendar 유래는 `deterministic`
- **dedup**: 같은 `emit_event`는 최고 confidence로 병합, `triggered_by`(센서)·`rule_descriptions` 누적
- 출력: `inferred_events`(confidence 내림차순) + `user_location_hint`. **현 `user_location_hint`는 ML이 아니라 휴리스틱** — "가장 최근 `motion_sensor`가 트리거된 방"(R-USER-LOC-1)

### 4.2 ML 위치 추정 (박주상 v3) — 구현 완료

ML 역할은 설계대로 **사용자 위치 추정 한 가지**다 ([docs/CLEANING_DECISION_ALGORITHM.md](./docs/CLEANING_DECISION_ALGORITHM.md) §1). `app/ml/`에 구현돼 있다.

- **학습 데이터**: CASAS hh106 (WSU, Zenodo CC BY 4.0). 단일 거주자 스마트홈의 방별 모션 로그 202,546행 → ON 이벤트의 location 컬럼이 곧 ground-truth 위치. `app/ml/casas.py`가 CASAS 방을 우리 5-class로 매핑(`Kitchen→kitchen`, `LivingRoom/WorkArea/LoungeChair→living`, `DiningRoom→kitchen`, `OutsideDoor→entrance` …).
- **feature** (`app/ml/features.py`): 위치성 센서 활동을 **방별 시간감쇠 활동량**(act + recency, τ=5분, 30분 윈도우) + 시각(hour sin/cos)으로 환원. CASAS 학습과 런타임 `SensorReading`이 **같은 feature 공간**으로 떨어져 모델이 그대로 전이된다.
- **모델**: RandomForest(200 trees, depth 14, class_weight=balanced), `scripts/train_location_model.py`로 학습 → `app/ml/location_model.joblib`(3.1MB, git 추적). 지표는 `location_metrics.json`.
- **성능**: holdout accuracy **98.9%**, 5-fold CV **99.0%**, 5개 방 F1 0.987–0.998. (단일 거주자 위치는 본질적으로 자기상관이 강해 정확도가 높다 — ML의 실효 가치는 **calibrated confidence**[§1.3 임계 판단]와 런타임의 **이질 센서 융합**이다.)
- **fallback** (설계 §1.3, `app/ml/estimator.py`): `confidence ≥ 0.60` → ML / 미만 → 최근 `motion_sensor` 방 / 무신호 → door_lock 외출잠금 시 `away`. 모델 부재·손상 시에도 휴리스틱으로 안전 동작.
- **mode**: `/api/infer-events`의 `mode=ml|hybrid` → ML 추정 + `location_confidence`·`model_version`·`location_source="ml"`. `mode=rule` → 휴리스틱만. `/api/simulate`의 `sensor_readings` 경로는 ML 추정으로 `user_location`을 채워 점유 페널티에 반영.

> **v1·v2 아카이브.** 5/26까지의 multi-label **이벤트 분류기**(v1 CASAS hh106 85.1% 합성학습 / CASAS 룰검증 55%, v2 IoT 합성 99.3%)는 `archive/ml-v2/`(gitignored, 로컬 전용). v3는 ML 역할을 "이벤트 직접 분류" → "위치 추정"으로 좁혀, 같은 CASAS hh106을 **위치 라벨**로 재사용한다.

---

## 5. 의사결정 엔진 (Decision Layer)

`services/scoring.py` — 결정론적 `compute_scores`. 점수 계산에 LLM은 관여하지 않는다.

### 5.1 두 축 산식 (Need × Opportunity)

각 contribution은 두 축 중 하나로 분류되고, 최종 점수는 둘의 합이다.

```
final_score(room) = need_score(room) + opportunity_score(room)

need_score        = base_score + Σ dirt_event.delta
                    (rain·user_returned·cooking_done·recent_shower·… — 더러움 누적)
opportunity_score = Σ timing.delta
                    (pre_sleep 페널티 · user_occupancy −20 · guest invitation · noise×sleep −10)
```

각 `ScoreContribution`은 `axis: "need"|"opportunity"` 필드를 달고 emit되어 RoomDetail·ScoringRulebook에서 **두 박스**로 시각화된다. 상세 산식·역사용 단일식은 [docs/SCORING_RULES.md](./docs/SCORING_RULES.md).

### 5.2 입력 → 축 매핑

| 입력/이벤트 | 축 |
|---|:-:|
| rain · user_returned · cooking_done · recent_shower · meal_prep · tv_watching … | **Need** |
| pre_sleep_30min/2h · guest_arriving_2h · user_occupancy · noise×sleep | **Opportunity** |

> IoT 센서 이벤트 대다수가 Need, 캘린더·시간·사용자 위치가 Opportunity. 두 축이 논리적으로 분리되므로 데모에서 박스 둘로 그리면 청중이 한눈에 이해.

### 5.3 modifier & 모드 결정

`scoring_rules.json`의 modifier 적용 후 모드를 정한다.

| 조건 | 효과 / 모드 |
|---|---|
| `user_location == room.id` | −20 (opportunity) → `final > 0`이면 `delayed`("30분 후 재시도") |
| `pre_sleep_30min` 활성 & `noise_sensitivity ≥ 7` | −10 추가 (opportunity) |
| `pre_sleep_30min` 활성 & `noise_sensitivity ≥ 4` & `final > 0` | `quiet`(저소음) |
| `final < 0` | `excluded` (사유: dominant 페널티 항목 인용) |
| 그 외 | `normal` |

로봇 청소 큐는 `excluded`·`delayed`를 제외하고 `final` 내림차순으로 방문한다.

### 5.4 결정론·재현성

동일 입력 → 동일 출력 100% (Rule-based). golden test(`test_scoring.py`)가 8 시나리오의 기대 점수를 고정한다. 점수 룰 변경 시 golden test가 깨지면 룰을 검토하지 테스트를 고쳐 통과시키지 않는다.

---

## 6. 데모 시나리오 (8종)

공간 5개, 두 축 산식. base_score·delta는 v2 가설값(런타임 ground truth = `data/*.json`). 워크드 예시는 `test_scoring.py` golden과 1:1.

**v2 공간 기본값**: 현관 22 · 거실 20 · 주방 28 · 침실 12 · 욕실 18 (noise_sensitivity 2·5·4·9·3)

**① 비 오는 날 귀가** — 20:30 · `rain · user_returned · pre_sleep_2h` · 사용자 거실

| 공간 | Need (base + 더러움) | Opportunity (취침·점유) | 최종 | 모드 |
|---|:-:|:-:|:-:|:-:|
| 현관 | 22 + 25(비) + 15(귀가) = 62 | 0 | **62** | normal |
| 주방 | 28 | 0 | **28** | normal |
| 욕실 | 18 | 0 | **18** | normal |
| 거실 | 20 + 5(비) + 5(귀가) = 30 | +5(취침前) − 20(점유) = −15 | **15** | delayed |
| 침실 | 12 | −20(취침前 침실) | **−8** | excluded |

> **LLM 출력 예.** "비가 와서 현관 오염 가능성이 높고 사용자가 방금 귀가해 현관을 최우선으로 청소합니다. 거실은 사용자가 머물러 30분 후로 지연, 침실은 후순위로 제외했습니다."

**② 요리 직후** — 19:20 · `cooking_done` · 사용자 거실 → 주방 28+35=**63**(1위), 거실 20+5−20(점유)=**5**(delayed)
**③ 손님 방문 예정** — 17:00 · `guest_arriving_2h` → 거실 50 · 주방 38 · 현관 37 · 욕실 33 · 침실 7
**④ 취침 직전** — 22:50 · `pre_sleep_30min` · 사용자 침실 → 침실 12−40−20−10=**−58**(excluded), 거실·주방 **quiet**

### 8개 시나리오 전체 (`scenarios.json`)

| # | scenario_id | 라벨 | 주요 이벤트 |
|:-:|---|---|---|
| 1 | `rainy_return` | 비 오는 날 귀가 | rain · user_returned · pre_sleep_2h |
| 2 | `post_cooking` | 요리 직후 | cooking_done |
| 3 | `pre_sleep` | 취침 직전 | pre_sleep_30min |
| 4 | `guest_incoming` | 손님 방문 예정 | guest_arriving_2h |
| 5 | `morning_quick_clean` | 아침 외출 직후 빠른 청소 | user_left |
| 6 | `cooking_in_progress` | 요리 중 | cooking_active |
| 7 | `package_after_delivery` | 택배 도착 후 현관 정리 | package_delivery · user_returned |
| 8 | `after_meal_cleanup` | 식사 후 주방 정리 | meal_finished |

> 6개 시나리오가 5개 방을 모두 한 번씩 1위로 활용하도록 base/delta를 v2에서 재설계 — 같은 방이 상황에 따라 우선순위가 바뀌는 게 데모의 핵심.

---

## 7. 설명 생성 (Explanation Layer · LLM)

- **모델**: gpt-4o-mini (OpenAI SDK, Timely GPT bridge), 비스트리밍
- **프롬프트**: 점수표(공간별 final + breakdown)를 명시적 컨텍스트로 주입 → hallucination 억제
- **캐시**: 시나리오별 응답을 디스크 캐싱(`backend/cache/scenarios/*.json`, `seed_cache.py`로 재생성). 발표 중 LLM 장애 시 즉시 응답
- **fallback**: LLM 호출 실패 시 룰 기반 요약 메시지로 동작 계속
- **Q&A**: `POST /api/ask` — 점수표를 컨텍스트로 주입한 grounded Q&A(멘토 질의 대응) + general 모드

---

## 8. 클라이언트 & 데모

웹(`frontend/`)·모바일(`mobile/`) 두 클라이언트가 같은 백엔드/화면 구성을 공유한다.

### 8.1 웹 (Next.js 15) — 17 컴포넌트, 컨테이너 `Simulator.tsx`

- **`HouseMap`** — 5개 방 SVG(외벽 빈틈 없이) + 가구 힌트·사용자 아이콘·priority heatmap·제외 방 빗금. 로봇 이동 애니메이션(문 통과 경로 + 방 내부 원형 패턴, priority 순 방문, 점유 방 skip) + 먼지 파티클(점수 순위 기반, 청소 시 순차 제거·히트맵 연동)
- **입력** — `ScenarioPanel`(8 카드) / `CustomModePanel`(시각·취침·위치·이벤트 chip 직접 입력) / `TimelinePanel`(§8.3)
- **결과** — `PriorityList`(모드 뱃지 ○일반·◐저소음·⏱지연·✕제외) · `RoomDetail`(Need/Opportunity 두 박스 + 📖 `ScoringRulebook` 모달) · `ExplanationCard`("왜?" 토글로 breakdown)
- **보조** — `PipelinePanel`(6-Layer 순차 reveal) · `SensorDashboard`(12 센서 raw + inferred_events) · `AskPanel`(`/api/ask`)
- 안정성: `RequestSequencer`(응답 race 방지) · `fetchWithRetry`(5xx 재시도) · cold start 폴링 UI · 로딩 스켈레톤
- a11y: H1 단일 · SVG `role="img"`/`aria-label` · 색 대비 AA · inline SVG(차트 라이브러리 금지)

### 8.2 모바일 (Flutter 3) "로보틱"

Riverpod · Dio · go_router, 7 화면(splash·home·map·sensors·explain·ask + tab shell). 디자인 토큰(`lib/theme/tokens.dart`)은 웹(paper/ink/lg-red/gold)과 1:1 매핑. 같은 백엔드 공유. `flutter analyze` 0 issue.

### 8.3 24h 타임라인 재생

`TimelinePanel` + `useTimeline.ts` — 하루를 10개 키프레임(06:30~22:30)으로 재생. 센서→이벤트→점수→로봇 이동을 연동, 키프레임 사이 lerp 보간, 1×/2×/4× 배속·일시정지. 키프레임 응답은 정적 번들에서 prefetch.

---

## 9. 백엔드 API

FastAPI, 6 엔드포인트(`/api` prefix). 상세 계약은 [docs/TRD.md](./docs/TRD.md).

| 메서드 · 경로 | 역할 |
|---|---|
| `POST /api/simulate` | 메인 — scenario / custom / sensor_readings 3 경로, 두 축 RoomScore 반환 |
| `POST /api/infer-events` | 센서 readings → 룰 기반 이벤트 추론 (`InferRequest`→`InferResponse`) |
| `POST /api/ask` | LLM Q&A (점수표 grounded / general) |
| `GET /api/scenarios` | 시나리오 목록 |
| `GET /api/events` | 이벤트 목록 |
| `GET /api/health` | liveness + 도메인 로드 카운트 + `cold_start`·`llm_available` + ML 상태(`location_model_loaded`·`location_model_version`·`location_cv_accuracy`) |

검증 정책: 모든 외부 입력 Pydantic v2 검증(시각 `HH:MM`·위치 화이트리스트·ID 존재성·이벤트 ≤10·중복 금지).

---

## 10. 기술 스택

| 영역 | 스택 |
|---|---|
| 백엔드 | Python 3.12+ · FastAPI(async·OpenAPI) · Pydantic v2 · python-dotenv · pytest · venv+pip |
| LLM | OpenAI Python SDK(>=1.x, Timely bridge) · `gpt-4o-mini` 비스트리밍 |
| 웹 | Next.js 15(App Router·React 19) · TypeScript strict · Tailwind v4(`@theme`) · Pretendard/JetBrains Mono · inline SVG(차트 라이브러리 無) · pnpm |
| 모바일 | Flutter 3 · Riverpod · Dio · go_router |
| ML | numpy · scikit-learn · joblib — 사용자 위치 추정(v3, CASAS hh106 학습 RandomForest) |
| 배포 | Vercel(웹) · Render(백엔드, `render.yaml`) |

**비채택**: Streamlit(2D heatmap·인터랙션 한계) · DB(SQLite)·인증·WebSocket(MVP 범위 불필요).

---

## 11. 품질 · 테스트 전략

| 클라이언트 | 게이트 |
|---|---|
| 백엔드 | `pytest` 61개 통과 (8 시나리오 golden test + ML 위치추정 8종 + 추론 규칙). ruff clean |
| 웹 | `pnpm typecheck`(TS strict, `any` 금지) · a11y(H1 단일·AA·SVG aria) |
| 모바일 | `flutter analyze` 0 issue · `flutter test` |

- golden test가 결정론적 점수를 고정 (§5.4)
- LLM 응답 변경 후 `seed_cache.py` 재실행으로 캐시 동기화
- 정적 번들(웹)과 라이브 백엔드 출력 일치 유지 (axis·점수 정합성)

---

## 12. 배포 · 운영 아키텍처

- **프론트엔드(Vercel)** — GitHub `main` push 시 자동 재배포. **정적 JSON 번들(8 시나리오 + 10 키프레임 타임라인)을 내장**해 백엔드 없이도 핵심 데모가 동작
- **백엔드(Render, `render.yaml` Blueprint)** — `main` push 자동 재배포. 살아 있으면 `/api/ask`·실시간 custom simulate 추가 사용
- **cold start 대응** — Render 무료 tier cold start(~30초)는 ① 정적 번들로 데모 차단 방지 ② 발표 직전 warm-up 호출 ③ 프론트 폴링 UI로 완화
- **LLM 비용·장애** — 시나리오별 응답 디스크 캐싱(`seed_cache.py`)

라이브: 웹 `https://robot-cleaner.askewly.com/` (backup `https://cleaning-context.vercel.app/`) · 백엔드 `https://cleaning-context-backend.onrender.com/api/health`

---

## 13. 구현 현황

> 2026.05.29 (3주차, D-1) 기준. 웹·모바일·백엔드 모두 작동, 발표 준비(PPT·데모영상 백업)만 잔여.

- **백엔드** — 6 엔드포인트 작동, 두 축 스코어링, pytest 61 통과, LLM 캐시·fallback. 이벤트 추론은 룰 기반 + ML 위치 추정(v3) 구현
- **웹** — 17 컴포넌트, 로봇 애니메이션·먼지 파티클·24h 타임라인·파이프라인 reveal·두 박스 점수 분해·점수 설명서, 재시도·cold start UI, a11y AA. (구 `MethodologyCard`·5-Layer 표·다크모드 토글은 데모 UX 재설계로 제거)
- **모바일** — Flutter "로보틱" 7 화면, 웹 토큰 1:1, 같은 백엔드 공유
- **데이터·문서** — 5 방·14 이벤트·8 시나리오·12 센서·13 규칙 JSON 시드 + 설계 문서(`docs/`) + 운영 자료(ROADMAP·onboarding·Typst PDF)
- **ML** — 이벤트 추론은 룰 기반. **사용자 위치 추정(v3) 구현 완료** — CASAS hh106 학습 RandomForest(test 98.9%/CV 99.0%), `app/ml/`에 모델·feature·추정기, `infer`/`simulate`/`health` 배선, confidence fallback

---

## 14. 개발 일정 & 팀

### 14.1 단계별 마일스톤

| 주차 | 내용 | 상태 |
|---|---|---|
| **1주차 (5/13~19)** | 설계 문서 · Mock data · scoring rule · 백엔드+프론트 MVP · 배포 · Tier 1~3 폴리싱 | ✅ |
| **2주차 (5/20~26)** | 멘토 1차 피드백(사업/기술 분리·IoT 멀티센서·Privacy-on-Edge) · Flutter 모바일 · 백엔드 v2(`/api/infer-events`) · ML v3 전환 | ✅ |
| **3주차 (5/27~29)** | 두 축 산식 · 8 시나리오 · 24h 타임라인 · 정적 번들 분리 · 파이프라인/점수설명서 UI · **ML 위치추정 구현(CASAS hh106)** | ✅ 기술 구현 완료 |
| **최종 (5/30)** | 발표 — PPT·데모 영상 백업은 비기술 산출물로 별도 진행 | 발표일 |

### 14.2 팀 (기술 역할)

| 이름 | 전공 | 역할 |
|---|---|---|
| **전유성** (팀장) | 글로벌경영 | 총괄·기획·일정 / 백엔드(FastAPI)·LLM 통합 / 프론트·통합 / 발표 |
| **김준성** | 글로벌경영 | 시장·경쟁 조사 / 공개 IoT 데이터셋 분석·가중치 보정 / Mock dataset 설계 |
| **박주상** | 인공지능 | ML 사용자 위치 추정(scikit-learn, v3) 학습·평가 / LLM 프롬프트 / 추론 로직 |
| **조현서** | 글로벌경영 | 외부 증거(`docs/research/`) · 멘토 Q&A 10종(`DEMO_SCRIPT.md`) hand-off |

---

## 15. 성공 기준 (기술 KPI)

| 카테고리 | 지표 | 목표 |
|---|---|---|
| 기능 완성도 | 작동 시나리오 수 | 최소 4 (✅ 현재 8) |
| ML 성능 | 사용자 위치 추정 정확도(테스트셋, v3) | ≥ 75% (✅ 98.9% / 5-fold CV 99.0%, CASAS hh106) |
| 데이터 분석 | 공개 데이터셋 기반 가중치 보정 근거 | ≥ 1건 |
| 응답 속도 | 이벤트 입력 → AI 설명 출력 | ≤ 5초 (현재 ~3s) |
| 일관성 | 동일 입력 우선순위 일치 | 100% (Rule-based) |
| 설명 품질 | 출력에 점수 근거 포함 비율 | ≥ 95% |
| 데모 안정성 | 발표 중 시연 성공률 | 100% — 정적 번들로 백엔드 장애와 무관하게 동작(구현 완료) |
| 확장성 | 새 이벤트·센서 추가 시간 | ≤ 30분 (JSON만 수정) |

---

## 16. 기술 리스크 & 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 범위 과확장 (스마트홈 전체·타 가전 연동) | 미완성 | 주간 범위 점검, "청소 우선순위 시뮬레이터"에 안 맞으면 백로그 |
| Mock data 비현실성 지적 | 평가 하락 | MVP mock vs 실제품 데이터 슬라이드에서 명확히 분리 |
| LLM hallucination | 설명 신뢰도 ↓ | 점수표 명시 주입 + 출력 검증 + fallback |
| LLM API 비용·장애 | 발표 중 실패 | 시나리오별 캐싱 + 정적 번들 우선 |
| Render cold start | 데모 지연 | 정적 번들 독립 동작 + warm-up + 폴링 UI |
| ML 정확도(98.9%)가 과해 "그냥 룰/argmax 아니냐" 의심 | 신뢰성 의문 | 정직 프레이밍 — 단일 거주자 위치는 자기상관이 강해 본질적 고정확. ML 실효 가치는 **calibrated confidence**(§1.3 임계)와 **이질 센서 융합**. 실데이터(CASAS hh106) 근거 제시 |

> 사업 리스크(대기업 추격·OEM 품질·규제·이탈률)는 [BUSINESS_PLAN.md](./BUSINESS_PLAN.md) §10.
