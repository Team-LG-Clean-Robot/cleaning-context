"""ML 위치 추정 (박주상 v3 설계).

ML은 `user_room` 한 가지만 추정한다 (docs/CLEANING_DECISION_ALGORITHM.md §1).
- features.py  : CASAS 학습 / 런타임 SensorReading 공통 feature 추출
- estimator.py : 런타임 위치 추정 + confidence fallback (§1.3)
- casas.py     : CASAS hh106 → (X, y) 학습 데이터 (offline, 학습 시에만)

모델 아티팩트: app/ml/location_model.joblib (scripts/train_location_model.py 로 생성)
"""
