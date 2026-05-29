"""CASAS hh106 으로 사용자 위치 추정 모델 학습 (박주상 v3 설계 §1).

  python scripts/train_location_model.py

입력 : backend/data/casas/labeled/hh106.csv  (gitignored — 로컬/Windows 보관)
출력 : backend/app/ml/location_model.joblib   (모델 번들, git 추적)
       backend/app/ml/location_metrics.json   (정확도·5-fold CV·per-class, git 추적)

모델 : RandomForest (class_weight=balanced) — feature 는 features.FEATURE_NAMES.
평가 : stratified holdout accuracy + 5-fold CV(accuracy) + per-class P/R/F1.
KPI  : test accuracy >= 0.75, 5-fold CV >= 0.70 (ROADMAP).
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
CSV_PATH = BACKEND / "data" / "casas" / "labeled" / "hh106.csv"
MODEL_OUT = BACKEND / "app" / "ml" / "location_model.joblib"
METRICS_OUT = BACKEND / "app" / "ml" / "location_metrics.json"

MAX_SAMPLES = 60_000  # 속도 — stratified 서브샘플
RANDOM_STATE = 42


def main() -> None:
    import joblib
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import classification_report
    from sklearn.model_selection import cross_val_score, train_test_split

    import sys
    sys.path.insert(0, str(BACKEND))
    from app.ml.casas import load_casas_samples
    from app.ml.features import FEATURE_NAMES

    if not CSV_PATH.exists():
        raise SystemExit(
            f"CASAS 데이터 없음: {CSV_PATH}\n"
            "  Windows 에서: scp windows:C:/Users/yusun/projects/cleaning-context/"
            "backend/data/casas/labeled/hh106.csv backend/data/casas/labeled/"
        )

    print(f"[1/4] CASAS hh106 로드 — {CSV_PATH}")
    X, y = load_casas_samples(CSV_PATH)
    X = np.asarray(X, dtype=float)
    y = np.asarray(y)
    print(f"      샘플 {len(y):,} · feature {X.shape[1]} ({len(FEATURE_NAMES)})")
    dist = {r: int((y == r).sum()) for r in sorted(set(y))}
    print(f"      방 분포: {dist}")

    rng = np.random.default_rng(RANDOM_STATE)
    if len(y) > MAX_SAMPLES:
        idx = rng.choice(len(y), size=MAX_SAMPLES, replace=False)
        X, y = X[idx], y[idx]
        print(f"      서브샘플 → {len(y):,}")

    print("[2/4] 학습/평가 분할 + RandomForest 학습")
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    clf = RandomForestClassifier(
        n_estimators=200, max_depth=14, class_weight="balanced",
        random_state=RANDOM_STATE, n_jobs=-1,
    )
    clf.fit(X_tr, y_tr)

    test_acc = float(clf.score(X_te, y_te))
    print(f"      holdout accuracy = {test_acc:.4f}")

    print("[3/4] 5-fold CV")
    cv = cross_val_score(clf, X, y, cv=5, scoring="accuracy", n_jobs=-1)
    cv_mean, cv_std = float(cv.mean()), float(cv.std())
    print(f"      CV accuracy = {cv_mean:.4f} ± {cv_std:.4f}")

    report = classification_report(y_te, clf.predict(X_te), output_dict=True, zero_division=0)

    version = f"loc-rf-v3-{datetime.now():%Y%m%d}"
    metrics = {
        "model": "RandomForest(n_estimators=200, max_depth=14, balanced)",
        "version": version,
        "dataset": "CASAS hh106 (WSU, Zenodo CC BY 4.0, record 15708568)",
        "task": "user location estimation (5-class room)",
        "n_samples": int(len(y)),
        "n_features": int(X.shape[1]),
        "feature_names": FEATURE_NAMES,
        "test_accuracy": round(test_acc, 4),
        "cv5_accuracy_mean": round(cv_mean, 4),
        "cv5_accuracy_std": round(cv_std, 4),
        "per_class": {
            k: {m: round(v, 3) for m, v in d.items()}
            for k, d in report.items()
            if isinstance(d, dict)
        },
        "room_distribution": dist,
        "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "kpi_pass": bool(test_acc >= 0.75 and cv_mean >= 0.70),
    }

    print("[4/4] 저장")
    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {"model": clf, "classes": list(clf.classes_),
         "feature_names": FEATURE_NAMES, "version": version, "metrics": metrics},
        MODEL_OUT,
        compress=3,
    )
    METRICS_OUT.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"      모델: {MODEL_OUT}")
    print(f"      지표: {METRICS_OUT}")
    print(f"\nKPI {'통과' if metrics['kpi_pass'] else '미달'} — "
          f"test {test_acc:.1%}, CV {cv_mean:.1%}")


if __name__ == "__main__":
    main()
