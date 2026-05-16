# IoT 멀티센서 도메인 설계

> 멘토 피드백 (2026-05-16): "사용자가 명시적으로 입력하는 7개 이벤트만으로는 부족하다. 도어락·주방기기·냉장고·에어컨 등 이미 집 안에 있는 IoT 센서로 상황을 추론해야 한다. 개인정보 보안도 함께 고려할 것."
>
> 본 문서는 그 피드백을 반영한 도메인 재설계 명세. 코드 구현은 [TECHNICAL_PLAN.md §3](../TECHNICAL_PLAN.md) 와 별도 PR로 진행.

## 1. 2-Layer 구조 (핵심 결정)

| Layer | 정의 | 예시 | 형태 |
|---|---|---|---|
| **Sensor Layer** (신규) | raw IoT 시그널. on/off, 수치값, 타임스탬프 | `door_lock = unlock_outside @ 19:32`<br>`induction = on (lvl 4) @ 18:15` | `sensors.json` 카탈로그 + 런타임 `SensorReading` |
| **Event Layer** (기존+확장) | 해석된 high-level 명제 | `user_returned`<br>`cooking_done`<br>`pre_sleep_30min` | `events.json` (확장됨) |

**왜 2-Layer**:
- Sensor → Event 추론은 **ML 분류기의 자연스러운 입출력**과 일치 (멀티센서 입력 → 활동 라벨 출력 = UCI ADL 학습 패턴)
- 기존 scoring.py·시나리오·테스트 호환 유지 (Event 인터페이스 안 깸)
- 개인정보 분리 layer로도 작동 (Sensor=raw는 디바이스, Event=결과는 클라우드)

```
[IoT 디바이스 — 도어락/인덕션/냉장고/…]
              ↓ raw readings
        [Sensor Layer]
              ↓ inference (Rule + ML)
        [Event Layer] ← 사용자 명시 입력도 여기로
              ↓ context build
   [Scoring Layer (기존 유지)]
              ↓ priorities
        [LLM Explanation]
```

## 2. 센서 카탈로그 (`backend/app/data/sensors.json`)

### 2.1 디바이스 측 센서 (10종)

| 센서 ID | 위치 | 데이터 형식 | 주 vendor | 비고 |
|---|---|---|---|---|
| `door_lock` | entrance | `{state: locked|unlocked, side: in|out, ts}` | 삼성SDS·아이레보·게이트맨 | 출입 방향 구분 핵심 |
| `induction` | kitchen | `{state: on|off, power_level: 0-9, ts}` | LG·삼성·쿠첸 | 5분+ on = cooking |
| `microwave` | kitchen | `{state: on|off, mode, ts}` | LG·삼성 | 보조 cooking 신호 |
| `refrigerator` | kitchen | `{open_count_last_1h, last_open_ts}` | LG ThinQ | 빈번 개폐 = meal prep |
| `air_conditioner` | living·bedroom (개별) | `{state, mode, target_temp, room_id, ts}` | LG·삼성 | 방 점유 보조 신호 |
| `tv` | living | `{state, channel?, volume?, ts}` | LG·삼성 | 거실 점유 |
| `bed_sensor` | bedroom | `{occupied: bool, motion_level, ts}` | 자이리·withings·샤오미 | 취침 직접 신호 |
| `motion_sensor` | 방별 (5개) | `{room_id, last_motion_ts}` | Aqara·Philips·SmartThings | 사용자 위치 추정 |
| `humidity_bath` | bathroom | `{rh: 0-100, ts}` | 스마트홈 통합 센서 | 80%+ 급증 = 샤워 |
| `smart_speaker` | living·bedroom | `{wake_word_ts, voice_command?}` | LG ThinQ·Google·Apple | 사용자 음성 활동 |

### 2.2 외부 데이터 source (2종)

| ID | 출처 | 데이터 |
|---|---|---|
| `weather_api` | 기상청·OpenWeather | `{condition: clear|rain|snow|cloud, intensity, last_1h_rain_mm, ts}` |
| `calendar` | Google Calendar·Apple Calendar | `{upcoming_events: [{title, start_ts, attendees?}]}` |

### 2.3 위치별 센서 매트릭스

| 방 | 가능한 센서 |
|---|---|
| entrance | door_lock, motion_sensor |
| living | tv, air_conditioner, motion_sensor, smart_speaker |
| kitchen | induction, microwave, refrigerator, motion_sensor |
| bedroom | bed_sensor, air_conditioner, motion_sensor, smart_speaker |
| bathroom | humidity_bath, motion_sensor |
| external | weather_api, calendar |

## 3. Sensor → Event 추론 규칙 (`sensor_inference_rules.json`)

### 3.1 추론 규칙 카탈로그

각 규칙은 *trigger 조건* → *발생 이벤트* 매핑. 동일 sensor 시그널이 여러 규칙에 트리거 가능 (다중 이벤트 동시 발생).

| 규칙 ID | Trigger | → Event | 신뢰도 |
|---|---|---|---|
| `R-RETURN-1` | `door_lock.state=unlocked AND side=out AND ts within 5min` | `user_returned` | 높음 |
| `R-LEFT-1` | `door_lock.state=locked AND side=out AND ts within 5min` | (user_left — 신규) | 높음 |
| `R-COOK-START-1` | `induction.state=on AND duration>5min` | `cooking_active` (신규) | 높음 |
| `R-COOK-START-2` | `microwave.state=on AND duration>2min` | `cooking_active` | 중간 |
| `R-COOK-DONE-1` | `induction.state OFF transition AND was_on within 30min` | `cooking_done` | 높음 |
| `R-FRIDGE-MEAL-1` | `refrigerator.open_count_last_1h >= 4` | `meal_prep` (신규, soft) | 중간 |
| `R-SLEEP-30M-1` | `bed_sensor.occupied=true AND time_to_sleep <= 30min` | `pre_sleep_30min` | 높음 |
| `R-SLEEP-2H-1` | `time_to_sleep <= 2h AND (bed_sensor.occupied OR motion_sensor.bedroom recent)` | `pre_sleep_2h` | 중간 |
| `R-TV-WATCH-1` | `tv.state=on AND duration>30min` | `tv_watching` (신규) | 높음 |
| `R-SHOWER-1` | `humidity_bath.rh>=80 AND rh delta last 10min > 20` | `recent_shower` (신규) | 높음 |
| `R-RAIN-1` | `weather_api.condition=rain OR last_1h_rain_mm>0` | `rain` | 결정론적 |
| `R-GUEST-1` | `calendar.upcoming_events has guest-tag within 2h` | `guest_arriving_2h` | 결정론적 (사용자 입력 의존) |
| `R-USER-LOC-1` | `motion_sensor.{room} last_motion within 3min` | `user_location := room` | 중간 |

### 3.2 추론 모드 (3종)

1. **Rule-based (MVP)** — 위 표를 직접 평가. 결정론·디버깅 쉬움. *Y0 구현 우선*.
2. **ML 분류기** — UCI ADL Ordonez 학습. 시간·요일·최근 sensor 시퀀스 → 이벤트 확률. *Y0 후반·Y1*.
3. **Hybrid** — Rule이 명확한 건 Rule, 모호한 건 ML. *프로덕션 권장*.

### 3.3 충돌·우선순위

- `cooking_active` 와 `cooking_done` 동시 트리거 시: cooking_done 우선 (최신 transition)
- `pre_sleep_30min` 과 `pre_sleep_2h` 동시 트리거 시: pre_sleep_30min 우선 (더 강한 신호)
- 동일 방에 `motion_sensor` 와 `tv` 동시 신호: 두 이벤트 모두 발생 (서로 보강)

## 4. Event Layer 확장 (events.json 변경)

### 4.1 기존 7개 유지 (호환)

- rain, user_returned, cooking_done, guest_arriving_2h, pre_sleep_2h, pre_sleep_30min, guest_visit_recent

### 4.2 신규 4개 (IoT 추론에서 발생 가능)

| 이벤트 | name_ko | 효과 (delta) | 발생 source |
|---|---|---|---|
| `cooking_active` | 요리 진행 중 | kitchen -25 (회피), living +5 | induction/microwave 진행 중 |
| `tv_watching` | TV 시청 중 | living -15 (회피) | tv 30분+ on |
| `recent_shower` | 샤워 직후 | bathroom +20 (물기·청소) | humidity_bath 급증 |
| `user_left` | 외출 중 | 전 방 +5 (조용한 청소 적기), bedroom +0 | door_lock outside-locked |

`cooking_done`(기존)은 *직후* 청소 우선, `cooking_active`(신규)는 *진행 중* 청소 회피 — 분리해야 의미 있음.

## 5. 개인정보 보안 설계 (Privacy on Edge)

### 5.1 데이터 흐름 등급

| 데이터 종류 | 처리 위치 | 클라우드 전송 |
|---|---|---|
| Sensor raw readings (door_lock 정확한 시각·횟수, 침대 압력 곡선 등) | **디바이스(허브) 내부** | ❌ 안 보냄 |
| Sensor 추론 결과 → Event 리스트 | 디바이스 내부 → 클라우드 | ✓ 보냄 (anonymized) |
| Event + 시간/요일 + scoring context | 클라우드 (FastAPI) | ✓ 보냄 |
| LLM 호출용 context_summary | OpenAI 등 외부 LLM API | ✓ 보냄 (자연어 요약, raw 시각·횟수 없음) |
| 청소 결정·이유 | 디바이스 / 앱 양쪽 | ✓ 응답으로 |

### 5.2 핵심 원칙

- **Raw never leaves**: 도어락 unlock 정확 시각, 침대 압력 곡선, 모션 센서 trigger 시퀀스 등 *행동 패턴 추정 가능 데이터*는 디바이스 밖으로 나가지 않음
- **Aggregated only**: 클라우드로는 "user_returned at ~19:30" 같은 이벤트 명제만 전송, 정밀 시각·횟수는 디바이스에서 라운드 처리
- **LLM input sanitization**: GPT/Claude에 보내는 prompt에는 *방 이름·이벤트·점수표*만 — 사용자 식별 가능 정보 없음
- **Opt-in 멀티 vendor 연동**: ThinQ·SmartThings 같은 외부 플랫폼 데이터는 사용자가 명시적으로 토글 ON 한 경우만

### 5.3 디바이스 측 inference 필요성

ML 모델·rule engine을 디바이스에서 돌릴 수 있어야 함:
- 무빙홈 디바이스 hardware spec: **edge AI accelerator 탑재** (예: RK3588 NPU 6TOPS 가정)
- 모델 크기 제약: <50MB (sklearn joblib + label encoder)
- 추론 latency 제약: <100ms (사용자 입력 없이 시간만으로 결정)

→ 본 설계는 **LLM-only로는 불가능** (LLM 호출=클라우드 전송=raw 노출). ML 분류기를 디바이스에서 돌리는 게 *프라이버시 명분*이자 *오프라인 fallback 명분*.

## 6. 기존 시나리오와의 매핑 (회귀 안전)

기존 4개 시나리오는 사용자 명시 입력 → events 직접 주입 방식. IoT 도입 후에도 그대로 동작.

신규 5번째 시나리오 후보 (IoT 추론 데모):
- `morning_quick_clean`: 오전 7:00, `door_lock=locked_outside @ 6:55` + `tv=off` + `bed_sensor=unoccupied` → 추론: `user_left`. 모든 방 청소 가능, 특히 거실·현관 우선.
- `cooking_in_progress`: 19:00, `induction=on (10min)` + `motion_sensor.kitchen 활발` → 추론: `cooking_active`. 주방 회피, 거실·침실 청소.

## 7. 변경/신규 파일 경로

**신규**
- `backend/app/data/sensors.json` — 센서 카탈로그
- `backend/app/data/sensor_inference_rules.json` — 추론 규칙
- `backend/app/schemas/sensor.py` — Pydantic SensorReading·InferredEvent
- `backend/app/services/sensor_inference.py` — Rule 평가 엔진 (MVP)
- `backend/tests/test_sensor_inference.py` — 추론 규칙 단위 테스트
- `docs/IOT_DOMAIN.md` — 본 문서

**수정**
- `backend/app/data/events.json` — 신규 4개 (`cooking_active`, `tv_watching`, `recent_shower`, `user_left`)
- `backend/app/data/scenarios.json` — 신규 시나리오 1-2개 (IoT 데모용)
- `backend/app/schemas/simulation.py` — `SimulateRequest.sensor_readings` 옵션 필드
- `backend/app/routers/simulate.py` — sensor_readings 있으면 inference → events 합치기
- `docs/SCORING_RULES.md` — Sensor Layer 추가 설명
- `TECHNICAL_PLAN.md` §3.3 — 5-Layer → 6-Layer (Sensor 추가) 또는 Spatial 앞에 Sensor 명시
- `BUSINESS_PLAN.md` §6.2 — 차별점 "멀티 vendor IoT 통합" 보강

## 8. 학부 발표용 한 줄 메시지

> "다른 로봇청소기는 '버튼 하나' 자동 모드를 줍니다. 무빙홈은 *이미 집 안에 있는 도어락·인덕션·침대 센서를 활용해* 사용자가 입력하지 않아도 *지금 어떤 상황인지를 추론*하고, 그 추론과 결정을 *디바이스 안에서* 끝냅니다. 데이터는 집 밖으로 나가지 않습니다."
