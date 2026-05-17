# 박주상 — 작업 가이드 (ML 분류기 · LLM 프롬프트)

> 작성: 2026-05-17 (피벗 반영본) · 팀장 전유성 → 박주상. 막히면 카톡.

---

## 우리 프로젝트 한 줄

**IoT 멀티센서로 생활 맥락을 추론**하고 로봇청소기가 청소 우선순위를 결정·**설명**하는 시뮬레이터. 웹 + 모바일 두 클라이언트. LG전자 가전 멘토링 (성균관대 AI Intensive), **최종 발표 2026-05-30**.

피벗 (5/16 멘토 1차):
- 사용자 명시 이벤트 7개 → **12 IoT 센서 + 13 추론 규칙** Sensor Layer 추가
- **너의 ML 모델 입출력이 바뀜**: (raw 센서 readings) → (event labels). UCI ADL 학습 패턴과 자연스럽게 일치.

전체 그림: `README.md` → `docs/IOT_DOMAIN.md` (네가 가장 자주 볼 문서) → `TECHNICAL_PLAN.md §3`.

---

## 너의 역할 — 두 축

| 영역 | 무엇을 | 산출물 위치 |
|---|---|---|
| **A. ML 이벤트 분류기** | 공개 데이터셋 → 학습 → `event_classifier.joblib` → `/api/infer-events`에 통합 (rule fallback 유지) | `backend/models/` · `backend/scripts/train_classifier.py` |
| **B. LLM 프롬프트** | 한국어 톤·길이·상황별 출력 검토 + 6 시나리오 캐시 재시드 | `backend/app/services/llm.py` · `backend/scripts/seed_cache.py` |

**본 프로젝트의 데이터·AI 실무 역량 증명 파트**. 발표에서 정확도·confusion matrix 직접 발표.

## 이번 주 (W2: 5/20~26) 할 일

| # | 항목 | 산출물 | 예상 KPI |
|---|---|---|---|
| 1 | UCI ADL Ordonez 데이터셋 다운로드 + 우리 12 센서 매핑 노트 | `backend/scripts/dataset_mapping.md` + raw 데이터 `backend/data_raw/` (gitignored) | 매핑 표 12행 |
| 2 | 전처리 파이프라인 — 시간 binning, 공간 occupancy → 이벤트 라벨 | `backend/scripts/preprocess.py` | train/test split 산출 |
| 3 | 모델 학습·평가 (DecisionTree → RandomForest → GB) | `backend/models/event_classifier.joblib` + `backend/reports/metrics.json` | **정확도 ≥75%, 5-fold CV ≥70%** |
| 4 | `/api/infer-events` 통합 (전유성 협업) — ML 1st, rule fallback | endpoint 응답에 `source: "ml" \| "rule"` 필드 | rule 결과와 일치율 ≥60% |
| 5 | (여유 있으면) LLM 프롬프트 톤 검토 + 6 시나리오 캐시 재시드 | `cached_responses/*.json` 6개 | — |

## 막히면

- IoT 센서·이벤트 정의: `docs/IOT_DOMAIN.md` 가 단일 출처
- 데이터셋 후보 비교 필요하면 → **조현서**에게 요청 (Gemini CLI로 후보 3개 비교 리포트 받기)
- `/api/infer-events` 인터페이스 변경하고 싶으면 → 전유성과 먼저 합의 (모바일·웹 양쪽 영향)
- 학습 환경: `backend/.venv` 안에서 (`pip install scikit-learn pandas` 등 — `pyproject.toml`에 추가)
- 정확도 75% 못 넘으면: **임의로 KPI 낮추지 말 것**. feature engineering · 다른 데이터셋 후보로 회귀. 안 되면 토론
