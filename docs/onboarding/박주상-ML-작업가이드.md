# 박주상 — ML 설계·구현

## 현황 (2026-05-28)

5/27 PR #9로 [docs/CLEANING_DECISION_ALGORITHM.md](../CLEANING_DECISION_ALGORITHM.md) v3 설계 머지 완료. **ML 역할 = 사용자 위치(user_room) 추정 한 가지**로 좁힘.

기존 v2 (multi-label 이벤트 분류기, IoT 합성 99.3%)는 `archive/ml-v2/` 로 폐기. 전유성이 v2 백엔드 코드와 frontend ML 배지를 모두 정리했음.

## 발표 어필 포인트

**ML 설계 능력** — "데이터에 무엇을 시켜야 하는가"를 깨끗하게 정의한 것. 멀티 레이블 분류기를 폐기하고 위치 추정 한 가지에 집중한 의사결정. 박주상 v3 설계 문서가 그 자체로 발표 자료.

## 5/30 발표 산출물

| 산출물 | 상태 | 비고 |
|---|---|---|
| 설계 문서 `CLEANING_DECISION_ALGORITHM.md` | ✅ 머지 | 500줄, 발표 자료 직접 활용 |
| 위치 추정 분류기 학습 | 🔄 | v3 설계대로. KPI ≥ 75% |
| 평가 리포트 (confusion matrix·F1) | ⬜ | 발표 슬라이드에 1장 |

## D-2 작업 (5/28~30)

- [ ] 위치 추정 데이터셋 생성 (12 IoT 센서 → user_room 6-class)
- [ ] sklearn 모델 학습 (DecisionTree·RandomForest 비교)
- [ ] 평가 리포트 1장 생성 (정확도·confusion matrix)
- [ ] 발표 자료에 들어갈 1슬라이드 분량 텍스트·시각화 1개 준비

## 소유
ML 설계 문서 · 위치 추정 분류기 학습·평가 · ML 관련 발표 자료
