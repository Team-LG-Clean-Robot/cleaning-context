# Mock Data Schema

> 백엔드 startup 시 로드되는 정적 JSON 파일 4개의 스키마와 seed 값.
> 실데이터 부재를 우회하기 위한 MVP 자산 (PLANNING.md §8 SWOT — Mock data 의존 명시).

## 파일 목록

| 파일 | 용도 |
|---|---|
| `data/rooms.json` | 공간 5개 메타 (좌표·base score·noise) |
| `data/events.json` | 이벤트 카탈로그·effects |
| `data/scenarios.json` | 사전 정의 시나리오 4개 + 초기 컨텍스트 |
| `data/scoring_rules.json` | [SCORING_RULES.md](./SCORING_RULES.md)의 modifiers·threshold |

## 1. `rooms.json`

```json
[
  {
    "id": "entrance",
    "name_ko": "현관",
    "base_score": 30,
    "noise_sensitivity": 2,
    "last_cleaned_hours": 48,
    "bbox": {"x": 0,   "y": 0,   "w": 100, "h": 80}
  },
  {
    "id": "living",
    "name_ko": "거실",
    "base_score": 25,
    "noise_sensitivity": 5,
    "last_cleaned_hours": 24,
    "bbox": {"x": 100, "y": 0,   "w": 200, "h": 160}
  },
  {
    "id": "kitchen",
    "name_ko": "주방",
    "base_score": 20,
    "noise_sensitivity": 4,
    "last_cleaned_hours": 24,
    "bbox": {"x": 300, "y": 0,   "w": 120, "h": 80}
  },
  {
    "id": "bedroom",
    "name_ko": "침실",
    "base_score": 15,
    "noise_sensitivity": 9,
    "last_cleaned_hours": 12,
    "bbox": {"x": 100, "y": 160, "w": 200, "h": 120}
  },
  {
    "id": "bathroom",
    "name_ko": "욕실",
    "base_score": 10,
    "noise_sensitivity": 3,
    "last_cleaned_hours": 24,
    "bbox": {"x": 300, "y": 80,  "w": 120, "h": 80}
  }
]
```

**bbox.** SVG viewBox `0 0 420 280` 기준 좌표. 프론트 `HouseMap.tsx`가 그대로 사용.

## 2. `events.json`

```json
[
  {
    "id": "rain", "name_ko": "비",
    "effects": [
      {"room_id": "entrance", "delta": 20},
      {"room_id": "living",   "delta": 5}
    ]
  },
  {
    "id": "user_returned", "name_ko": "사용자 귀가",
    "effects": [
      {"room_id": "entrance", "delta": 15},
      {"room_id": "living",   "delta": 10}
    ]
  },
  {
    "id": "cooking_done", "name_ko": "요리 완료",
    "effects": [
      {"room_id": "kitchen", "delta": 30}
    ]
  },
  {
    "id": "guest_arriving_2h", "name_ko": "손님 방문 임박",
    "effects": [
      {"room_id": "entrance", "delta": 20},
      {"room_id": "living",   "delta": 25},
      {"room_id": "kitchen",  "delta": 5},
      {"room_id": "bedroom",  "delta": -10},
      {"room_id": "bathroom", "delta": 10}
    ]
  },
  {
    "id": "pre_sleep_2h", "name_ko": "취침 2시간 이내",
    "effects": [
      {"room_id": "bedroom", "delta": -30}
    ]
  },
  {
    "id": "pre_sleep_30min", "name_ko": "취침 30분 이내",
    "effects": [
      {"room_id": "entrance", "delta": -5},
      {"room_id": "living",   "delta": -15},
      {"room_id": "kitchen",  "delta": -5},
      {"room_id": "bedroom",  "delta": -30},
      {"room_id": "bathroom", "delta": -5}
    ]
  },
  {
    "id": "cleanup_gap_2d", "name_ko": "마지막 청소 2일+ 경과",
    "effects": [
      {"room_id": "*", "delta": 10}
    ]
  }
]
```

**`room_id: "*"`.** 적용 대상 공간을 시나리오에서 명시하는 와일드카드. 시나리오의 `gap_rooms` 필드와 결합.

## 3. `scenarios.json`

```json
[
  {
    "id": "rainy_return",
    "name_ko": "비 오는 날 귀가",
    "description": "사용자가 비 오는 저녁 귀가, 취침 2시간 후",
    "current_time": "20:30",
    "sleep_time": "23:00",
    "user_location": null,
    "active_events": ["rain", "user_returned", "pre_sleep_2h"],
    "gap_rooms": ["entrance"]
  },
  {
    "id": "post_cooking",
    "name_ko": "요리 직후",
    "description": "요리 마치고 사용자가 거실에서 휴식",
    "current_time": "19:20",
    "sleep_time": "23:00",
    "user_location": "living",
    "active_events": ["cooking_done"],
    "gap_rooms": []
  },
  {
    "id": "pre_sleep",
    "name_ko": "취침 직전",
    "description": "사용자가 침실에 들어가 곧 취침",
    "current_time": "22:50",
    "sleep_time": "23:00",
    "user_location": "bedroom",
    "active_events": ["pre_sleep_30min"],
    "gap_rooms": []
  },
  {
    "id": "guest_incoming",
    "name_ko": "손님 방문 예정",
    "description": "2시간 후 손님 도착, 거실·현관 청소 공백",
    "current_time": "17:00",
    "sleep_time": "23:00",
    "user_location": null,
    "active_events": ["guest_arriving_2h"],
    "gap_rooms": ["living", "entrance"]
  }
]
```

**`active_events`.** 시나리오가 활성화하는 이벤트 ID 목록. context_builder가 events.json에서 lookup해 effects를 합산.

**`gap_rooms`.** `cleanup_gap_2d` 와일드카드를 적용할 공간 목록.

## 4. `scoring_rules.json`

```json
{
  "modifiers": {
    "user_occupancy_delta": -20,
    "noise_sleep_extra_delta": -10,
    "noise_sleep_threshold": 7,
    "exclusion_threshold": 0,
    "delayed_minutes": 30
  },
  "mode_priority": ["excluded", "delayed", "quiet", "normal"]
}
```

## 5. 데이터 라이프사이클

| 시점 | 동작 |
|---|---|
| 백엔드 startup | 4개 JSON을 메모리 dict로 로드. 변경 감지 reload 없음 |
| 시나리오 추가 | `scenarios.json`에 객체 추가 → 서버 재시작 |
| 룰 가중치 조정 | `events.json` 또는 `scoring_rules.json` 편집 → 서버 재시작 + scoring golden test 재실행 |

## 6. 공개 IoT 데이터셋 통합 경로 (1주차 후반·2주차)

박주상 위임 작업으로 데이터셋이 픽스되면 (UCI ADL 또는 Kaggle Smart Home), 다음 경로로 통합:

1. `scripts/analyze_iot.py` — 시간대별 공간 사용 빈도 추출 → CSV
2. `events.json`의 effects 값을 빈도 기반으로 재보정 (경험적 prior → empirical posterior)
3. 변경된 가중치는 `docs/WEIGHT_CALIBRATION.md`(신규)에 출처·계산 과정 기록
4. ML 이벤트 분류기 학습은 `scripts/train_event_classifier.py` 별도

## 7. 미해결

- `bbox` 좌표는 임시값. 발표용 시각 디자인은 `frontend-design` 스킬로 후속 보강
- 사용자 위치(아이콘) 좌표 — 공간 중앙 자동 계산 vs 별도 필드. 현재 자동 계산으로 가정
