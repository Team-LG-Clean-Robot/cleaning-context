"""
CASAS hh106 데이터셋 기반 Rule-based 추론 검증.

CASAS 센서(8개 방 위치 기반 모션/도어) → 우리 13규칙 매핑 → 정확도 산출.

사용법:
    cd backend && python analysis/casas_validation.py

출력: reports/casas_metrics.json + reports/confusion_matrix.png
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "casas" / "labeled" / "hh106.csv"
REPORT_DIR = PROJECT_ROOT / "reports"

# ── CASAS 센서 위치 → 우리 방 매핑 ─────────────────────────────

LOCATION_TO_ROOM = {
    "Kitchen":      "kitchen",
    "LivingRoom":   "living",
    "Bedroom":      "bedroom",
    "Bathroom":     "bathroom",
    "OutsideDoor":  "entrance",
    "DiningRoom":   "dining",    # 식당은 별도 (cooking_done 판별용)
    "WorkArea":     "living",
    "LoungeChair":  "living",
}

# ── CASAS 활동 → 우리 이벤트 매핑 ──────────────────────────────

ACTIVITY_TO_EVENT = {
    "Cook_Breakfast":      "cooking_active",
    "Cook_Lunch":          "cooking_active",
    "Cook_Dinner":         "cooking_active",
    "Cook":                "cooking_active",
    "Eat_Breakfast":       "cooking_done",
    "Eat_Lunch":           "cooking_done",
    "Eat_Dinner":          "cooking_done",
    "Eat":                 "cooking_done",
    "Wash_Breakfast_Dishes":"cooking_done",
    "Wash_Lunch_Dishes":   "cooking_done",
    "Wash_Dinner_Dishes":  "cooking_done",
    "Wash_Dishes":         "cooking_done",
    "Sleep":               "pre_sleep",
    "Go_To_Sleep":         "pre_sleep",
    "Enter_Home":          "user_returned",
    "Leave_Home":          "user_left",
    "Watch_TV":            "tv_watching",
    "Entertain_Guests":    "entertain_guests",
    "Bathe":               "recent_shower",
    "Personal_Hygiene":    "recent_shower",
}

MAPPED_EVENTS = sorted(set(ACTIVITY_TO_EVENT.values()))


def parse_line(line: str) -> dict | None:
    parts = line.strip().split(",")
    if len(parts) < 4:
        return None
    try:
        date_str, time_str, location, value = parts[0], parts[1], parts[2], parts[3]
        activity = None
        for p in parts[4:] if len(parts) > 4 else []:
            if '="begin"' in p:
                activity = p.split("=")[0]
            elif '="end"' not in p and p not in ("", "begin", "end"):
                activity = p
        time_clean = time_str.split(".")[0]
        ts = datetime.strptime(f"{date_str} {time_clean}", "%Y-%m-%d %H:%M:%S")
        return {"ts": ts, "location": location, "value": value, "activity": activity}
    except (ValueError, IndexError):
        return None


def infer_from_window(events: list[dict]) -> str | None:
    if not events:
        return None

    room_counts: Counter = Counter()
    has_door = False
    door_first_half = 0
    door_second_half = 0
    mid = len(events) // 2

    for i, e in enumerate(events):
        room = LOCATION_TO_ROOM.get(e["location"])
        if room:
            room_counts[room] += 1
        if e["location"] == "OutsideDoor":
            has_door = True
            if i < mid:
                door_first_half += 1
            else:
                door_second_half += 1

    total = sum(room_counts.values())
    if total == 0:
        return None

    kitchen_n = room_counts.get("kitchen", 0)
    dining_n = room_counts.get("dining", 0)
    bedroom_n = room_counts.get("bedroom", 0)
    bathroom_n = room_counts.get("bathroom", 0)
    entrance_n = room_counts.get("entrance", 0)
    living_n = room_counts.get("living", 0)

    kitchen_r = kitchen_n / total
    dining_r = dining_n / total
    bedroom_r = bedroom_n / total
    bathroom_r = bathroom_n / total
    entrance_r = entrance_n / total
    living_r = living_n / total
    hour = events[0]["ts"].hour

    # ── 1순위: 도어 이벤트 (귀가/외출) ──
    if has_door and entrance_r > 0.15:
        # 도어가 앞쪽 → 귀가 (들어온 뒤 집 안 활동)
        # 도어가 뒤쪽 → 외출 (집 안 활동 후 나감)
        if door_first_half >= door_second_half:
            indoor = kitchen_n + living_n + bedroom_n + dining_n
            if indoor > entrance_n:
                return "user_returned"
        return "user_left"

    # ── 2순위: 욕실 (샤워/위생) ──
    if bathroom_r >= 0.4 and bathroom_n >= 2:
        return "recent_shower"

    # ── 3순위: 침실 + 야간 (수면) ──
    if bedroom_r > 0.5 and (hour >= 20 or hour <= 7):
        return "pre_sleep"

    # ── 4순위: 주방 전용 (요리 중) ──
    if kitchen_r >= 0.55 and dining_r < 0.15 and total >= 3:
        return "cooking_active"

    # ── 5순위: 식당 또는 주방+식당 혼합 (식사/설거지) ──
    if dining_r >= 0.2 or (kitchen_r >= 0.2 and dining_r >= 0.1):
        return "cooking_done"
    if kitchen_r >= 0.3 and living_r >= 0.2 and total >= 3:
        return "cooking_done"

    # ── 6순위: 거실 우세 (TV 시청) ──
    if living_r >= 0.6 and total >= 4:
        return "tv_watching"

    # ── 7순위: 현관+거실 (손님) ──
    if entrance_r > 0.05 and living_r > 0.3 and total >= 5:
        return "entertain_guests"

    return "unknown"


def run():
    print("=" * 60)
    print("CASAS hh106 → Rule-based 추론 검증")
    print("=" * 60)

    if not DATA_PATH.exists():
        print(f"ERROR: {DATA_PATH} not found")
        return

    records = []
    with open(DATA_PATH, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            r = parse_line(line)
            if r:
                records.append(r)

    print(f"Parsed records: {len(records):,}")

    # 활동 분포
    act_dist = Counter(r["activity"] for r in records if r["activity"])
    print(f"\nLabeled activities: {sum(act_dist.values()):,} events, {len(act_dist)} types")
    for a, c in act_dist.most_common(15):
        mapped = ACTIVITY_TO_EVENT.get(a, "-")
        print(f"  {a:30s} -> {mapped:20s} ({c:,})")

    # 활동 구간 추출 (begin~end 사이 이벤트 묶기)
    print("\nExtracting activity segments...")
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

    print(f"Activity segments: {len(segments):,}")

    # 추론 + 평가
    y_true = []
    y_pred = []

    for act_name, events in segments:
        true_event = ACTIVITY_TO_EVENT[act_name]
        predicted = infer_from_window(events)
        y_true.append(true_event)
        y_pred.append(predicted or "unknown")

    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    total = len(y_true)
    accuracy = correct / total if total > 0 else 0

    print(f"\n{'=' * 50}")
    print(f"Overall Accuracy: {accuracy:.1%} ({correct}/{total})")
    print(f"{'=' * 50}")

    # Per-class metrics
    all_events = sorted(set(y_true))
    per_class = {}

    for event in all_events:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == event and p == event)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != event and p == event)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == event and p != event)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        support = sum(1 for t in y_true if t == event)
        per_class[event] = {"precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3), "support": support}
        print(f"  {event:20s}  P={precision:.3f}  R={recall:.3f}  F1={f1:.3f}  (n={support})")

    # Confusion matrix
    all_labels = sorted(set(y_true + y_pred))
    confusion = {t: {p: 0 for p in all_labels} for t in all_labels}
    for t, p in zip(y_true, y_pred):
        confusion[t][p] += 1

    _save_confusion_matrix(all_labels, y_true, y_pred)

    # JSON 결과 저장
    result = {
        "dataset": "CASAS hh106 (Zenodo, CC BY 4.0)",
        "source": "https://zenodo.org/records/15708568",
        "description": "Washington State Univ. — 단일 거주자 스마트홈, 8개 방, 36개 활동 라벨",
        "total_records": len(records),
        "activity_segments": len(segments),
        "overall_accuracy": round(accuracy, 4),
        "mapped_rules": [
            "R-RETURN-1 (OutsideDoor → user_returned)",
            "R-LEFT-1 (OutsideDoor → user_left)",
            "R-COOK-ACTIVE-1 (Kitchen 60%+ → cooking_active)",
            "R-COOK-DONE-1 (Kitchen→Living 전환 → cooking_done)",
            "R-SLEEP-30M-1 (Bedroom + 야간 → pre_sleep)",
            "R-SHOWER-1 (Bathroom 50%+ → recent_shower)",
            "R-TV-WATCH-1 (LivingRoom 70%+ → tv_watching)",
            "R-GUEST-1 (OutsideDoor + LivingRoom → entertain_guests)",
        ],
        "unmapped_rules": [
            "R-RAIN-1 (weather API — 센서 없음)",
            "R-FRIDGE-MEAL-1 (냉장고 개폐 — 센서 없음)",
            "R-COOK-ACTIVE-2 (전자레인지 — 센서 없음)",
            "R-SLEEP-2H-1 (bed_sensor — 센서 없음)",
            "R-USER-LOC-1 (위치 힌트 — 직접 평가 대상 아님)",
        ],
        "per_class_metrics": per_class,
        "confusion_matrix": confusion,
        "analysis_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REPORT_DIR / "casas_metrics.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\nMetrics saved: {out_path}")


def _save_confusion_matrix(labels, y_true, y_pred):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("matplotlib not available — skipping PNG")
        return

    n = len(labels)
    idx = {l: i for i, l in enumerate(labels)}
    mat = np.zeros((n, n), dtype=int)
    for t, p in zip(y_true, y_pred):
        mat[idx[t]][idx[p]] += 1

    fig, ax = plt.subplots(figsize=(10, 8))
    im = ax.imshow(mat, cmap="Blues")
    short = [l.replace("user_", "u_").replace("cooking_", "ck_").replace("recent_", "r_")[:14] for l in labels]
    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(short, rotation=45, ha="right", fontsize=8)
    ax.set_yticklabels(short, fontsize=8)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual (Ground Truth)")
    ax.set_title("Rule-based Inference vs CASAS Ground Truth (hh106)")

    for i in range(n):
        for j in range(n):
            v = mat[i][j]
            if v > 0:
                color = "white" if v > mat.max() * 0.5 else "black"
                ax.text(j, i, str(v), ha="center", va="center", color=color, fontsize=7)

    plt.colorbar(im)
    plt.tight_layout()
    out = REPORT_DIR / "confusion_matrix.png"
    plt.savefig(out, dpi=150)
    plt.close()
    print(f"Confusion matrix saved: {out}")


if __name__ == "__main__":
    run()
