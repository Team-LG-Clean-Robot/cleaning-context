# 청소 의사결정 알고리즘 설계

> 목적: 팀원이 같은 그림을 보고 구현·설명할 수 있도록, `ML 위치 추정 -> Rule 맥락 판별 -> Rule 점수 계산` 구조를 현재 프로젝트 기준으로 고정한다.

## 0. 한 줄 구조

```text
센서/외부 데이터
-> ML로 현재 사용자 위치 추정
-> 현재 위치 + 위치별 센서 + 외부 변수로 단기 맥락 판별
-> 방별 점수 계산
-> 언제, 어디를, 어떤 모드로 청소할지 결정
```

핵심 원칙은 세 가지다.

- ML은 `사용자 현재 위치(user_room)`만 추정한다.
- Rule base가 쓰는 변수는 모두 현재 시점에 관측 가능한 값만 사용한다.
- 최종 결정은 항상 방별 점수와 사유로 설명 가능해야 한다.

---

## 1. 1단계: ML 위치 추정

### 1.1 ML의 역할

ML의 역할은 오직 하나다.

- `지금 사용자가 어느 공간에 있는가?`

즉 ML 출력은 아래 두 개뿐이다.

- `user_room`: `entrance`, `living`, `kitchen`, `bedroom`, `bathroom`, `away`
- `location_confidence`: 해당 위치 예측의 신뢰도

`sleeping`, `cooking`, `recent_shower` 같은 생활 맥락은 ML이 아니라 2단계 rule에서 판별한다.

### 1.2 ML 입력 센서 집합

ML에는 위치를 직접 말해주는 센서만 넣는다.

| 센서 ID | 사용 이유 | 주 위치 |
|---|---|---|
| `motion_sensor` | 가장 직접적인 위치 단서 | 전 공간 |
| `door_lock` | 귀가/외출 및 현관 점유 단서 | entrance |
| `bed_sensor` | 침실 점유 단서 | bedroom |
| `tv` | 거실 점유 단서 | living |
| `humidity_bath` | 욕실 사용 단서 | bathroom |
| `induction` | 주방 점유 단서 | kitchen |
| `microwave` | 주방 점유 단서 | kitchen |
| `refrigerator` | 주방 점유 단서 | kitchen |
| `smart_speaker` | 보조 위치 단서 | living/bedroom |
| `air_conditioner` | 약한 보조 위치 단서 | living/bedroom 등 |

외부 데이터인 `weather_api`, `calendar`는 ML 입력에 넣지 않는다.  
이 둘은 위치가 아니라 맥락/우선순위 판단용 변수이므로 2단계부터 사용한다.

### 1.3 ML 출력 후 보정 규칙

ML 결과를 그대로 쓰지 않고 아래 보정을 둔다.

- `location_confidence >= 0.60`이면 `user_room = ML 결과`
- `location_confidence < 0.60`이면 최근 `motion_sensor` 방을 우선 사용
- 최근 모션도 없으면 `user_room = away` 또는 `unknown -> away fallback`

이 보정이 필요한 이유는, 최종 청소 판단이 불안정한 위치 추정 하나에 과하게 의존하지 않도록 하기 위해서다.

---

## 2. 2단계: Rule 맥락 판별

### 2.1 목표

2단계는 `사람이 지금 어디 있는지`와 `그 공간 주변 센서 상태`를 보고, 청소 판단에 필요한 단기 맥락을 만든다.

여기서 말하는 맥락은 장기 행동 예측이 아니라, 아래 같은 **운영용 단기 상태**다.

- 지금 당장 그 방을 청소하면 안 되는가
- 오염이 막 발생했는가
- 사용자가 곧 다른 방으로 이동해 현재 방이 비워질 가능성이 높은가
- 소음 제한이 필요한가

### 2.2 근미래 판단의 논리

이 단계는 `몇 시간 뒤 행동 예측`이 아니라 **현재 상태의 짧은 지속성**을 본다.

예시:

- `user_room == kitchen`이고 `induction == on`이면, 앞으로 10~20분은 주방 점유가 이어질 가능성이 높다.
- `induction`이 방금 꺼졌고 주방 모션이 줄면, 앞으로 5~15분 안에 주방이 비워질 가능성이 높다.
- `user_room == bedroom`이고 `bed_sensor.occupied == true`이면, 앞으로 20~30분은 침실을 피해야 할 가능성이 높다.
- 욕실 습도가 방금 급등했다면, 샤워 직후 상황이므로 욕실 바닥이 젖었을 가능성이 높다.

즉 이 단계는 “행동 전체를 예측”하는 것이 아니라:

```text
현재 상태 -> 매우 가까운 미래의 점유/오염/소음 제약을 추정
```

으로 보는 것이 맞다.

### 2.3 Rule base 입력 변수

Rule base가 쓰는 변수는 세 그룹뿐이다.

#### A. 외부 변수

- `is_raining`
- `guest_eta_minutes`
- `current_time`
- `weekday`
- `time_to_sleep_minutes`

#### B. ML 출력 변수

- `user_room`
- `location_confidence`

#### C. 현재 센서 상태

- `door_unlocked_recent`
- `door_locked_recent`
- `stove_on`
- `stove_turned_off_recent`
- `microwave_on`
- `fridge_open_count_30m`
- `tv_on`
- `bed_occupied`
- `bathroom_humidity_spike`
- `motion_recent(room)`

### 2.4 위치별 Rule 입력 센서 집합

ML이 예측한 `user_room`에 따라, 해당 공간과 인접 맥락 판별에 필요한 센서만 Rule base에 강하게 넘긴다.

| ML 예측 위치 | Rule base 핵심 센서 집합 | 주 용도 |
|---|---|---|
| `entrance` | `door_lock`, `motion_sensor(entrance)`, `weather_api` | 귀가/외출, 비 오는 날 현관 오염 |
| `living` | `tv`, `motion_sensor(living)`, `smart_speaker(living)`, `calendar`, `weather_api` | 거실 점유, 휴식, 손님 맥락 |
| `kitchen` | `induction`, `microwave`, `refrigerator`, `motion_sensor(kitchen)` | 요리 중, 요리 직후, 식사 준비 |
| `bedroom` | `bed_sensor`, `motion_sensor(bedroom)`, `smart_speaker(bedroom)`, `air_conditioner(room=bedroom)` | 취침/취침 직전, 침실 점유 |
| `bathroom` | `humidity_bath`, `motion_sensor(bathroom)` | 샤워 직후, 욕실 점유 |
| `away` | `door_lock`, `calendar`, `weather_api` | 외출 상태, 무인 청소 가능 |

### 2.5 맥락 변수 정의

최종적으로 Rule base는 아래 맥락 변수만 생성하면 충분하다.

- `is_recent_return_home`
- `is_home_empty`
- `is_cooking_active`
- `is_post_cooking`
- `is_sleeping_or_pre_sleep`
- `is_recent_shower`
- `is_relaxing_in_living`
- `is_recent_guest_mode`

### 2.6 맥락 판별 규칙

| 맥락 변수 | 조건 | 의미 |
|---|---|---|
| `is_recent_return_home` | `user_room == entrance` and `door_unlocked_recent` | 방금 귀가했다 |
| `is_home_empty` | `user_room == away` and `door_locked_recent` | 집이 비었다 |
| `is_cooking_active` | `user_room == kitchen` and (`stove_on` or `microwave_on`) | 당장 요리 중이다 |
| `is_post_cooking` | `stove_turned_off_recent` and `fridge_open_count_30m >= 2` | 방금 요리를 마쳤다 |
| `is_sleeping_or_pre_sleep` | `user_room == bedroom` and `bed_occupied` and `time_to_sleep_minutes <= 30` | 취침 중이거나 곧 취침한다 |
| `is_recent_shower` | `user_room == bathroom` and `bathroom_humidity_spike` | 샤워 직후다 |
| `is_relaxing_in_living` | `user_room == living` and `tv_on` | 거실에서 쉬는 중이다 |
| `is_recent_guest_mode` | `guest_eta_minutes <= 120` | 손님 방문 준비가 필요하다 |

---

## 3. 3단계: 방별 점수 계산

이 단계의 목적은 단순히 점수를 계산하는 것이 아니라, **최종 청소 결과를 사람이 바로 이해할 수 있는 형태로 출력**하는 것이다.

즉 Rule base는 아래를 최종 출력한다.

- 현재 사용자 위치
- 추론된 상황 맥락
- 각 공간별 점수
- 청소 순서 결과
- 각 공간의 `mode`
- 설명 문장

예시:

- 결과: `kitchen first, living second, bedroom delayed`
- 공간별 점수: `kitchen 50, living 25, entrance 30, bedroom -5, bathroom 10`
- 설명: `요리 직후라 주방 오염 가능성이 높아 주방을 우선 청소합니다.`

### 3.1 현재 프로젝트의 공간 집합

현재 프로젝트의 실제 청소 대상 공간은 `rooms.json` 기준 아래 다섯 개다.

| room_id | name_ko | base_score | noise_sensitivity |
|---|---|---:|---:|
| `entrance` | 현관 | 30 | 2 |
| `living` | 거실 | 25 | 5 |
| `kitchen` | 주방 | 20 | 4 |
| `bedroom` | 침실 | 15 | 9 |
| `bathroom` | 욕실 | 10 | 3 |

### 3.2 최종 점수식

방별 최종 점수는 아래처럼 계산한다.

```text
final_score(room)
= base_score(room)
+ context_bonus(room)
+ external_bonus(room)
- occupancy_penalty(room)
- sleep_penalty(room)
- safety_penalty(room)
```

### 3.3 방별 가감점 규칙

#### A. 현관

- `is_recent_return_home` -> `+15`
- `is_recent_return_home and is_raining` -> 추가 `+15`
- `user_room == entrance` -> `-20` and `mode = delayed`

#### B. 거실

- `is_recent_return_home` -> `+10`
- `is_recent_guest_mode` -> `+25`
- `is_relaxing_in_living` -> `-15`
- `user_room == living` -> `-20` and `mode = delayed`

#### C. 주방

- `is_post_cooking` -> `+30`
- `fridge_open_count_30m >= 4` -> `+10`
- `is_cooking_active` -> `-25` and `mode = delayed`
- `user_room == kitchen` -> `-20` and `mode = delayed`

#### D. 침실

- `is_sleeping_or_pre_sleep` -> `-40` and `mode = excluded or quiet`
- `user_room == bedroom` -> `-20` and `mode = delayed`

#### E. 욕실

- `is_recent_shower` -> `+15`
- `is_recent_guest_mode` -> `+10`
- `user_room == bathroom` -> `-15` and `mode = delayed`

#### F. 집이 비었을 때 공통 가점

- `is_home_empty` -> 전 방 `+5`

### 3.4 모드 결정 규칙

여기서 `mode`는 **그 공간을 지금 어떤 방식으로 처리해야 하는지**를 나타내는 실행 상태다.

| mode | 의미 |
|---|---|
| `normal` | 지금 바로 일반 청소 가능 |
| `quiet` | 청소는 가능하지만 저소음 모드 필요 |
| `delayed` | 우선순위는 있지만 현재 점유 등으로 잠시 지연 |
| `excluded` | 이번 턴에서는 청소 대상에서 제외 |

| 조건 | mode |
|---|---|
| `final_score <= 0` | `excluded` |
| 현재 점유 중인 방 | `delayed` |
| `is_sleeping_or_pre_sleep` and `noise_sensitivity >= 7` | `quiet` 또는 `excluded` |
| 그 외 | `normal` |

---

## 4. 최종 출력 형식

알고리즘 최종 결과에는 방별 점수가 반드시 포함된다.

```json
{
  "user_room": "kitchen",
  "location_confidence": 0.81,
  "contexts": {
    "is_cooking_active": false,
    "is_post_cooking": true,
    "is_recent_return_home": false,
    "is_sleeping_or_pre_sleep": false,
    "is_recent_shower": false,
    "is_recent_guest_mode": false,
    "is_home_empty": false
  },
  "room_scores": {
    "entrance": {"base": 30, "delta": 0, "final": 30, "mode": "normal"},
    "living": {"base": 25, "delta": 0, "final": 25, "mode": "normal"},
    "kitchen": {"base": 20, "delta": 30, "final": 50, "mode": "normal"},
    "bedroom": {"base": 15, "delta": 0, "final": 15, "mode": "normal"},
    "bathroom": {"base": 10, "delta": 0, "final": 10, "mode": "normal"}
  },
  "cleaning_order": ["kitchen", "entrance", "living", "bedroom", "bathroom"]
}
```

이 `room_scores`가 있어야 팀원이 숫자로도 결과를 이해할 수 있고, 설명 카드에도 바로 활용할 수 있다.

설명 문장은 아래 구조로 생성하는 것을 기본 원칙으로 한다.

- 왜 이 공간이 1순위가 되었는가
- 왜 어떤 공간은 지연되었는가
- 왜 어떤 공간은 제외되었는가

예시:

- 결과: `kitchen first, living second, bedroom delayed`
- 설명: `요리 직후라 주방 오염 가능성이 높아 주방을 우선 청소합니다. 침실은 현재 사용 가능성이 높아 지연합니다.`

---

## 5. 대표 예시 결과

### 예시 1. 비 오는 날 귀가 직후

조건:

- `user_room = entrance`
- `location_confidence = 0.88`
- `door_unlocked_recent = true`
- `is_raining = true`

맥락:

- `is_recent_return_home = true`

결과:

- `entrance delayed, living first, kitchen second, bedroom third, bathroom fourth`

방별 점수:

| 공간 | base | 규칙 | final | mode |
|---|---:|---|---:|---|
| 현관 | 30 | `+15 귀가`, `+15 비`, `-20 현재 점유` | 40 | delayed |
| 거실 | 25 | `+10 귀가` | 35 | normal |
| 주방 | 20 | 없음 | 20 | normal |
| 침실 | 15 | 없음 | 15 | normal |
| 욕실 | 10 | 없음 | 10 | normal |

설명:

- `비 오는 날 귀가 직후라 현관 오염 가능성이 가장 높습니다. 다만 현재 현관이 점유 중이므로 즉시 청소는 지연하고, 사용자가 이동한 뒤 현관을 우선 청소합니다.`

### 예시 2. 요리 직후

조건:

- `user_room = kitchen`
- `location_confidence = 0.82`
- `stove_turned_off_recent = true`
- `fridge_open_count_30m = 5`

맥락:

- `is_post_cooking = true`

결과:

- `kitchen delayed, entrance first, living second, bedroom third, bathroom fourth`

방별 점수:

| 공간 | base | 규칙 | final | mode |
|---|---:|---|---:|---|
| 현관 | 30 | 없음 | 30 | normal |
| 거실 | 25 | 없음 | 25 | normal |
| 주방 | 20 | `+30 요리 직후`, `+10 냉장고 개폐`, `-20 현재 점유` | 40 | delayed |
| 침실 | 15 | 없음 | 15 | normal |
| 욕실 | 10 | 없음 | 10 | normal |

설명:

- `요리 직후라 주방 오염 가능성이 가장 높습니다. 다만 현재 주방이 점유 중이므로 즉시 청소는 지연하고, 사용자가 이동하면 주방을 최우선으로 청소합니다.`

---

## 부록 A. 전체 센서 집합

| 센서 ID | 위치 | 분류 | 주요 사용 단계 |
|---|---|---|---|
| `door_lock` | entrance | 출입 | ML + Rule |
| `induction` | kitchen | 조리 | ML 보조 + Rule |
| `microwave` | kitchen | 조리 | ML 보조 + Rule |
| `refrigerator` | kitchen | 조리/식사 | ML 보조 + Rule |
| `air_conditioner` | room별 | 보조 점유 | ML 약한 보조 |
| `tv` | living | 거실 점유 | ML + Rule |
| `bed_sensor` | bedroom | 취침/침실 점유 | ML + Rule |
| `motion_sensor` | room별 | 위치 | ML + Rule |
| `humidity_bath` | bathroom | 샤워/욕실 상태 | ML 보조 + Rule |
| `smart_speaker` | room별 | 보조 점유 | ML 보조 |
| `weather_api` | external | 외부 맥락 | Rule |
| `calendar` | external | 외부 맥락 | Rule |

---

## 부록 B. 위치별 Rule base 센서 번들

### `entrance`

- `door_lock`
- `motion_sensor(entrance)`
- `weather_api`

판별용 질문:

- 방금 귀가했는가
- 비 때문에 현관 오염 가능성이 높은가
- 지금 현관이 점유 중인가

### `living`

- `tv`
- `motion_sensor(living)`
- `smart_speaker(living)`
- `calendar`

판별용 질문:

- 거실에서 휴식 중인가
- 손님 맞이 준비가 필요한가
- 지금 거실을 피해야 하는가

### `kitchen`

- `induction`
- `microwave`
- `refrigerator`
- `motion_sensor(kitchen)`

판별용 질문:

- 요리 중인가
- 방금 요리를 끝냈는가
- 주방 오염도가 막 증가했는가

### `bedroom`

- `bed_sensor`
- `motion_sensor(bedroom)`
- `smart_speaker(bedroom)`
- `air_conditioner(room=bedroom)`

판별용 질문:

- 취침 중이거나 취침 직전인가
- 침실은 지금 청소 금지인가

### `bathroom`

- `humidity_bath`
- `motion_sensor(bathroom)`

판별용 질문:

- 샤워 직후인가
- 욕실 바닥이 젖어 있거나 점유 중인가

---

## 부록 C. 계산 절차 의사코드

```text
1. user_room = ML(sensor_bundle_for_location)
2. if ML confidence low:
     user_room = latest_motion_room fallback

3. contexts = {}
4. contexts.is_recent_return_home = (user_room == entrance and door_unlocked_recent)
5. contexts.is_home_empty = (user_room == away and door_locked_recent)
6. contexts.is_cooking_active = (user_room == kitchen and (stove_on or microwave_on))
7. contexts.is_post_cooking = (stove_turned_off_recent and fridge_open_count_30m >= 2)
8. contexts.is_sleeping_or_pre_sleep = (user_room == bedroom and bed_occupied and time_to_sleep_minutes <= 30)
9. contexts.is_recent_shower = (user_room == bathroom and bathroom_humidity_spike)
10. contexts.is_relaxing_in_living = (user_room == living and tv_on)
11. contexts.is_recent_guest_mode = (guest_eta_minutes <= 120)

12. for each room in [entrance, living, kitchen, bedroom, bathroom]:
      score = base_score(room)
      apply room-specific bonuses
      apply occupancy/sleep/safety penalties
      decide mode

13. sort rooms by final_score desc
14. output user_room, contexts, room_scores, cleaning_order
```

---

## 결론

이 설계의 핵심은 아래 한 문장으로 요약된다.

> ML은 위치만 추정하고, Rule base는 현재 관측 가능한 센서와 외부 데이터를 조합해 단기 맥락을 판별한 뒤, 방별 점수로 청소 우선순위를 결정한다.
