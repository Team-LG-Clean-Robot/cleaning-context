# 박주상 작업 가이드 — ML 이벤트 분류기

> 작성: 2026-05-14 · 팀장 전유성 → 박주상
> 본 문서는 박주상이 **단독으로** M1~M6 ML 작업을 진행할 수 있도록 만든 가이드. 막히면 팀장에게 카톡.

---

## 1. 큰 그림 — 너는 우리 프로젝트의 "AI·데이터" 담당

우리 시뮬레이터는 사용자가 "현재 어떤 이벤트 (귀가/요리/취침 등) 인지" 를 직접 입력하면 청소 우선순위를 출력한다. 너의 작업은 **이 입력 자체를 자동화**하는 것 — 시간·요일·직전 occupancy 시퀀스만으로 "지금 사용자가 무슨 활동 중인지" 자동 추측하는 ML 분류기를 학습한다.

**왜 이게 중요한가**: 행사 키워드 *"데이터 활용"* 과 *"AI 실무 역량"* 에 답하는 메인 증거. 발표 슬라이드 6번 (데이터·ML 파트) 에 너의 결과물 (정확도·confusion matrix) 이 그대로 박힌다.

**KPI**: 테스트셋 정확도 **75% 이상**.

**작업 위치**: `team-project-lg/ml/` (신규 폴더, 네가 만들 것)

**예상 소요**: 약 6시간 (M1 1h · M2 2h · M3 2h · M4 1h · M5는 전유성이 받아서 1h)

---

## 2. 환경 셋업 (시작 전 한 번)

### 2.1 가상환경

```bash
cd team-project-lg
python -m venv ml/.venv
ml/.venv/Scripts/activate   # Windows
# 또는: source ml/.venv/bin/activate   # macOS/Linux

pip install pandas numpy scikit-learn matplotlib seaborn jupyter joblib
```

`requirements.txt` 작성:
```
pandas>=2.0
numpy>=1.26
scikit-learn>=1.4
matplotlib>=3.8
seaborn>=0.13
jupyter>=1.0
joblib>=1.3
```

### 2.2 폴더 구조 (네가 만들 것)

```
team-project-lg/ml/
├── .venv/                       # 가상환경 (git 추적 안 함)
├── requirements.txt
├── README.md                    # 너의 작업 노트
├── data/
│   ├── raw/                     # 다운로드한 원본 (git 추적 안 함)
│   └── processed/               # 전처리 결과 (선택적 추적)
├── notebooks/
│   ├── 01_explore.ipynb         # M2 데이터 탐색
│   └── 02_model_compare.ipynb   # M3·M4 모델 비교·평가
├── scripts/
│   ├── preprocess.py            # M2 자동화 스크립트
│   ├── train.py                 # M3 모델 학습
│   └── evaluate.py              # M4 평가·시각화
├── models/
│   └── {name}.joblib            # 학습된 모델 파일
└── reports/
    ├── metrics.json             # M4 정확도 지표 (발표용)
    ├── confusion_matrix.png     # M4 그래프 (발표 슬라이드 직접 사용)
    └── feature_importance.png   # M4 보조 그래프
```

### 2.3 `.gitignore` 추가 (팀장이 처리해줘도 됨)

```
ml/.venv/
ml/data/raw/
__pycache__/
*.pyc
```

---

## 3. 단계별 작업 — M1 ~ M4

### M1 · 데이터셋 선택·다운로드 (1h)

**핸드오프**: 김준성이 먼저 **공개 IoT 데이터셋 후보 3~5개를 조사해 비교표** (`docs/DATASET_CANDIDATES.md`) 를 작성한다. **너는 그 표를 보고 1개를 픽**. (김준성 가이드 §3.1 D1 참조)

**픽 기준**:
- 우리 5개 방·7개 이벤트와 매핑 가능한 라벨이 있나
- 시간 정보 (timestamp) 정밀도
- 데이터 양 (수백 건 이상)
- 라이선스 (CC/Apache/MIT/Public Domain OK)

**참고 1순위 후보** (김준성 표에 포함될 가능성 높음): UCI Machine Learning Repository — *"Activities of Daily Living Recognition Using Binary Sensors"*
- URL: https://archive.ics.uci.edu/dataset/271/...
- 라벨 명확 (cooking, sleeping, leaving, returning 등), 두 사용자 (Ordonez A, B) 약 2~3주치
- 우리 이벤트 정의와 매핑 쉬움

**할 일**:
1. 김준성 표에서 1개 픽 → 김준성에게 알림
2. (김준성이 매핑 제안서 `docs/DATASET_MAPPING.md` 작성 → 너에게 검토 요청)
3. 픽한 데이터셋 zip 다운로드 → `ml/data/raw/{dataset_name}/` 압축 해제
4. README.txt 읽고 컬럼 구조 확인
5. `ml/notebooks/01_explore.ipynb` 새로 만들어 첫 셀:
   ```python
   import pandas as pd
   df = pd.read_csv("../data/raw/uci_adl/OrdonezA_ADLs.txt", sep="\t")
   df.head(); df['activity'].value_counts()
   ```
6. 활동 라벨 종류·샘플 수 확인 → 김준성 매핑 제안서와 대조

**검증**: notebook 첫 셀이 데이터 로드 + activity 종류 출력. 김준성 매핑 제안서와 활동 라벨 일치 확인.

---

### M2 · 전처리 파이프라인 (2h)

**목표**: 원본 시계열을 ML이 학습 가능한 *"피처 벡터 → 라벨"* 형태로 변환.

**입력**: 원본 timestamp + activity 라벨
**출력**: 1시간 단위로 binning 된 DataFrame
```
| hour_of_day | day_of_week | prev_location_1h | prev_location_2h | prev_activity_1h | activity (라벨) |
|---|---|---|---|---|---|
| 8  | Mon | bedroom | bedroom | sleeping | breakfast |
| 9  | Mon | kitchen | bedroom | breakfast | leaving |
| ...
```

**핵심 작업**:
1. **시간 binning**: `df['hour'] = df['start_time'].dt.hour`. 1시간 단위로 그룹핑하고 각 시간대의 dominant activity 를 그 시간의 라벨로
2. **요일 피처**: `df['dow'] = df['start_time'].dt.dayofweek` (0=월, 6=일)
3. **직전 시퀀스**: `prev_activity_1h = df['activity'].shift(1)`, `prev_location_1h = df['location'].shift(1)`. shift(2) 도 추가
4. **라벨 매핑**: 김준성의 `docs/DATASET_MAPPING.md` 를 그대로 코드로 옮긴다. 매핑이 부족하거나 잘못된 부분 발견 시 김준성과 합의 후 수정.
   ```python
   # 김준성 매핑 제안서 기반
   ACTIVITY_MAP = {
       "Breakfast": "post_cooking", "Lunch": "post_cooking", "Dinner": "post_cooking",
       "Sleeping": "pre_sleep_30min",
       "Leaving": "going_out",
       "Returning": "user_returned",
       # ... DATASET_MAPPING.md 참조
   }
   df['label'] = df['activity'].map(ACTIVITY_MAP).fillna("other")
   ```
5. NaN 행 (`prev_*` 가 없는 첫 행들) 제거
6. 결과를 `ml/data/processed/features.csv` 저장

**산출물**:
- `scripts/preprocess.py` — 원본 → `data/processed/features.csv`
- `notebooks/01_explore.ipynb` — 시각화 (시간대별 activity 분포 등) → 발표 슬라이드 6에 사용 가능

**검증**:
- `features.csv` 행 수 100개 이상
- 라벨 클래스 4~7개 (너무 많으면 작은 클래스 묶음)
- `df['label'].value_counts()` 으로 클래스 불균형 확인

---

### M3 · 모델 학습·비교 (2h)

**목표**: 3가지 분류 모델 학습·비교 → 가장 좋은 것 픽.

**`scripts/train.py` 또는 `notebooks/02_model_compare.ipynb`**:

```python
import pandas as pd, joblib, json
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

df = pd.read_csv("../data/processed/features.csv")

# 카테고리 피처 인코딩
cat_cols = ['day_of_week', 'prev_location_1h', 'prev_location_2h', 'prev_activity_1h']
for c in cat_cols:
    df[c] = LabelEncoder().fit_transform(df[c].astype(str))

X = df[['hour_of_day'] + cat_cols]
y_enc = LabelEncoder()
y = y_enc.fit_transform(df['label'])

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

models = {
    "decision_tree": DecisionTreeClassifier(max_depth=10, random_state=42),
    "random_forest": RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42),
    "gradient_boost": GradientBoostingClassifier(n_estimators=150, max_depth=5, random_state=42),
}

scores = {}
for name, model in models.items():
    cv = cross_val_score(model, X_tr, y_tr, cv=5).mean()
    model.fit(X_tr, y_tr)
    test_acc = model.score(X_te, y_te)
    scores[name] = {"cv_mean": cv, "test_accuracy": test_acc}
    joblib.dump(model, f"../models/{name}.joblib")
    print(f"{name}: CV {cv:.3f} / Test {test_acc:.3f}")

# 라벨 인코더도 저장 (API 통합 시 필요)
joblib.dump(y_enc, "../models/label_encoder.joblib")

with open("../reports/metrics.json", "w") as f:
    json.dump(scores, f, indent=2)
```

**산출물**:
- `models/decision_tree.joblib` · `random_forest.joblib` · `gradient_boost.joblib` · `label_encoder.joblib`
- `reports/metrics.json`

**검증**: 세 모델 중 최소 하나가 test accuracy 75% 이상.

---

### M4 · 평가·시각화 (1h)

**목표**: 발표 슬라이드 6번에 박을 그래프 생성.

**`scripts/evaluate.py`**:

```python
import joblib, json
import matplotlib.pyplot as plt, seaborn as sns
import pandas as pd
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.preprocessing import LabelEncoder

df = pd.read_csv("../data/processed/features.csv")
# (M3와 동일 전처리)
# ... X, y 준비 + 동일 split

BEST = "random_forest"  # M3 결과 가장 높았던 것
model = joblib.load(f"../models/{BEST}.joblib")
y_enc = joblib.load("../models/label_encoder.joblib")

y_pred = model.predict(X_te)
labels = y_enc.classes_

# Confusion matrix
cm = confusion_matrix(y_te, y_pred)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', xticklabels=labels, yticklabels=labels, cmap='Blues')
plt.xlabel("Predicted"); plt.ylabel("Actual")
plt.title(f"{BEST} — Confusion Matrix")
plt.tight_layout()
plt.savefig("../reports/confusion_matrix.png", dpi=150)

# Classification report
report = classification_report(y_te, y_pred, target_names=labels, output_dict=True)
with open("../reports/classification_report.json", "w") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

# Feature importance (옵션)
if hasattr(model, "feature_importances_"):
    importances = pd.Series(model.feature_importances_, index=X_te.columns).sort_values()
    importances.plot(kind='barh', figsize=(6, 4))
    plt.title("Feature Importance")
    plt.tight_layout()
    plt.savefig("../reports/feature_importance.png", dpi=150)
```

**산출물 (발표에 사용)**:
- `reports/confusion_matrix.png` ← 슬라이드 6 메인 그래프
- `reports/classification_report.json` ← 클래스별 precision/recall (슬라이드 6 표)
- `reports/feature_importance.png` ← 보조 그래프 (옵션)

---

## 4. 모델 ↔ API 인터페이스 계약 (M5 — 전유성이 받음)

너의 학습 결과를 전유성이 백엔드에 통합 (P1-7). **이 계약을 지켜야 매끄럽게 연결됨**.

### 입력 (API → 모델)

전유성의 백엔드는 너에게 다음 JSON 을 줄 예정:

```json
{
  "hour_of_day": 19,
  "day_of_week": 1,
  "prev_location_1h": "bedroom",
  "prev_location_2h": "kitchen",
  "prev_activity_1h": "post_cooking"
}
```

### 출력 (모델 → API)

분류기는 다음 형태를 반환:

```json
{
  "predicted_event": "user_returned",
  "confidence": 0.78,
  "top_3": [
    {"event": "user_returned", "prob": 0.78},
    {"event": "post_cooking",  "prob": 0.12},
    {"event": "going_out",     "prob": 0.05}
  ]
}
```

**중요**: `predicted_event` 의 값은 반드시 **우리 백엔드의 `events.json` 에 있는 ID** 와 일치해야 함 (rain · user_returned · post_cooking · pre_sleep_30min · guest_arrival · post_exercise · going_out). 라벨 매핑 (M2 §4) 에서 이미 처리.

### 산출물 위치 (전유성이 가져갈 곳)

```
team-project-lg/ml/models/best_model.joblib       ← 가장 정확도 높은 모델 (이름 통일)
team-project-lg/ml/models/label_encoder.joblib
team-project-lg/ml/reports/metrics.json
```

**M3 끝나면 `cp models/random_forest.joblib models/best_model.joblib` (또는 가장 좋았던 것) 로 복사**. 전유성이 `best_model.joblib` 만 보면 됨.

### 예측 함수 명세 (참고용 — 전유성이 백엔드에 작성)

```python
# 전유성이 backend/app/services/event_classifier.py 에 작성 예정
import joblib

_model = joblib.load("../ml/models/best_model.joblib")
_label_enc = joblib.load("../ml/models/label_encoder.joblib")

def predict_event(features: dict) -> dict:
    """features = {hour_of_day, day_of_week, prev_location_1h, ...}"""
    X = preprocess(features)   # 카테고리 인코딩 동일
    probs = _model.predict_proba([X])[0]
    top_idx = probs.argsort()[::-1][:3]
    return {
        "predicted_event": _label_enc.inverse_transform([top_idx[0]])[0],
        "confidence": float(probs[top_idx[0]]),
        "top_3": [
            {"event": _label_enc.inverse_transform([i])[0], "prob": float(probs[i])}
            for i in top_idx
        ]
    }
```

> 카테고리 인코딩 (LabelEncoder fit 상태) 보존을 위해 **`label_encoder.joblib` 뿐 아니라 cat 컬럼별 인코더도 함께 저장** 권장. 단순화: 전처리 함수를 `ml/scripts/inference_preprocess.py` 에 별도 파일로 두고 전유성이 import.

---

## 5. M6 (선택·여유 시) — 가중치 calibration

UCI ADL 데이터로부터 *시간대별 공간 사용 빈도* 를 추출해, 우리 `events.json` 의 가중치 prior 로 보정. 변경 내역·근거를 `docs/WEIGHT_CALIBRATION.md` 에 기록.

**우선순위 낮음**. M1~M4 마무리 + 발표 자료 완성 후에만 진행.

---

## 6. 막혔을 때 — Claude/ChatGPT 활용법

| 상황 | 어떻게 물어보나 |
|---|---|
| UCI ADL 파일 포맷이 이해 안 됨 | "UCI Activities of Daily Living Ordonez dataset columns explained, with example head() output" |
| 라벨 매핑이 막힘 (UCI 활동 → 우리 이벤트) | "Map UCI ADL activities (Breakfast, Sleeping, Leaving...) to these 7 events: rain, user_returned, post_cooking, pre_sleep_30min, guest_arrival, post_exercise, going_out. Suggest mapping" |
| 정확도가 60%대에 머무름 | "RandomForestClassifier accuracy 60%, target 75%. Suggest feature engineering for time-series occupancy data" — 보통 답: rolling window 추가, 더 긴 prev_*N 시퀀스, hour cyclic encoding (sin/cos) |
| 코드 에러 | 에러 메시지 그대로 붙여넣고 "Python sklearn version: 1.4. Fix this error" |
| confusion matrix 이쁘게 그리고 싶음 | "Seaborn heatmap confusion matrix with Korean labels, dpi 150, blue colormap" |

**중요**: AI 가 생성한 코드는 *반드시 직접 실행해서 동작 검증*. 그냥 복붙해서 발표 자료에 박지 말 것.

---

## 7. 발표 슬라이드 6번 — 너의 산출물이 들어갈 곳

김준성이 PPT 리드 (P2-10) 하지만, 슬라이드 6번은 **네가 채워서 김준성에게 넘김**.

슬라이드 6에 들어갈 것:
1. 데이터셋 소개 한 줄 (UCI ADL, N명, N일치, N개 activity)
2. 전처리 후 데이터 모습 (M2 의 시각화 이미지 1장 — 시간대별 activity 분포 등)
3. 모델 비교 표 (M3 의 `metrics.json` 을 표로)
4. **Confusion matrix 이미지** (M4 의 `confusion_matrix.png` — 메인)
5. 한 줄 인사이트 ("Random Forest 가 78% 정확도. 라벨 X와 Y 가 헷갈리는 패턴 발견 — 이유는 ...")

---

## 8. 일정 한눈에

| 날짜 | 할 일 |
|---|---|
| 5/14 (수) 저녁 | 팀 킥오프 미팅 (이 문서 받음) |
| 5/15 ~ 5/16 (금토) | 환경 셋업 + UCI ADL 다운로드만 (M1) |
| 5/16 (토) 09:00 | 멘토 1차 미팅 참석 |
| 5/17 ~ 5/19 (일~화) | M2 전처리 (2h) |
| 5/20 ~ 5/21 (수~목) | M3 모델 학습·비교 (2h) |
| 5/22 (금) | M4 평가·시각화 (1h) → `best_model.joblib` 위치 확정 |
| 5/23 (토) | 팀장 (전유성) 에게 알림 → P1-7 (API 통합) 진입 |
| 5/24 ~ 5/26 | 발표 슬라이드 6번 콘텐츠 작성 |
| 5/27 ~ 5/29 | 리허설 |
| 5/30 (금) | **최종 발표** |

---

## 9. 산출물 체크리스트 (최종)

- [ ] `ml/data/raw/uci_adl/*` — 원본 데이터셋
- [ ] `ml/data/processed/features.csv` — 전처리 결과
- [ ] `ml/scripts/preprocess.py` · `train.py` · `evaluate.py`
- [ ] `ml/notebooks/01_explore.ipynb` · `02_model_compare.ipynb`
- [ ] `ml/models/best_model.joblib` · `label_encoder.joblib`
- [ ] `ml/reports/metrics.json` · `classification_report.json`
- [ ] `ml/reports/confusion_matrix.png` · `feature_importance.png` (옵션)
- [ ] `ml/README.md` — 작업 요약 (3~5줄)
- [ ] 슬라이드 6번 콘텐츠 (김준성에게 전달)

---

> **연락**: 막힘·질문은 팀톡 또는 카톡 (팀장 전유성). 인터페이스 계약 (§4) 변경 필요하면 먼저 팀장과 협의.
