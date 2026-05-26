"""우리 IoT 센서 합성 데이터로 이벤트 분류기(v2) 학습.

v1(CASAS)과 달리 센서별 의미 feature를 사용 → door_lock unlocked vs locked 구분 가능.

사용법:
    cd backend && python analysis/generate_training_data.py
    cd backend && python analysis/ml_train_v2.py

출력:
    models/event_classifier_v2.joblib
    reports/ml_metrics_v2.json
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "training" / "iot_training_data.json"
MODEL_DIR = PROJECT_ROOT / "models"
REPORT_DIR = PROJECT_ROOT / "reports"

SENSOR_IDS = [
    "door_lock", "induction", "microwave", "refrigerator",
    "air_conditioner", "tv", "bed_sensor", "motion_sensor",
    "humidity_bath", "weather_api", "calendar", "smart_speaker",
]
ROOMS = ["entrance", "living", "kitchen", "bedroom", "bathroom"]


def extract_features(sample: dict) -> np.ndarray:
    readings = sample["readings"]
    current_time = sample["current_time"]
    hour, minute = (int(x) for x in current_time.split(":"))

    sensor_present = {sid: 0.0 for sid in SENSOR_IDS}
    room_counts = {r: 0 for r in ROOMS}

    # sensor-specific features
    door_unlocked = 0.0
    door_locked = 0.0
    door_side_out = 0.0
    induction_on = 0.0
    induction_off = 0.0
    induction_transition = 0.0
    induction_duration = 0.0
    microwave_on = 0.0
    fridge_opens = 0.0
    fridge_opens_high = 0.0
    tv_on = 0.0
    tv_duration = 0.0
    bed_occupied = 0.0
    humidity_rh = 0.0
    humidity_delta = 0.0
    humidity_high = 0.0
    weather_rain = 0.0
    rain_mm = 0.0
    calendar_guest = 0.0
    ac_on = 0.0

    for r in readings:
        sid = r["sensor_id"]
        state = r.get("state", {})
        room = r.get("room_id")

        if sid in sensor_present:
            sensor_present[sid] = 1.0

        if room and room in room_counts:
            room_counts[room] += 1

        if sid == "door_lock":
            if state.get("state") == "unlocked":
                door_unlocked = 1.0
            elif state.get("state") == "locked":
                door_locked = 1.0
            if state.get("side") == "out":
                door_side_out = 1.0

        elif sid == "induction":
            if state.get("state") == "on":
                induction_on = 1.0
                induction_duration = float(state.get("duration_min", 0))
            elif state.get("state") == "off":
                induction_off = 1.0
                if state.get("transition_from") == "on":
                    induction_transition = 1.0

        elif sid == "microwave":
            if state.get("state") == "on":
                microwave_on = 1.0

        elif sid == "refrigerator":
            fridge_opens = float(state.get("open_count_last_1h", 0))
            if fridge_opens >= 4:
                fridge_opens_high = 1.0

        elif sid == "tv":
            if state.get("state") == "on":
                tv_on = 1.0
                tv_duration = float(state.get("duration_min", 0))

        elif sid == "bed_sensor":
            if state.get("occupied"):
                bed_occupied = 1.0

        elif sid == "humidity_bath":
            humidity_rh = float(state.get("rh", 0))
            humidity_delta = float(state.get("rh_delta_last_10min", 0))
            if humidity_rh >= 80 and humidity_delta >= 20:
                humidity_high = 1.0

        elif sid == "weather_api":
            if state.get("condition") == "rain":
                weather_rain = 1.0
            rain_mm = float(state.get("last_1h_rain_mm", 0))

        elif sid == "calendar":
            if state.get("upcoming_event_tag") == "guest":
                calendar_guest = 1.0

        elif sid == "air_conditioner":
            if state.get("state") == "on":
                ac_on = 1.0

    total_readings = len(readings)
    total_rooms = sum(room_counts.values()) or 1

    feats = []

    # sensor presence (12)
    for sid in SENSOR_IDS:
        feats.append(sensor_present[sid])

    # room ratios (5)
    for r in ROOMS:
        feats.append(room_counts[r] / total_rooms)

    # time (5)
    feats.append(float(hour))
    feats.append(float(minute))
    feats.append(np.sin(2 * np.pi * hour / 24))
    feats.append(np.cos(2 * np.pi * hour / 24))
    feats.append(1.0 if hour >= 20 or hour <= 7 else 0.0)

    # sensor-specific (20)
    feats.append(door_unlocked)
    feats.append(door_locked)
    feats.append(door_side_out)
    feats.append(induction_on)
    feats.append(induction_off)
    feats.append(induction_transition)
    feats.append(min(induction_duration / 60.0, 1.0))
    feats.append(microwave_on)
    feats.append(min(fridge_opens / 10.0, 1.0))
    feats.append(fridge_opens_high)
    feats.append(tv_on)
    feats.append(min(tv_duration / 180.0, 1.0))
    feats.append(bed_occupied)
    feats.append(min(humidity_rh / 100.0, 1.0))
    feats.append(min(humidity_delta / 40.0, 1.0))
    feats.append(humidity_high)
    feats.append(weather_rain)
    feats.append(min(rain_mm / 20.0, 1.0))
    feats.append(calendar_guest)
    feats.append(ac_on)

    # meta (1)
    feats.append(min(total_readings / 10.0, 1.0))

    return np.array(feats, dtype=np.float32)


FEATURE_NAMES = (
    [f"has_{s}" for s in SENSOR_IDS]
    + [f"{r}_ratio" for r in ROOMS]
    + ["hour", "minute", "hour_sin", "hour_cos", "is_night"]
    + [
        "door_unlocked", "door_locked", "door_side_out",
        "induction_on", "induction_off", "induction_transition", "induction_duration_norm",
        "microwave_on",
        "fridge_opens_norm", "fridge_opens_high",
        "tv_on", "tv_duration_norm",
        "bed_occupied",
        "humidity_rh_norm", "humidity_delta_norm", "humidity_high",
        "weather_rain", "rain_mm_norm",
        "calendar_guest",
        "ac_on",
    ]
    + ["reading_count_norm"]
)


def run():
    print("=" * 60)
    print("IoT 센서 ML 분류기 v2 학습")
    print("=" * 60)

    with open(DATA_PATH, encoding="utf-8") as f:
        samples = json.load(f)

    print(f"Samples: {len(samples):,}")

    labels = sorted(set(s["label"] for s in samples))
    label_to_idx = {l: i for i, l in enumerate(labels)}
    print(f"Labels ({len(labels)}): {labels}")
    print(f"Distribution: {dict(Counter(s['label'] for s in samples))}")

    # multi-label 지원: 각 샘플의 labels 필드 (없으면 [label])
    event_labels = [l for l in labels if l != "idle"]
    event_to_idx = {l: i for i, l in enumerate(event_labels)}

    X = np.array([extract_features(s) for s in samples])

    # 이벤트별 이진 라벨 행렬 (multi-label)
    Y = np.zeros((len(samples), len(event_labels)), dtype=int)
    for i, s in enumerate(samples):
        for lbl in s.get("labels", [s["label"]]):
            if lbl in event_to_idx:
                Y[i, event_to_idx[lbl]] = 1

    print(f"Features: {X.shape}, Labels: {Y.shape} (multi-label)")

    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import accuracy_score, f1_score
    from sklearn.model_selection import KFold

    cv = KFold(n_splits=5, shuffle=True, random_state=42)

    # 이벤트별 개별 RandomForest (One-vs-Rest)
    from sklearn.multiclass import OneVsRestClassifier

    base = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    model = OneVsRestClassifier(base)

    # 5-fold CV
    cv_scores = []
    for train_idx, test_idx in cv.split(X):
        model_cv = OneVsRestClassifier(
            RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
        )
        model_cv.fit(X[train_idx], Y[train_idx])
        Y_pred = model_cv.predict(X[test_idx])
        f1 = f1_score(Y[test_idx], Y_pred, average="micro")
        cv_scores.append(f1)

    cv_mean = np.mean(cv_scores)
    cv_std = np.std(cv_scores)
    print(f"\n5-fold CV micro-F1 = {cv_mean:.3f} (+/- {cv_std:.3f})")

    # 전체 학습
    model.fit(X, Y)
    Y_pred_train = model.predict(X)
    train_f1 = f1_score(Y, Y_pred_train, average="micro")

    print(f"\n{'=' * 50}")
    print(f"Train micro-F1: {train_f1:.3f}")
    print(f"5-fold CV:      {cv_mean:.3f}")
    print(f"{'=' * 50}")

    # per-class metrics
    per_class = {}
    for j, lbl in enumerate(event_labels):
        tp = int(np.sum((Y[:, j] == 1) & (Y_pred_train[:, j] == 1)))
        fp = int(np.sum((Y[:, j] == 0) & (Y_pred_train[:, j] == 1)))
        fn = int(np.sum((Y[:, j] == 1) & (Y_pred_train[:, j] == 0)))
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
        per_class[lbl] = {"precision": round(prec, 3), "recall": round(rec, 3), "f1": round(f1, 3)}
        print(f"  {lbl:20s} P={prec:.3f} R={rec:.3f} F1={f1:.3f}")

    # save model
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / "event_classifier_v2.joblib"
    joblib.dump({
        "model": model,
        "labels": event_labels,
        "feature_names": FEATURE_NAMES,
        "version": "v2-iot",
        "multi_label": True,
    }, model_path)
    print(f"\nModel saved: {model_path}")

    # save metrics
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    metrics = {
        "dataset": "IoT 합성 데이터 (12종 센서 × multi-label)",
        "total_samples": len(samples),
        "feature_count": X.shape[1],
        "class_count": len(event_labels),
        "labels": event_labels,
        "best_model": "OneVsRest(RandomForest)",
        "best_cv_f1": round(float(cv_mean), 4),
        "train_f1": round(float(train_f1), 4),
        "per_class": per_class,
        "analysis_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    metrics_path = REPORT_DIR / "ml_metrics_v2.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)
    print(f"Metrics saved: {metrics_path}")


if __name__ == "__main__":
    run()
