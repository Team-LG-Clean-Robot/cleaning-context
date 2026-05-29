# Scoring Rules — Decision Layer 명세

> 룰은 코드에 박지 않고 `backend/app/data/scoring_rules.json` + `events.json` + `rooms.json`을 그대로 읽어 적용 (하드코딩 금지).
>
> **상위 layer (Sensor → Behavioral)**: IoT 센서 raw 시그널이 어떻게 active_events로 변환되는지는 [IOT_DOMAIN.md](./IOT_DOMAIN.md). 본 scoring은 Behavioral Layer 출력(events)을 입력으로 받음.

## 1. 두 축 산식 (Need × Opportunity)

각 contribution은 **Need(얼마나 더러운가)** 또는 **Opportunity(지금 청소해도 되는가)** 둘 중 하나로 분류된다. 최종 점수는 둘의 합.

```
final_score(room) = need_score(room) + opportunity_score(room)

need_score(room)        ← 더러움 누적 신호
  = base_score                    ← 방 자체의 기본 청소 가치
  + Σ dirt_event.delta            ← rain, cooking_done, user_returned, recent_shower, …
  + cleanup_gap_delta             ← 마지막 청소 후 경과 (Δt × dirt_rate 의 단순화)

opportunity_score(room) ← 청소 적합 시점 신호
  + calendar_pull                 ← guest_arriving_2h (양수 — 손님 전 정리 invitation)
  − pre_sleep_penalty             ← 취침 30분/2h 이내 (음수)
  − user_occupancy_penalty        ← 사용자가 그 방에 있음 (-20)
  − noise_sleep_extra_penalty     ← 소음 민감 방 + 취침 임박 (-10)
  + ml_location_pull              ← ML이 추정한 사용자 동선의 인접 방 (양수, ambient 시간대 효과)
```

`final_score < 0` → 청소에서 제외(`excluded`).
`final_score ≥ 0` 이고 사용자 점유 → `delayed` (재시도).
`final_score ≥ 0` 이고 취침 임박 + 소음 민감 → `quiet`.
그 외 → `normal`.

## 2. 어느 입력이 어느 축에 가는가

| 입력 소스 | 변환된 event | 들어가는 축 |
|---|---|:-:|
| 인덕션 ON→OFF | `cooking_done` | **Need** (주방 더러워짐) |
| 도어락 외부→안 | `user_returned` | **Need** (현관 더러워짐) |
| 욕실 습도 급증 | `recent_shower` | **Need** (욕실 더러워짐) |
| 날씨 API rain | `rain` | **Need** (현관·거실 오염도 증가) |
| 모션 + 침대 점유 | `pre_sleep_30min` | **Opportunity** (소음 페널티) |
| 캘린더 손님 2h 전 | `guest_arriving_2h` | **Opportunity** (사전 정리 invitation) |
| ML 위치 추정 | `user_at_<room>` | **Opportunity** (그 방 청소 지연) |

> 핵심: **IoT 센서 이벤트 대다수가 Need 측에 들어가고, 캘린더·시간·사용자 위치는 Opportunity 측에 들어간다.** 두 축이 시각·논리적으로 분리되므로 발표 슬라이드에서 박스 둘로 그리면 청중이 한눈에 이해.

## 3. (역사용) 단일 공식 표현

위 두 축을 펼친 단일 식 — 코드 구현은 이 형태:

```
final_score(room) = base_score(room)
                   + Σ event_delta(event, room) for event in active_events
                   + time_modifier(room, current_time)
                   + occupancy_modifier(room, user_location)
```

`scoring.py`는 각 contribution을 emit할 때 `axis: "need" | "opportunity"` 필드를 부여한다 (`_EVENT_AXIS` 매핑 + 특수 케이스).

## 2. Base score (공간별 기본 우선순위)

> ⚠️ **v2 재설계 반영 (현행값).** 아래 표는 `backend/app/data/rooms.json`의 런타임 ground truth와 일치한다. 이전 v1 값(현관30·거실25·주방20·침실15·욕실10)은 폐기. 단 §3 event delta 표와 §6 worked example은 **아직 v1 수치라 일부 어긋날 수 있음** — 항상 `backend/app/data/*.json`이 단일 진실.

| 공간 | base_score | noise_sensitivity (0-10) |
|---|:-:|:-:|
| 현관 (entrance) | 22 | 2 |
| 거실 (living) | 20 | 5 |
| 주방 (kitchen) | 28 | 4 |
| 침실 (bedroom) | 12 | 9 |
| 욕실 (bathroom) | 18 | 3 |

> **근거.** v2에서 ML feature-importance 기반으로 재조정 (6개 시나리오가 5개 방을 골고루 1위로 활용하도록 설계). 정밀 측정이 아닌 가설값이며 멘토링 후 보강 예정.

## 3. Event effects (이벤트 → 공간별 점수 가산)

> 현행값 (`backend/app/data/events.json`). 8개 데모 시나리오에 쓰이는 이벤트만 발췌 — 전체 14종은 events.json 참조. axis는 모두 **Need** (dirt accumulation), 단 취침·점유는 §4 modifier에서 Opportunity로 처리.

| event_id | 이름 | 현관 | 거실 | 주방 | 침실 | 욕실 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `rain` | 비 | +25 | +5 | 0 | 0 | 0 |
| `user_returned` | 사용자 귀가 | +15 | +5 | 0 | 0 | 0 |
| `cooking_done` | 요리 완료 | 0 | +5 | +35 | 0 | 0 |
| `cooking_active` | 요리 진행 중 | +5 | +15 | -40 | +5 | +5 |
| `guest_arriving_2h` | 손님 방문 임박 | +15 | +30 | +10 | -5 | +15 |
| `pre_sleep_2h` | 취침 2시간 이내 | 0 | +5 | 0 | -20 | 0 |
| `pre_sleep_30min` | 취침 30분 이내 | 0 | +5 | 0 | -40 | +15 |
| `user_left` | 사용자 외출 중 | +5 | +5 | +5 | +25 | +5 |
| `package_delivery` | 택배 도착 | +35 | +10 | 0 | 0 | 0 |
| `meal_finished` | 식사 종료 추정 | 0 | +15 | +35 | 0 | 0 |

## 4. Modifier (점수 계산 후 가산 — `scoring_rules.json`)

| 조건 | 효과 | axis |
|---|---|---|
| 사용자가 머무는 공간 (`user_location == room.id`) | -20 | opportunity |
| `noise_sensitivity ≥ 7` AND `pre_sleep_30min` 활성 | -10 추가 | opportunity |

> `rooms.json`의 `last_cleaned_hours`는 현재 엔진 미사용 (프론트 enrich `cleanup_recency`로 시도했다가 제거 — 정적/라이브 일치 위해).

## 5. 모드 결정 규칙 (점수 계산 후)

| 조건 | mode |
|---|---|
| `final < 0` | `excluded` (사유: 점수표 dominant 페널티 항목 인용) |
| 사용자 점유 공간이고 `final > 0` | `delayed` ("30분 후 재시도") |
| `pre_sleep_30min` 활성 AND room.noise_sensitivity ≥ 4 AND `final > 0` | `quiet` |
| 그 외 | `normal` |

> 로봇 청소 큐는 `excluded`·`delayed`를 제외하고 `final` 내림차순으로 방문한다 (점수가 높아도 사용자 점유 방은 건너뜀).

## 6. 시나리오별 검증 (golden test fixture)

`test_scoring.py`의 `EXPECTED_SCORES`와 1:1 일치. base(§2) + event(§3) + modifier(§4) 합산.

### 1. 비 오는 날 귀가 — 20:30, 취침 23:00, 사용자 거실
`rain · user_returned · pre_sleep_2h`, `user_location=living`
- 현관: 22 + 25 + 15 = **62** (normal)
- 주방: 28 = **28** (normal) · 욕실: 18 = **18** (normal)
- 거실: 20 + 5 + 5 + 5 − 20(점유) = **15** (delayed)
- 침실: 12 − 20 = **−8** (excluded)

### 2. 요리 직후 — 19:20, 사용자 거실
`cooking_done`, `user_location=living`
- 주방: 28 + 35 = **63** (normal) · 현관 22 · 욕실 18 · 침실 12 (normal)
- 거실: 20 + 5 − 20(점유) = **5** (delayed)

### 3. 손님 방문 예정 — 17:00
`guest_arriving_2h`
- 거실 20+30=**50** · 주방 28+10=**38** · 현관 22+15=**37** · 욕실 18+15=**33** · 침실 12−5=**7** (모두 normal)

### 4. 아침 외출 직후 — 07:00
`user_left`
- 침실 12+25=**37** · 주방 28+5=**33** · 현관 22+5=**27** · 거실 20+5=**25** · 욕실 18+5=**23** (모두 normal)

### 5. 요리 중 — 19:00, 사용자 주방
`cooking_active`, `user_location=kitchen`
- 거실 20+15=**35** · 현관 22+5=**27** · 욕실 18+5=**23** · 침실 12+5=**17** (normal)
- 주방: 28 − 40 − 20(점유) = **−32** (excluded)

### 6. 취침 직전 — 22:50, 사용자 침실 (모드 검증 `test_pre_sleep_modes`)
`pre_sleep_30min`, `user_location=bedroom`
- 욕실: 18 + 15 = 33 (noise 3 < 4 → **normal**)
- 주방: 28 (noise 4 ≥ 4 → **quiet**) · 거실: 20 + 5 = 25 (noise 5 → **quiet**)
- 현관: 22 (**normal**)
- 침실: 12 − 40 − 20(점유) − 10(소음×취침) = **−58** (excluded)

> 6개 시나리오가 5개 방을 모두 한 번씩 1위로 활용하도록 base/delta를 v2에서 재설계.

## 7. JSON 직렬화 형태

`backend/app/data/scoring_rules.json`:

```json
{
  "rooms": [
    {"id": "entrance", "name_ko": "현관", "base_score": 22, "noise_sensitivity": 2},
    {"id": "kitchen",  "name_ko": "주방", "base_score": 28, "noise_sensitivity": 4},
    {"id": "living",   "name_ko": "거실", "base_score": 20, "noise_sensitivity": 5},
    {"id": "bathroom", "name_ko": "욕실", "base_score": 18, "noise_sensitivity": 3},
    {"id": "bedroom",  "name_ko": "침실", "base_score": 12, "noise_sensitivity": 9}
  ],
  "events": [
    {
      "id": "rain", "name_ko": "비",
      "effects": [
        {"room_id": "entrance", "delta": 25},
        {"room_id": "living", "delta": 5}
      ]
    },
    ...
  ],
  "modifiers": {
    "user_occupancy_delta": -20,
    "noise_sleep_extra_delta": -10,
    "noise_sleep_threshold": 7,
    "exclusion_threshold": 0
  }
}
```

## 8. 추가 작업 필요

- base_score·이벤트 delta는 v2 가설값. 멘토링 후 실데이터로 보강
- `last_cleaned_hours` 기반 cleanup 가산을 정식 룰로 도입할지 검토 (현재 미사용)
- ML 이벤트 분류기가 활성화되면, classifier 출력을 active_events에 자동 주입하는 경로 정의
