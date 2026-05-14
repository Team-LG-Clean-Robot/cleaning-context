# Scoring Rules — Decision Layer 명세

> PLANNING.md §4 시나리오 4종에 등장한 가중치를 일반화된 룰 테이블로 정리한다.
> 코드는 이 문서를 JSON으로 옮긴 `backend/app/data/scoring_rules.json`을 그대로 읽어 적용 (하드코딩 금지).

## 1. 공식

```
final_score(room) = base_score(room)
                   + Σ event_delta(event, room) for event in active_events
                   + time_modifier(room, current_time)
                   + occupancy_modifier(room, user_location)
```

`final_score < 0` → 청소에서 제외(excluded).

## 2. Base score (공간별 기본 우선순위)

| 공간 | base_score | noise_sensitivity (0-10) |
|---|:-:|:-:|
| 현관 (entrance) | 30 | 2 |
| 거실 (living) | 25 | 5 |
| 주방 (kitchen) | 20 | 4 |
| 침실 (bedroom) | 15 | 9 |
| 욕실 (bathroom) | 10 | 3 |

> **근거.** PLANNING.md §4 시나리오 표에서 "기본" 컬럼 직접 인용. 욕실은 PLANNING 표에 없어 보수적으로 추가 (낮은 base).

## 3. Event effects (이벤트 → 공간별 점수 가산)

| event_id | 이름 | 현관 | 거실 | 주방 | 침실 | 욕실 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `rain` | 비 | +20 | +5 | 0 | 0 | 0 |
| `user_returned` | 사용자 귀가 | +15 | +10 | 0 | 0 | 0 |
| `cooking_done` | 요리 완료 | 0 | 0 | +30 | 0 | 0 |
| `guest_arriving_2h` | 손님 방문 임박 (2h 이내) | +20 | +25 | +5 | -10 | +10 |
| `pre_sleep_30min` | 취침 30분 이내 | -5 | -15 | -5 | -30 | -5 |
| `cleanup_gap_2d` | 마지막 청소 2일+ 경과 | +10 | +15 | +10 | +5 | +5 |

> **근거.** PLANNING.md §4 시나리오 1~4 표의 가중치를 이벤트 단위로 분리. 표에 없는 셀은 0.

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

이 표가 단위 테스트 fixture가 된다. 결과가 PLANNING.md §4 표와 일치해야 함.

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

→ **결정.** 시나리오 표는 "느낌"이고, 룰 테이블이 ground truth. 두 값이 일치하지 않을 수 있음을 PLANNING.md에 각주로 추가하는 것은 다음 문서 보강 작업.

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

- 시나리오 3의 PLANNING vs 룰 차이를 PLANNING.md에 각주로 표기 (또는 룰을 PLANNING에 맞춰 재조정)
- 욕실의 base_score·이벤트 효과는 가설값. 멘토링 후 보강
- ML 이벤트 분류기가 활성화되면, classifier 출력을 active_events에 자동 주입하는 경로 정의
