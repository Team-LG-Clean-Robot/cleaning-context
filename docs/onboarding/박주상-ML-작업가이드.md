# 박주상 — ML Result Owner

## 직무
Sensor → Event 추론을 ML로 만들어 정확도 KPI 달성하고 발표에서 본인이 직접 설명.

## ML이 우리 프로젝트에서 어디 들어가는가
```
[IoT 센서 raw]                    ← 12개 센서 시계열
   ↓
[ML 분류기 (네가 만듦)]            ← 공개 활동 데이터셋으로 학습
   ↓
[Event 라벨 + confidence]
   ↓ (실패 시 rule fallback)
[Rule scoring]                     ← 결정론적, ML 안 닿음
   ↓
[LLM 설명]                         ← 자연어, ML 안 닿음
```

너의 ML은 **Sensor → Event 추론**만 담당. scoring·LLM 설명에는 절대 안 닿음 (그 둘은 결정론·캐시 보호 영역).

## 메인 산출물
- 학습 모델 (`backend/models/event_classifier.joblib`)
- 메트릭 리포트 (`backend/reports/metrics.json` — 정확도·CV·confusion matrix·feature importance)
- `/api/infer-events` ML 통합 (전유성 협업)

## 소유 / 소유 X
- **소유**: 학습 데이터 발굴·다운로드·매핑 · 전처리 · 학습·평가 · LLM 프롬프트 톤 튜닝 · 캐시 재시드
- **소유 X**: 시뮬·시연용 데이터 (김준성, 별개) · 사업·시장 · 프론트·배포
- **학습용 데이터는 본인 책임**: 김준성 시뮬 데이터와 분리. UCI ADL Ordonez 등 본인 발굴

## 성공 지표
- **정확도 ≥75% / 5-fold CV ≥70%**
- 발표에서 confusion matrix·feature importance 직접 설명

## Plan B
문제 생기면 "rule + LLM" 중심으로 가고, ML은 "공개 데이터셋을 우리 12 센서로 매핑하는 과정에서 학부 프로젝트 데이터 양 한계로 KPI 미달" 프레이밍. 억지로 숫자 만들지 말 것.
