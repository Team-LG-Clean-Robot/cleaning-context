# Scenario Expansion Tech Note

> 작성 목적: 신규 시나리오 아이디어를 바로 구현 가능한 기술 요구사항으로 정리한다.
> 대상 독자: 팀원, 멘토, 후속 작업을 맡는 AI/code agent.
> 핵심 메시지: 로봇청소기가 단순히 공간을 청소하는 것이 아니라, 외부 생활 이벤트와 홈 AI 가전 데이터를 결합해 "언제, 어디를, 왜" 청소할지 설명한다.

---

## 1. 요약

현재 MVP는 4개 preset 시나리오를 기반으로 동작한다.

- 비 오는 날 귀가
- 요리 직후
- 취침 직전
- 손님 방문 예정

다음 단계에서는 사용자가 직접 버튼을 누르는 시나리오를 넘어, 실제 홈 AI 환경에서 수집 가능한 이벤트를 이용해 더 현실적인 맥락 추론을 보여준다.

본 문서는 우선순위가 높은 신규 시나리오 2개를 정의한다.

| ID | 시나리오 | 대표 데이터 소스 | 핵심 가치 |
|---|---|---|---|
| S1 | 택배 도착 후 현관/동선 청소 | 배송완료 문자/앱 알림, 현관 센서, 로봇 맵 | 외부 생활 이벤트와 청소 타이밍 연결 |
| S2 | 식사 종료 후 주방/식사 동선 청소 | 냉장고, 조리기기, 공기청정기, 모션 센서 | LG ThinQ 계열 홈가전 데이터 활용 |

두 시나리오는 모두 동일한 처리 구조를 따른다.

```text
Data Source
→ Event Extraction
→ Context Inference
→ Decision Scoring
→ Cleaning Action
→ LLM Explanation
```

---

## 2. 공통 아키텍처

### 2.1 Layer 구조

| Layer | 역할 | 예시 |
|---|---|---|
| Data Source Layer | 원본 신호 수집 | 배송완료 알림, 냉장고 문열림, VOC 상승, 문열림 센서 |
| Event Extraction Layer | 원본에서 필요한 이벤트만 추출 | `package_delivered`, `fridge_open_frequent`, `voc_high` |
| Context Inference Layer | 여러 이벤트의 시간 순서를 조합해 생활 상황 추론 | `user_entered_with_package`, `meal_finished` |
| Decision Layer | 추론 이벤트를 방별 priority score에 반영 | 현관 +35, 주방 +35 |
| Action & Explanation Layer | 청소 실행/지연 및 이유 설명 | "택배 수령 후 현관 오염 가능성이 높아 먼저 청소합니다." |

### 2.2 개인정보 원칙

본 프로젝트는 원본 개인정보를 저장하지 않고, 로컬 또는 외부 서비스에서 이미 판단된 이벤트 메타데이터만 사용한다.

| 원본 | 사용하지 않는 것 | 사용하는 것 |
|---|---|---|
| 배송 문자/앱 알림 | 전체 문자 본문, 송장번호, 주소, 상품명 | `package_delivered=true`, `delivered_at` |
| 홈 CCTV/도어벨 | 영상, 얼굴, 사람 이미지 | `entrance_motion=true`, `door_opened=true`, `package_detected=true` |
| 냉장고/조리기기 | 식재료 목록, 사용자 계정 정보 | `fridge_open_count`, `cooktop_off_at` |
| 공기청정기 | 개인 식습관 추론 원본 로그 | `voc_level=high`, `odor_level=high` |

발표에서는 "CCTV 영상을 분석한다"보다 "도어벨/현관 센서가 로컬에서 판단한 이벤트만 받는다"라고 설명한다.

---

## 3. S1. 택배 도착 후 현관/동선 청소

### 3.1 사용자 시나리오

1. 택배 배송완료 문자 또는 앱 알림이 도착한다.
2. 시스템은 일정 시간 동안 현관 문열림/모션 이벤트를 관찰한다.
3. 사용자가 택배를 들고 실내로 들어왔을 가능성이 높다고 판단한다.
4. 로봇청소기는 현관과 예상 이동 동선을 우선 청소한다.
5. 사용자가 해당 공간에 머무르면 즉시 청소하지 않고 지연한다.

### 3.2 데이터 소스

| 데이터 | 가능한 출처 | MVP 구현 | 실제 제품 확장 |
|---|---|---|---|
| 배송완료 이벤트 | 배송완료 문자, 쿠팡/CJ/한진 앱 알림, 이메일 | mock event 입력 | OS notification parser 또는 택배사/쇼핑앱 API 연동 |
| 현관 문열림 | 스마트 도어락, 문열림 센서 | mock boolean | Matter/HomeKit/ThinQ 연동 센서 |
| 현관 모션 | 도어벨, PIR 센서, 홈 허브 센서 | mock boolean | 로컬 도어벨 이벤트 또는 스마트홈 센서 |
| 이동 동선 | 로봇청소기 지도, 현재 `rooms.json` bbox | `entrance -> living` 고정 | 실제 SLAM map 기반 경로 추정 |
| 사용자 위치 | 현재 MVP의 `user_location` | room id 입력 | 스마트폰 위치, BLE, 모션 센서 조합 |

### 3.3 이벤트 정의

최소 MVP에서는 다음 이벤트 1개만 추가해도 된다.

```json
{
  "id": "package_delivery",
  "name_ko": "택배 도착",
  "effects": [
    {"room_id": "entrance", "delta": 35},
    {"room_id": "living", "delta": 10}
  ]
}
```

더 현실적인 버전은 단계 이벤트를 분리한다.

| event_id | 의미 | 사용 위치 |
|---|---|---|
| `package_delivered` | 배송완료 알림 수신 | Event Extraction |
| `entrance_open_after_delivery` | 배송 후 현관 문열림 | Context Inference |
| `entrance_motion_after_delivery` | 배송 후 현관 모션 감지 | Context Inference |
| `user_entered_with_package` | 사용자가 택배를 들고 실내 진입했다고 추론 | Decision Scoring |

### 3.4 추론 로직

```text
IF package_delivered within last 120 minutes
AND entrance_door_opened within last 30 minutes
AND entrance_motion_detected within last 30 minutes
THEN inferred_event = user_entered_with_package
```

추론된 이벤트가 발생하면 scoring engine에 다음 가중치를 준다.

| 공간 | delta | 이유 |
|---|---:|---|
| 현관 | +35 | 택배 수령 후 외부 먼지/포장재 부스러기 발생 가능성 |
| 거실 | +10 | 현관에서 택배를 들고 들어오는 기본 동선 |
| 주방 | 0 또는 +5 | 사용자가 택배를 주방으로 옮기는 옵션이 있을 때만 |
| 침실 | 0 | 직접 관련 낮음 |
| 욕실 | 0 | 직접 관련 낮음 |

### 3.5 작동 흐름

```text
배송완료 문자/앱 알림
→ package_delivered 이벤트 생성
→ 현관 문열림/모션 이벤트 대기
→ user_entered_with_package 추론
→ 현관 + 예상 동선 priority score 상승
→ user_location과 충돌하면 delayed
→ 청소 실행
→ LLM 설명 생성
```

### 3.6 LLM 설명 예시

> 배송완료 알림 이후 현관 출입이 감지되어, 사용자가 택배를 들고 들어온 상황으로 판단했습니다. 외부 먼지와 포장재 부스러기가 생길 가능성이 높은 현관을 먼저 청소하고, 거실 동선은 보조 청소 대상으로 설정했습니다.

### 3.7 구현 작업 단위

| 단계 | 작업 | 파일 후보 |
|---|---|---|
| 1 | `package_delivery` 이벤트 추가 | `backend/app/data/events.json` |
| 2 | preset scenario 추가 | `backend/app/data/scenarios.json` |
| 3 | scoring golden test 추가 | `backend/tests/test_scoring.py` |
| 4 | 프론트 scenario card 추가 | `frontend/components/ScenarioPanel.tsx` 또는 scenario API 응답 기반 자동 노출 |
| 5 | LLM cache seed 추가 | `backend/scripts/seed_cache.py`, `backend/app/data/cached_responses/` |

---

## 4. S2. 식사 종료 후 주방/식사 동선 청소

### 4.1 사용자 시나리오

1. 냉장고 문 열림이 짧은 시간에 여러 번 발생한다.
2. 인덕션/오븐/전자레인지 등 조리기기 사용이 감지된다.
3. 공기청정기 VOC/냄새 수치가 상승한다.
4. 조리기기 사용이 종료되고, 주방 모션이 줄거나 거실/식탁 방향 모션으로 이동한다.
5. 시스템은 식사 준비와 식사 종료를 추론한다.
6. 로봇청소기는 주방과 식사 동선을 우선 청소한다.

### 4.2 데이터 소스

| 데이터 | 가능한 출처 | MVP 구현 | 실제 제품 확장 |
|---|---|---|---|
| 냉장고 문열림 빈도 | 스마트 냉장고, ThinQ 이벤트 | `fridge_open_count` mock | ThinQ device event |
| 조리기기 사용/종료 | 인덕션, 오븐, 전자레인지, 스마트플러그 | `cooktop_recently_off` mock | ThinQ appliance telemetry |
| VOC/냄새 상승 | 공기청정기, 에어컨 공기질 센서 | `voc_high` mock | 공기청정기 센서 |
| 주방/거실 모션 | 스마트홈 모션 센서 | `kitchen_motion_low`, `living_motion` mock | Matter/HomeKit/센서 허브 |
| 시간대 | 로컬 시간 | `current_time` | 동일 |

### 4.3 이벤트 정의

최소 MVP에서는 다음 이벤트를 추가한다.

```json
{
  "id": "meal_finished",
  "name_ko": "식사 종료 추정",
  "effects": [
    {"room_id": "kitchen", "delta": 35},
    {"room_id": "living", "delta": 15}
  ]
}
```

더 세밀한 버전은 감지 이벤트와 추론 이벤트를 분리한다.

| event_id | 의미 | 사용 위치 |
|---|---|---|
| `fridge_open_frequent` | 냉장고 문열림 빈도 증가 | Event Extraction |
| `cooktop_recently_off` | 조리기기 사용 종료 | Event Extraction |
| `air_quality_voc_high` | VOC/냄새 수치 상승 | Event Extraction |
| `kitchen_motion_decreased` | 주방 활동 감소 | Context Inference |
| `meal_finished` | 식사 종료 추정 | Decision Scoring |

### 4.4 추론 로직

```text
IF fridge_open_count >= 3 within 60 minutes
AND cooktop_or_oven_used within 90 minutes
AND cooktop_or_oven_off within 30 minutes
AND (voc_high OR odor_high)
AND kitchen_motion_decreased after cooking
THEN inferred_event = meal_finished
```

식사 종료 이벤트가 발생하면 scoring engine에 다음 가중치를 준다.

| 공간 | delta | 이유 |
|---|---:|---|
| 주방 | +35 | 조리/식사 후 음식물 부스러기 가능성 |
| 거실 | +15 | 식탁 또는 거실 식사 동선 가능성 |
| 현관 | 0 | 직접 관련 낮음 |
| 침실 | 0 또는 -5 | 식사 직후 직접 관련 낮음 |
| 욕실 | 0 | 직접 관련 낮음 |

### 4.5 작동 흐름

```text
냉장고 문열림 + 조리기기 사용 + VOC 상승
→ meal_preparation 후보 상태 생성
→ 조리기기 OFF + 주방 모션 감소
→ meal_finished 추론
→ 주방/거실 priority score 상승
→ 사용자가 거실에 있으면 거실은 delayed
→ 주방 우선 청소
→ LLM 설명 생성
```

### 4.6 LLM 설명 예시

> 냉장고 사용 빈도와 조리기기 종료 이벤트, 공기질 변화가 함께 감지되어 식사가 끝난 상황으로 판단했습니다. 음식물 부스러기가 생길 가능성이 높은 주방을 먼저 청소하고, 사용자가 머무는 거실은 잠시 뒤 청소하도록 지연했습니다.

### 4.7 구현 작업 단위

| 단계 | 작업 | 파일 후보 |
|---|---|---|
| 1 | `meal_finished` 이벤트 추가 | `backend/app/data/events.json` |
| 2 | preset scenario 추가 | `backend/app/data/scenarios.json` |
| 3 | custom mode에서 신규 이벤트 선택 가능하게 노출 | `backend/app/data/events.json`, `frontend/components/CustomModePanel.tsx` |
| 4 | scoring golden test 추가 | `backend/tests/test_scoring.py` |
| 5 | LLM cache seed 추가 | `backend/scripts/seed_cache.py`, `backend/app/data/cached_responses/` |

---

## 5. MVP Scenario JSON 초안

### 5.1 택배 도착 후 현관 정리

```json
{
  "id": "package_after_delivery",
  "name_ko": "택배 도착 후 현관 정리",
  "description": "배송완료 알림 이후 현관 출입이 감지되어 현관과 거실 동선을 우선 청소",
  "current_time": "15:20",
  "sleep_time": "23:30",
  "user_location": "living",
  "active_events": ["package_delivery"],
  "gap_rooms": []
}
```

### 5.2 식사 종료 후 주방 정리

```json
{
  "id": "after_meal_cleanup",
  "name_ko": "식사 종료 후 주방 정리",
  "description": "냉장고와 조리기기 사용, 공기질 변화를 바탕으로 식사 종료를 추정",
  "current_time": "19:45",
  "sleep_time": "23:30",
  "user_location": "living",
  "active_events": ["meal_finished"],
  "gap_rooms": ["kitchen"]
}
```

---

## 6. 현재 코드와의 연결

현재 시스템은 이미 다음 구조를 갖고 있다.

| 현재 자산 | 신규 시나리오 연결 방식 |
|---|---|
| `backend/app/data/events.json` | `package_delivery`, `meal_finished` 이벤트 추가 |
| `backend/app/data/scenarios.json` | preset scenario 2개 추가 |
| `backend/app/services/scoring.py` | 기존 event delta 합산 로직 재사용 |
| `backend/app/services/context_builder.py` | LLM 설명용 context에 신규 이벤트 설명 포함 |
| `frontend/components/ScenarioPanel.tsx` | API에서 scenario 목록을 가져온다면 자동 노출, 하드코딩이면 카드 추가 |
| `frontend/components/HouseMap.tsx` | 기존 heatmap과 mode rendering 재사용 |

즉, MVP 구현은 "새로운 AI 모델 개발"보다 정적 이벤트/시나리오 추가와 golden test 보강이 중심이다.

---

## 7. 향후 고도화: 실제 IoT/ADL 데이터셋 연결

공개 IoT/ADL 데이터셋은 청소 타깃을 직접 학습하기보다, 현재 생활 상황을 추론하는 근거로 사용한다.

### 7.1 추천 데이터셋

| 데이터셋 | 특징 | 사용 목적 |
|---|---|---|
| UCI ADL Recognition Using Binary Sensors | 실제 2개 가정, 35일, sensor events + ADL labels, CC BY 4.0 | 가장 먼저 적용할 baseline |
| CASAS Smart Home datasets | 모션/문/온도 등 스마트홈 센서 기반 ADL 데이터 | 공간 점유 패턴 및 활동 추론 |
| ARAS Dataset | 실제 2개 가정, 2개월, 20개 binary sensor, 27개 activity label | 다중 거주자 및 활동 다양성 |
| OpenSHS/SIMADL | 시뮬레이션 기반 smart home ADL 데이터 | synthetic scenario 생성 형식 참고 |

### 7.2 데이터셋을 프로젝트에 붙이는 방식

```text
공개 IoT/ADL 데이터셋
→ activity label 정리
→ 우리 event_id로 매핑
→ 시간대/공간별 event prior 계산
→ events.json delta 보정 근거 생성
→ ML classifier가 active_events를 추천하는 확장 기능
```

예시 매핑:

| 원본 activity | 우리 event_id | 매핑 이유 |
|---|---|---|
| Cooking / Preparing breakfast | `meal_finished` 또는 `cooking_done` | 조리/식사 후 주방 오염 가능성 |
| Eating | `meal_finished` | 식사 후 식탁/거실 동선 청소 |
| Leaving | `going_out` | 사용자가 없는 시간대 청소 가능 |
| Entering / Returning home | `user_returned` | 현관 우선순위 상승 |
| Sleeping / Going to bed | `pre_sleep_30min` | 소음 회피 및 침실 제외 |

---

## 8. AI Agent Handoff Prompt

후속 AI/code agent에게는 아래 요청으로 바로 작업을 넘길 수 있다.

```text
docs/SCENARIO_EXPANSION_TECH.md를 기준으로 신규 시나리오 2개를 MVP에 추가해줘.

요구사항:
1. backend/app/data/events.json에 package_delivery, meal_finished 이벤트를 추가한다.
2. backend/app/data/scenarios.json에 package_after_delivery, after_meal_cleanup preset을 추가한다.
3. backend 테스트에 두 시나리오의 scoring expectation을 추가한다.
4. 프론트 시나리오 카드가 API 기반이면 자동 노출 확인, 하드코딩이면 카드 2개를 추가한다.
5. LLM cache seed가 필요한 구조라면 두 시나리오 캐시를 추가한다.
6. pytest와 frontend typecheck를 실행한다.
```

---

## 9. 발표용 한 문장

> 이 시나리오 확장은 로봇청소기가 "청소할 공간"만 보는 것이 아니라, 배송 알림과 홈 AI 가전 데이터 같은 생활 신호를 해석해 사용자가 납득 가능한 청소 타이밍과 이유를 제안하는 방향이다.

