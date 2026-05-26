"""우리 12종 IoT 센서 형식의 합성 학습 데이터 생성.

13개 추론 규칙(sensor_inference_rules.json)을 기반으로
SensorReading[] → event_label 쌍을 대량 생성한다.
각 이벤트에 대해 다양한 시간·노이즈·복합 센서 조합을 만들어
ML이 센서 의미(door_lock unlocked vs locked 등)를 학습할 수 있게 한다.

사용법:
    cd backend && python analysis/generate_training_data.py

출력:
    data/training/iot_training_data.json
"""
from __future__ import annotations

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = PROJECT_ROOT / "data" / "training"

ROOMS = ["entrance", "living", "kitchen", "bedroom", "bathroom"]


def _ts(hour: int, minute: int = 0, offset_min: int = 0) -> str:
    base = datetime(2026, 5, 26, hour, minute)
    t = base + timedelta(minutes=offset_min)
    return t.isoformat()


def _jitter(val: float, pct: float = 0.1) -> float:
    return val * (1 + random.uniform(-pct, pct))


def gen_user_returned(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.choice([7, 8, 12, 13, 17, 18, 19, 20, 21])
        minute = random.randint(0, 59)
        motion_room = random.choice(["entrance", "living", "kitchen"])
        readings = [
            {"sensor_id": "door_lock", "state": {"state": "unlocked", "side": "out"}, "ts": _ts(hour, minute), "room_id": "entrance"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "entrance"}, "ts": _ts(hour, minute, 1), "room_id": "entrance"},
        ]
        if random.random() > 0.3:
            readings.append({"sensor_id": "motion_sensor", "state": {"room_id": motion_room}, "ts": _ts(hour, minute, 3), "room_id": motion_room})
        samples.append({"readings": readings, "label": "user_returned", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_user_left(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.choice([7, 8, 9, 10, 13, 14, 18])
        minute = random.randint(0, 59)
        readings = [
            {"sensor_id": "motion_sensor", "state": {"room_id": "entrance"}, "ts": _ts(hour, minute), "room_id": "entrance"},
            {"sensor_id": "door_lock", "state": {"state": "locked", "side": "out"}, "ts": _ts(hour, minute, 1), "room_id": "entrance"},
        ]
        samples.append({"readings": readings, "label": "user_left", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_cooking_active(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.choice([7, 8, 11, 12, 17, 18, 19])
        minute = random.randint(0, 59)
        duration = random.randint(5, 40)
        power = random.randint(800, 2200)
        readings = [
            {"sensor_id": "induction", "state": {"state": "on", "duration_min": duration, "power_level": random.randint(3, 9)}, "ts": _ts(hour, minute), "room_id": "kitchen"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "kitchen"}, "ts": _ts(hour, minute, 2), "room_id": "kitchen"},
        ]
        if random.random() > 0.5:
            readings.append({"sensor_id": "refrigerator", "state": {"open_count_last_1h": random.randint(1, 3)}, "ts": _ts(hour, minute, 3), "room_id": "kitchen"})
        if random.random() > 0.7:
            readings.append({"sensor_id": "microwave", "state": {"state": "on", "duration_min": random.randint(1, 5)}, "ts": _ts(hour, minute, 5), "room_id": "kitchen"})
        samples.append({"readings": readings, "label": "cooking_active", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_cooking_done(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.choice([8, 9, 12, 13, 18, 19, 20])
        minute = random.randint(0, 59)
        readings = [
            {"sensor_id": "induction", "state": {"state": "off", "transition_from": "on", "prev_on_within_min": random.randint(10, 30)}, "ts": _ts(hour, minute), "room_id": "kitchen"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "kitchen"}, "ts": _ts(hour, minute, -5), "room_id": "kitchen"},
        ]
        if random.random() > 0.4:
            readings.append({"sensor_id": "refrigerator", "state": {"open_count_last_1h": random.randint(3, 8), "open_count_last_1h_gte": 4}, "ts": _ts(hour, minute, -2), "room_id": "kitchen"})
        if random.random() > 0.5:
            readings.append({"sensor_id": "motion_sensor", "state": {"room_id": "living"}, "ts": _ts(hour, minute, 3), "room_id": "living"})
        samples.append({"readings": readings, "label": "cooking_done", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_pre_sleep(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        sleep_hour = random.choice([22, 23, 0])
        sleep_min = random.choice([0, 30])
        offset = random.randint(5, 25)
        hour = sleep_hour if offset < 60 else sleep_hour - 1
        minute = max(0, sleep_min - offset) if sleep_hour == hour else 60 - offset + sleep_min
        minute = minute % 60
        readings = [
            {"sensor_id": "bed_sensor", "state": {"occupied": True, "motion_level": random.randint(1, 4)}, "ts": _ts(hour % 24, minute), "room_id": "bedroom"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "bedroom"}, "ts": _ts(hour % 24, minute, -3), "room_id": "bedroom"},
        ]
        if random.random() > 0.5:
            readings.append({"sensor_id": "tv", "state": {"state": "off"}, "ts": _ts(hour % 24, minute, -10), "room_id": "living"})
        samples.append({"readings": readings, "label": "pre_sleep", "current_time": f"{hour % 24:02d}:{minute:02d}", "sleep_time": f"{sleep_hour % 24:02d}:{sleep_min:02d}"})
    return samples


def gen_recent_shower(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.choice([6, 7, 8, 19, 20, 21, 22])
        minute = random.randint(0, 59)
        rh = random.randint(78, 95)
        delta = random.randint(18, 35)
        readings = [
            {"sensor_id": "humidity_bath", "state": {"rh": rh, "rh_gte": 80, "rh_delta_last_10min": delta, "rh_delta_last_10min_gte": 20}, "ts": _ts(hour, minute), "room_id": "bathroom"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "bathroom"}, "ts": _ts(hour, minute, -5), "room_id": "bathroom"},
        ]
        samples.append({"readings": readings, "label": "recent_shower", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_tv_watching(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.choice([10, 14, 15, 19, 20, 21, 22])
        minute = random.randint(0, 59)
        duration = random.randint(30, 180)
        readings = [
            {"sensor_id": "tv", "state": {"state": "on", "duration_min": duration}, "ts": _ts(hour, minute), "room_id": "living"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "living"}, "ts": _ts(hour, minute, -5), "room_id": "living"},
        ]
        if random.random() > 0.6:
            readings.append({"sensor_id": "air_conditioner", "state": {"state": "on", "target_temp": random.randint(22, 26)}, "ts": _ts(hour, minute), "room_id": "living"})
        samples.append({"readings": readings, "label": "tv_watching", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_rain(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        rain_mm = round(random.uniform(0.5, 20), 1)
        readings = [
            {"sensor_id": "weather_api", "state": {"condition": "rain", "last_1h_rain_mm": rain_mm}, "ts": _ts(hour, minute)},
        ]
        if random.random() > 0.5:
            readings.append({"sensor_id": "door_lock", "state": {"state": "unlocked", "side": "out"}, "ts": _ts(hour, minute, -3), "room_id": "entrance"})
        samples.append({"readings": readings, "label": "rain", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_guest_arriving(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.choice([10, 11, 14, 15, 17, 18, 19])
        minute = random.randint(0, 59)
        readings = [
            {"sensor_id": "calendar", "state": {"upcoming_event_tag": "guest", "within_min_lte": 120, "within_min": random.randint(30, 120)}, "ts": _ts(hour, minute)},
            {"sensor_id": "motion_sensor", "state": {"room_id": "living"}, "ts": _ts(hour, minute, 2), "room_id": "living"},
        ]
        samples.append({"readings": readings, "label": "guest_arriving_2h", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_meal_prep(n: int) -> list[dict]:
    samples = []
    for _ in range(n):
        hour = random.choice([7, 8, 11, 12, 17, 18])
        minute = random.randint(0, 59)
        opens = random.randint(4, 10)
        readings = [
            {"sensor_id": "refrigerator", "state": {"open_count_last_1h": opens, "open_count_last_1h_gte": 4}, "ts": _ts(hour, minute), "room_id": "kitchen"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "kitchen"}, "ts": _ts(hour, minute, 1), "room_id": "kitchen"},
        ]
        samples.append({"readings": readings, "label": "meal_prep", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_noise_idle(n: int) -> list[dict]:
    """이벤트 없는 일상 — false positive 방지용."""
    samples = []
    for _ in range(n):
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        room = random.choice(ROOMS)
        readings = [
            {"sensor_id": "motion_sensor", "state": {"room_id": room}, "ts": _ts(hour, minute), "room_id": room},
        ]
        if random.random() > 0.5:
            readings.append({"sensor_id": "air_conditioner", "state": {"state": "on", "target_temp": random.randint(22, 26)}, "ts": _ts(hour, minute), "room_id": "living"})
        if random.random() > 0.7:
            readings.append({"sensor_id": "humidity_bath", "state": {"rh": random.randint(40, 65), "rh_delta_last_10min": random.randint(0, 5)}, "ts": _ts(hour, minute), "room_id": "bathroom"})
        samples.append({"readings": readings, "label": "idle", "current_time": f"{hour:02d}:{minute:02d}", "sleep_time": "23:00"})
    return samples


def gen_multi_label(n: int) -> list[dict]:
    """복합 시나리오 — 2개 이벤트가 동시에 발생. multi-label로 라벨링."""
    combos = [
        ("rain", "user_returned", lambda h, m: [
            {"sensor_id": "weather_api", "state": {"condition": "rain", "last_1h_rain_mm": round(random.uniform(1, 15), 1)}, "ts": _ts(h, m)},
            {"sensor_id": "door_lock", "state": {"state": "unlocked", "side": "out"}, "ts": _ts(h, m, 1), "room_id": "entrance"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "entrance"}, "ts": _ts(h, m, 2), "room_id": "entrance"},
        ]),
        ("cooking_done", "meal_prep", lambda h, m: [
            {"sensor_id": "induction", "state": {"state": "off", "transition_from": "on", "prev_on_within_min": random.randint(10, 25)}, "ts": _ts(h, m), "room_id": "kitchen"},
            {"sensor_id": "refrigerator", "state": {"open_count_last_1h": random.randint(4, 8), "open_count_last_1h_gte": 4}, "ts": _ts(h, m, -3), "room_id": "kitchen"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "kitchen"}, "ts": _ts(h, m, -5), "room_id": "kitchen"},
        ]),
        ("user_returned", "cooking_active", lambda h, m: [
            {"sensor_id": "door_lock", "state": {"state": "unlocked", "side": "out"}, "ts": _ts(h, m), "room_id": "entrance"},
            {"sensor_id": "motion_sensor", "state": {"room_id": "kitchen"}, "ts": _ts(h, m, 5), "room_id": "kitchen"},
            {"sensor_id": "induction", "state": {"state": "on", "duration_min": random.randint(5, 20)}, "ts": _ts(h, m, 6), "room_id": "kitchen"},
        ]),
    ]
    samples = []
    per_combo = n // len(combos)
    for label1, label2, gen_readings in combos:
        for _ in range(per_combo):
            hour = random.choice([7, 8, 12, 17, 18, 19, 20])
            minute = random.randint(0, 59)
            readings = gen_readings(hour, minute)
            # multi-label: labels 필드에 두 이벤트 모두 저장
            samples.append({
                "readings": readings,
                "label": label1,
                "labels": [label1, label2],
                "current_time": f"{hour:02d}:{minute:02d}",
                "sleep_time": "23:00",
            })
            samples.append({
                "readings": readings,
                "label": label2,
                "labels": [label1, label2],
                "current_time": f"{hour:02d}:{minute:02d}",
                "sleep_time": "23:00",
            })
    return samples


GENERATORS = {
    "user_returned": (gen_user_returned, 300),
    "user_left": (gen_user_left, 300),
    "cooking_active": (gen_cooking_active, 300),
    "cooking_done": (gen_cooking_done, 300),
    "pre_sleep": (gen_pre_sleep, 300),
    "recent_shower": (gen_recent_shower, 250),
    "tv_watching": (gen_tv_watching, 250),
    "rain": (gen_rain, 200),
    "guest_arriving_2h": (gen_guest_arriving, 200),
    "meal_prep": (gen_meal_prep, 200),
    "idle": (gen_noise_idle, 400),
    "multi": (gen_multi_label, 300),
}


def run():
    print("=" * 60)
    print("IoT 센서 합성 학습 데이터 생성")
    print("=" * 60)

    all_samples = []
    for label, (gen_fn, count) in GENERATORS.items():
        samples = gen_fn(count)
        all_samples.extend(samples)
        print(f"  {label:20s}: {len(samples):,} samples")

    random.shuffle(all_samples)
    print(f"\nTotal: {len(all_samples):,} samples")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / "iot_training_data.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_samples, f, ensure_ascii=False, indent=None)
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    run()
