"""
CASAS hh106 데이터로 이벤트 분류기(ML) 학습.

Rule-based 55.1% 대비 ML 성능을 비교한다.
sklearn DecisionTree → RandomForest → GradientBoosting 순차 실험.

사용법:
    cd backend && python analysis/ml_train.py

출력:
    models/event_classifier.joblib
    reports/ml_metrics.json
    reports/ml_comparison.png
"""

from __future__ import annotations

import json
import warnings
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np

warnings.filterwarnings("ignore")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "casas" / "labeled" / "hh106.csv"
MODEL_DIR = PROJECT_ROOT / "models"
REPORT_DIR = PROJECT_ROOT / "reports"

LOCATION_TO_ROOM = {
    "Kitchen": "kitchen", "LivingRoom": "living", "Bedroom": "bedroom",
    "Bathroom": "bathroom", "OutsideDoor": "entrance",
    "DiningRoom": "dining", "WorkArea": "living", "LoungeChair": "living",
}

ACTIVITY_TO_EVENT = {
    "Cook_Breakfast": "cooking_active", "Cook_Lunch": "cooking_active",
    "Cook_Dinner": "cooking_active", "Cook": "cooking_active",
    "Eat_Breakfast": "cooking_done", "Eat_Lunch": "cooking_done",
    "Eat_Dinner": "cooking_done", "Eat": "cooking_done",
    "Wash_Breakfast_Dishes": "cooking_done", "Wash_Lunch_Dishes": "cooking_done",
    "Wash_Dinner_Dishes": "cooking_done", "Wash_Dishes": "cooking_done",
    "Sleep": "pre_sleep", "Go_To_Sleep": "pre_sleep",
    "Enter_Home": "user_returned", "Leave_Home": "user_left",
    "Watch_TV": "tv_watching", "Entertain_Guests": "entertain_guests",
    "Bathe": "recent_shower", "Personal_Hygiene": "recent_shower",
}

EVENT_LABELS = sorted(set(ACTIVITY_TO_EVENT.values()))
LABEL_TO_IDX = {l: i for i, l in enumerate(EVENT_LABELS)}
ROOMS = ["kitchen", "living", "bedroom", "bathroom", "entrance", "dining"]


def parse_line(line: str):
    parts = line.strip().split(",")
    if len(parts) < 4:
        return None
    try:
        date_str, time_str, location, value = parts[0], parts[1], parts[2], parts[3]
        activity = None
        for p in parts[4:]:
            if '="begin"' in p:
                activity = p.split("=")[0]
        time_clean = time_str.split(".")[0]
        ts = datetime.strptime(f"{date_str} {time_clean}", "%Y-%m-%d %H:%M:%S")
        return {"ts": ts, "location": location, "value": value, "activity": activity}
    except (ValueError, IndexError):
        return None


def extract_features(events: list[dict]) -> np.ndarray:
    room_counts = Counter()
    total = 0
    for e in events:
        room = LOCATION_TO_ROOM.get(e["location"])
        if room:
            room_counts[room] += 1
            total += 1

    if total == 0:
        total = 1

    hour = events[0]["ts"].hour
    minute = events[0]["ts"].minute
    duration_sec = (events[-1]["ts"] - events[0]["ts"]).total_seconds() if len(events) > 1 else 0
    has_door = any(e["location"] == "OutsideDoor" for e in events)
    has_open = any(e["value"] == "OPEN" for e in events)

    feats = []
    for r in ROOMS:
        feats.append(room_counts.get(r, 0) / total)  # ratio
        feats.append(room_counts.get(r, 0))           # count
    feats.append(hour)
    feats.append(minute)
    feats.append(np.sin(2 * np.pi * hour / 24))  # cyclic hour
    feats.append(np.cos(2 * np.pi * hour / 24))
    feats.append(total)
    feats.append(duration_sec)
    feats.append(int(has_door))
    feats.append(int(has_open))
    feats.append(1 if hour >= 20 or hour <= 7 else 0)  # is_night

    return np.array(feats, dtype=np.float32)


def build_dataset():
    print("Parsing CASAS hh106...")
    records = []
    with open(DATA_PATH, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            r = parse_line(line)
            if r:
                records.append(r)

    print(f"Records: {len(records):,}")

    # 활동 구간 추출
    segments = []
    current_act = None
    current_events = []

    for r in records:
        if r["activity"] and r["activity"] in ACTIVITY_TO_EVENT:
            if current_act and current_act != r["activity"]:
                if current_events:
                    segments.append((current_act, current_events[:]))
                current_events = []
            current_act = r["activity"]
            current_events.append(r)
        elif current_act:
            current_events.append(r)
            if len(current_events) > 500:
                segments.append((current_act, current_events[:]))
                current_act = None
                current_events = []

    if current_act and current_events:
        segments.append((current_act, current_events))

    print(f"Segments: {len(segments):,}")

    X, y = [], []
    for act_name, events in segments:
        event = ACTIVITY_TO_EVENT[act_name]
        feats = extract_features(events)
        X.append(feats)
        y.append(LABEL_TO_IDX[event])

    return np.array(X), np.array(y), segments


def run():
    print("=" * 60)
    print("CASAS hh106 ML 이벤트 분류기 학습")
    print("=" * 60)

    X, y, segments = build_dataset()
    print(f"Features: {X.shape}, Labels: {len(EVENT_LABELS)} classes")
    print(f"Class distribution: {dict(Counter(y))}")

    from sklearn.model_selection import cross_val_score, StratifiedKFold
    from sklearn.tree import DecisionTreeClassifier
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.metrics import classification_report, accuracy_score

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    models = {
        "DecisionTree": DecisionTreeClassifier(max_depth=10, random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1),
        "GradientBoosting": GradientBoostingClassifier(n_estimators=100, max_depth=6, random_state=42),
    }

    results = {}
    best_name, best_score, best_model = "", 0, None

    for name, model in models.items():
        scores = cross_val_score(model, X, y, cv=cv, scoring="accuracy")
        mean_acc = scores.mean()
        std_acc = scores.std()
        print(f"\n{name}: 5-fold CV = {mean_acc:.3f} (+/- {std_acc:.3f})")
        results[name] = {"cv_mean": round(float(mean_acc), 4), "cv_std": round(float(std_acc), 4)}

        if mean_acc > best_score:
            best_name, best_score, best_model = name, mean_acc, model

    # 최고 모델로 전체 학습
    print(f"\nBest: {best_name} ({best_score:.3f})")
    best_model.fit(X, y)
    y_pred = best_model.predict(X)
    train_acc = accuracy_score(y, y_pred)

    print(f"\n{'='*50}")
    print(f"Train accuracy: {train_acc:.3f}")
    print(f"5-fold CV:      {best_score:.3f}")
    print(f"{'='*50}")

    report = classification_report(y, y_pred, target_names=EVENT_LABELS, output_dict=True)
    print(classification_report(y, y_pred, target_names=EVENT_LABELS))

    # 모델 저장
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / "event_classifier.joblib"
    joblib.dump({"model": best_model, "labels": EVENT_LABELS, "feature_names": _feature_names()}, model_path)
    print(f"Model saved: {model_path}")

    # Feature importance
    if hasattr(best_model, "feature_importances_"):
        fnames = _feature_names()
        importances = best_model.feature_importances_
        top_feats = sorted(zip(fnames, importances), key=lambda x: -x[1])[:10]
        print("\nTop features:")
        for fname, imp in top_feats:
            print(f"  {fname:25s} {imp:.4f}")
    else:
        top_feats = []

    # 비교 차트 생성
    _save_comparison_chart(results, best_name)

    # 메트릭 저장
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    metrics = {
        "dataset": "CASAS hh106",
        "total_segments": len(segments),
        "feature_count": X.shape[1],
        "class_count": len(EVENT_LABELS),
        "labels": EVENT_LABELS,
        "model_comparison": results,
        "best_model": best_name,
        "best_cv_accuracy": round(float(best_score), 4),
        "train_accuracy": round(float(train_acc), 4),
        "rule_based_accuracy": 0.5512,
        "per_class": {k: {"precision": round(v["precision"], 3), "recall": round(v["recall"], 3), "f1": round(v["f1-score"], 3)} for k, v in report.items() if k in EVENT_LABELS},
        "top_features": [{"name": n, "importance": round(float(i), 4)} for n, i in top_feats[:10]],
        "analysis_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    metrics_path = REPORT_DIR / "ml_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)
    print(f"Metrics saved: {metrics_path}")


def _feature_names() -> list[str]:
    names = []
    for r in ROOMS:
        names.append(f"{r}_ratio")
        names.append(f"{r}_count")
    names += ["hour", "minute", "hour_sin", "hour_cos", "total_events", "duration_sec", "has_door", "has_open", "is_night"]
    return names


def _save_comparison_chart(results: dict, best_name: str):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return

    names = list(results.keys()) + ["Rule-based"]
    accs = [results[n]["cv_mean"] for n in results] + [0.5512]
    colors = ["#2563eb" if n == best_name else "#94a3b8" for n in results] + ["#f59e0b"]

    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.barh(names, accs, color=colors, height=0.5)

    for bar, acc in zip(bars, accs):
        ax.text(bar.get_width() + 0.01, bar.get_y() + bar.get_height() / 2,
                f"{acc:.1%}", va="center", fontsize=11, fontweight="bold")

    ax.set_xlim(0, 1.0)
    ax.set_xlabel("Accuracy (5-fold CV)")
    ax.set_title("Rule-based vs ML Models — CASAS hh106 Activity Classification")
    ax.axvline(x=0.75, color="#dc2626", linestyle="--", linewidth=0.8, label="KPI Target (75%)")
    ax.legend(fontsize=9)
    plt.tight_layout()

    out = REPORT_DIR / "ml_comparison.png"
    plt.savefig(out, dpi=150)
    plt.close()
    print(f"Comparison chart saved: {out}")


if __name__ == "__main__":
    run()
