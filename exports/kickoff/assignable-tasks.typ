#import "briefing.typ": briefing, callout, kpi

#show: briefing.with(
  title: "배정 가능한 일 목록",
  subtitle: "팀 킥오프 — 김준성·박주상·조현서 배정용",
  meta: "2026-05-15 · 럭키 금성 · LG 가전 멘토링 트랙",
)

#callout[*용도.* 전유성이 김준성·박주상·조현서 3인에게 항목을 배정하는 메뉴. 각자 W2 (5/16~5/26) 동안 2\~3개 (\~6\~8h 분량) 가져간다. 전유성 본인이 맡는 frontend·backend·디자인·애니메이션·배포·리허설 시연은 제외. 자세한 항목 설명은 GitHub 레포 `docs/ASSIGNABLE_TASKS.md` 참조.]

== A. 시장·경쟁 조사 (비개발 OK)

#table(
  columns: (auto, 3fr, 1fr, auto),
  align: (center, left, center, center),
  [*ID*], [*항목*], [*예상*], [*난이도*],
  [A1], [한국 로봇청소기 시장 점유율 보강 — LG/삼성/로보락/에코백스 2024\~2025 점유율·매출·증감률. 표 + 출처 4건], [2h], [쉬움],
  [A2], [LG ThinQ·CodeZero AI 사례 디테일 — 슬라이드 7 인용 bullet 5개 + 스크린샷 1\~2장], [2h], [쉬움],
  [A3], [경쟁사 표 디테일 — 가격·사양·점유율·핵심 기능 5열 표 (LG/삼성/로보락/에코백스)], [1h], [쉬움],
  [A4], [Matter/HomeKit/Google Home 표준이 "제어 인터페이스만 정의한다" 근거 1\~2건 — 슬라이드 7 (C 프레이밍)], [1h], [쉬움],
)

== B. 페르소나·사용자 리서치 (비개발 OK)

#table(
  columns: (auto, 3fr, 1fr, auto),
  align: (center, left, center, center),
  [*ID*], [*항목*], [*예상*], [*난이도*],
  [B1], [메인 페르소나 1인 정의 — 이름·나이·직업·거주지(구체 동·아파트)·일상 루틴·페인 포인트. `docs/persona.md` 1페이지], [2h], [쉬움],
  [B2], [페르소나가 사는 아파트 도면 reference 1\~2개 (네이버부동산·다방·직방) + 평수·구조 메모], [1h], [쉬움],
  [B3], [인터뷰 5명 — "AI 자율 청소 모드 켰다 끄셨던 경험" + 후속 3문항. 룸메·동기 OK. 슬라이드 2 인용 quote 3개 추출], [3h], [중],
  [B4], [C 세그먼트 정량화 — "AI 자율 가전 끄고 수동 회귀 사용자 비율" 통계 1\~2건 (해외 OK)], [1h], [쉬움],
)

== C. 디자인·이미지 자산 (AI 도구 OK)

#table(
  columns: (auto, 3fr, 1fr, auto),
  align: (center, left, center, center),
  [*ID*], [*항목*], [*예상*], [*난이도*],
  [C1], [페르소나 사진 1장 (ChatGPT/Midjourney generate, isometric/line-drawing 톤)], [30분], [쉬움],
  [C2], [시나리오 4종 인포그래픽 — 슬라이드 5 데모 컷 백업용 4장], [2h], [중],
  [C3], [5-Layer 다이어그램 PPT용 일러스트 — 현재 사이트 SVG 정돈 버전], [1h], [중],
  [C4], [PPT 디자인 톤·템플릿 결정 — 마스터 + 표지/내지/마무리 3페이지 샘플], [2h], [중],
)

#pagebreak()

== D. 발표 PPT 8슬라이드 (W3, 5/27~5/30)

#table(
  columns: (auto, 3fr, 1fr, auto),
  align: (center, left, center, center),
  [*ID*], [*항목*], [*예상*], [*난이도*],
  [D1], [PPT 전체 리드 — Hook → 문제(B) → 포지셔닝(A) → 솔루션 5-Layer → 데모 → 데이터/ML → 확장성(C) → Closing], [8h 분산], [중],
  [D2], [슬라이드 5 데모 캡처 4장 + 캡션 (시나리오별)], [1h], [쉬움],
  [D3], [슬라이드 7 시장·확장성 — A1\~A4 자료 옮기기 (그래프 1 + 인용 + Matter 한 줄)], [2h], [중],
  [D4], [슬라이드 6 데이터·ML — 박주상 confusion matrix·정확도 차트 배치 + 캡션], [1h], [쉬움],
)

== E. ML 모델 (AI 전공 — 박주상 단독 권장)

#table(
  columns: (auto, 3fr, 1fr, auto),
  align: (center, left, center, center),
  [*ID*], [*항목*], [*예상*], [*난이도*],
  [E1], [UCI ADL 데이터셋 다운로드 + 전처리 — 시간 binning, occupancy → 이벤트 라벨], [3h], [중],
  [E2], [DecisionTree → RandomForest → GradientBoosting 비교 학습 — 75%↑ 정확도 KPI], [3h], [중],
  [E3], [Confusion matrix 이미지 — 슬라이드 6 직접 사용], [30분], [쉬움],
  [E4], [API 통합 `POST /api/classify-event` — FastAPI 새 엔드포인트], [1h], [중],
  [E5], [LLM 프롬프트 미세 조정 — `llm_explainer.py`·`ask.py` 프롬프트 검토, 시나리오별 톤 일관성], [2h], [중],
)

== F. 미팅·문서·운영 보조 (누구나)

#table(
  columns: (auto, 3fr, 1fr, auto),
  align: (center, left, center, center),
  [*ID*], [*항목*], [*예상*], [*난이도*],
  [F1], [멘토 질의 예상 리스트 보강 — `docs/DEMO_SCRIPT.md` Q&A 5종 → 10종 확장], [1h], [쉬움],
  [F2], [멘토 1차 미팅 (5/16 토 09:00) 회의록 — 발언 받아쓰기 + 액션 추출], [미팅 중], [쉬움],
  [F3], [리허설 진행 — 발표 3회 (5/27\~5/29) 시간 잡기 + 피드백 노트], [3h], [쉬움],
  [F4], [사업계획서 hwp 양식 변환 — 제출 양식이 hwp일 때만], [2h], [중],
)

== 우선순위 (배정 시 참고)

- *즉시 (멘토 미팅 5/16 직전):* F1
- *W2 핵심 (5/17\~5/26):* E1\~E4 (ML), A1\~A3 (시장), B1\~B3 (페르소나)
- *W2 후반 (5/22\~5/26):* B2 도면 → 전유성에게 인계, C1\~C3 (이미지 자산)
- *W3 (5/27\~5/30):* D1\~D4 (PPT), F3 (리허설)

== 배정 체크리스트

- 각자 W2 동안 *2\~3개* 항목 (\~6\~8h 분량)
- 각 항목 *마감일* 명시 (e.g., A1 → 5/20 수)
- *commit 단위* 로 push 약속
- 진행 어려우면 카톡 즉시 — 막힌 채로 마감일 가지 말 것
- 산출물은 `docs/` 하위 또는 PLANNING.md 직접 수정 (대형 자료는 `assets/`)
