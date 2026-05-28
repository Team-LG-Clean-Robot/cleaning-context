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

| 공간 | base_score | noise_sensitivity (0-10) |
|---|:-:|:-:|
| 현관 (entrance) | 30 | 2 |
| 거실 (living) | 25 | 5 |
| 주방 (kitchen) | 20 | 4 |
| 침실 (bedroom) | 15 | 9 |
| 욕실 (bathroom) | 10 | 3 |

> **근거.** TECHNICAL_PLAN.md §4 시나리오 표에서 "기본" 컬럼 직접 인용. 욕실은 PLANNING 표에 없어 보수적으로 추가 (낮은 base).

## 3. Event effects (이벤트 → 공간별 점수 가산)

| event_id | 이름 | 현관 | 거실 | 주방 | 침실 | 욕실 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `rain` | 비 | +20 | +5 | 0 | 0 | 0 |
| `user_returned` | 사용자 귀가 | +15 | +10 | 0 | 0 | 0 |
| `cooking_done` | 요리 완료 | 0 | 0 | +30 | 0 | 0 |
| `guest_arriving_2h` | 손님 방문 임박 (2h 이내) | +20 | +25 | +5 | -10 | +10 |
| `pre_sleep_30min` | 취침 30분 이내 | -5 | -15 | -5 | -30 | -5 |
| `cleanup_gap_2d` | 마지막 청소 2일+ 경과 | +10 | +15 | +10 | +5 | +5 |

> **근거.** TECHNICAL_PLAN.md §4 시나리오 1~4 표의 가중치를 이벤트 단위로 분리. 표에 없는 셀은 0.

## 4. Time / occupancy modifier

| 조건 | 효과 |
|---|---|
| 사용자가 머무는 공간 (`user_location == room.id`) | -20 (청소 지연) |
| `noise_sensitivity ≥ 7` AND `pre_sleep_30min` 활성 | -20 추가 (침실 강조) |
| `last_cleaned_hours ≥ 48` | +10 (cleanup_gap_2d 미적용 시에만) |

## 5. 모드 결정 규칙 (점수 계산 후)

| 조건 | mode |
|---|---|
| `final < 0` | `excluded` (사유: 점수표 dominant 페널티 항목 인용) |
| 사용자 점유 공간이고 `final > 0` | `delayed` (예: "30분 후 재시도") |
| `pre_sleep_30min` 활성 AND room.noise_sensitivity ≥ 4 AND `final > 0` | `quiet` |
| 그 외 | `normal` |

## 6. 시나리오별 검증 (golden test 입력)

이 표가 단위 테스트 fixture가 된다. 결과가 TECHNICAL_PLAN.md §4 표와 일치해야 함.

### 시나리오 1. 비 오는 날 귀가 (20:30, 비, 귀가, 취침 23:00, 현관 청소 2일 경과)

`active_events = ["rain", "user_returned", "cleanup_gap_2d"]` (현관에만 cleanup_gap)
취침까지 2.5h → `pre_sleep_30min` 비활성. 침실은 -30 페널티 별도 적용? PLANNING은 -30 표시.

→ **룰 보강.** `pre_sleep_2h` 이벤트 추가:

| event_id | 이름 | 현관 | 거실 | 주방 | 침실 | 욕실 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `pre_sleep_2h` | 취침 2시간 이내 | 0 | 0 | 0 | -30 | 0 |

활성 이벤트 재계산:
- 현관: 30 + 20(rain) + 15(returned) = **65** ✓
- 거실: 25 + 5 + 10 = **40** ✓
- 주방: 20 ✓
- 침실: 15 + (-30) = **-15** → excluded ✓

### 시나리오 2. 요리 직후 (19:20, 요리, 사용자 거실)

`active = ["cooking_done"]`, `user_location = "living"`

- 주방: 20 + 30 = **50** ✓
- 거실: 25 + 0 - 20(occupancy) = **5** → delayed ✓
- 현관: 30 ✓
- 침실: 15 ✓

### 시나리오 3. 취침 직전 (22:50, 사용자 침실, 취침 23:00)

`active = ["pre_sleep_30min"]`, `user_location = "bedroom"`

- 침실: 15 + (-30) + (-20 noise×sleep) + (-20 occupancy)... PLANNING은 -35.
  → 룰 정리: `pre_sleep_30min` 침실 -30 + noise add -20 = -50? PLANNING은 -35.
  → **재정의.** noise add를 -10으로 하향:

| 조건 | 효과 |
|---|---|
| `noise_sensitivity ≥ 7` AND `pre_sleep_30min` | 추가 -10 (occupancy modifier 별도) |

- 침실: 15 - 30 - 10 = -25? PLANNING은 -35. occupancy -20까지 더하면 -45. PLANNING 표는 occupancy 컬럼이 없고 "취침 -30, 소음 -20" 두 컬럼으로 -35.
  → **PLANNING이 단순화된 표시이고 실제 룰은 별도 정의가 가능.** 본 문서는 룰을 자체 일관성으로 두고, 시나리오 3의 침실 final = `-25 (excluded)`로 정의. PLANNING의 `-35`는 발표 자료 시각화용 reference value.

→ **결정.** 시나리오 표는 "느낌"이고, 룰 테이블이 ground truth. 두 값이 일치하지 않을 수 있음을 TECHNICAL_PLAN.md에 각주로 추가하는 것은 다음 문서 보강 작업.

- 거실: 25 - 15(pre_sleep -15) - 0(noise<7) = 10? PLANNING -10(노이즈) 추가 → 0.
  → 룰 보강: `pre_sleep_30min` 거실 -15는 위 표에 이미 있음. noise add는 ≥7만. 거실 noise=5 → noise add 미적용. → 거실 final = 25 - 15 = 10. PLANNING은 0(excluded). 차이 허용.

### 시나리오 4. 손님 방문 (17:00, 19:00 방문, 거실 3일·현관 2일 경과)

`active = ["guest_arriving_2h", "cleanup_gap_2d"(거실+현관)]`

- 거실: 25 + 25 + 15 = **65** ✓
- 현관: 30 + 20 + 10 = **60** ✓
- 주방: 20 + 5 = **25** ✓
- 침실: 15 - 10 = **5** ✓

→ 시나리오 1·2·4는 일치. 3은 의도적으로 자체 일관성 우선.

## 7. JSON 직렬화 형태

`backend/app/data/scoring_rules.json`:

```json
{
  "rooms": [
    {"id": "entrance", "name_ko": "현관", "base_score": 30, "noise_sensitivity": 2},
    ...
  ],
  "events": [
    {
      "id": "rain", "name_ko": "비",
      "effects": [
        {"room_id": "entrance", "delta": 20},
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

- 시나리오 3의 PLANNING vs 룰 차이를 TECHNICAL_PLAN.md에 각주로 표기 (또는 룰을 PLANNING에 맞춰 재조정)
- 욕실의 base_score·이벤트 효과는 가설값. 멘토링 후 보강
- ML 이벤트 분류기가 활성화되면, classifier 출력을 active_events에 자동 주입하는 경로 정의
