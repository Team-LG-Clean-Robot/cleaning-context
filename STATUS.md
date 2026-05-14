# 팀 럭키 금성 — 현황 & 액션 아이템

> 최종 갱신: 2026-05-14 (3차 세션 종료)
> 본 문서는 팀 내부용. 멘토 첫 미팅 전 공유 자료.

## 라이브 데모

- **프론트**: https://cleaning-context.vercel.app/
- **백엔드 헬스체크**: https://cleaning-context-backend.onrender.com/api/health

## 다가오는 마일스톤

| 일정 | 항목 | 비고 |
|---|---|---|
| **2026-05-14 (수) 저녁** | 팀 킥오프 미팅 | 본 STATUS.md 공유, 역할 재확인 |
| **2026-05-16 (토) 오전** | 멘토 1차 미팅 | Live URL 시연, 피드백 수집 |
| 2026-05-26 (월) | 2주차 마감 — 시나리오 4종 + 작동 데모 안정화 | |
| 2026-05-30 (금) | 최종 발표 | 발표 자료 + 라이브 데모 + 백업 영상 |

---

## 현재까지 완료된 것

### 사업·기획
- ✅ 주제 픽스 — "생활 맥락을 이해하는 로봇청소기 시뮬레이터"
- ✅ `PLANNING.md` 14섹션 사업계획서 v2 + 시장 출처 4건 (Virtue / Strategic Market Research / TBRC / Grand View)
- ✅ 설계 문서 5종 — `docs/{TECH_STACK,PRD,TRD,SCORING_RULES,MOCK_DATA_SCHEMA}.md`
- ✅ Typst 기반 사업계획서 PDF (`exports/planning-v2/`)

### 백엔드 (FastAPI · Python 3.12)
- ✅ FastAPI + Pydantic v2 셋업 (`backend/app/`)
- ✅ 5개 방 / 7개 이벤트 / 4개 시나리오 / 스코어링 룰 JSON 시드
- ✅ `compute_scores` 결정론적 점수 엔진 — golden test 모든 시나리오 일치
- ✅ LLM 설명 생성 (Timely GPT bridge, gpt-4o-mini) + 디스크 캐시
- ✅ 캐시 시드 4종 commit — 발표 중 LLM 장애 시 즉시 응답
- ✅ Pydantic 검증 (HH:MM 형식, user_location 화이트리스트, 이벤트 ID 존재)
- ✅ `POST /api/simulate` (preset + custom 두 경로) / `GET /api/scenarios` / `GET /api/events` / `GET /api/health`
- ✅ pytest 24/24 pass

### 프론트엔드 (Next.js 15 · TypeScript · Tailwind v4)
- ✅ 디자인 토큰(`@theme`) — paper / ink / lg-red / gold / line
- ✅ Pretendard Variable + JetBrains Mono
- ✅ `HouseMap` SVG 평면도 — 5개 방 빈틈 없이 외벽 채움, 가구 힌트, 사용자 사람 아이콘, heatmap, 제외 방 빗금
- ✅ `MethodologyCard` — 5-Layer 처리 흐름 SVG + Rule/LLM 역할 분리 2-column 표 (접기/펼치기)
- ✅ `ScenarioPanel` — 4개 카드 + 시각·취침·이벤트 chip 노출
- ✅ `CustomModePanel` — 직접 입력 (시간·위치·이벤트 chip 다중선택·예시 복원)
- ✅ `PriorityList` — 모드 뱃지(○일반/◐저소음/⏱지연/✕제외)
- ✅ `ExplanationCard` — LLM 본문 + "왜?" details 토글(점수 breakdown)
- ✅ `LoadingSkeleton` + race condition guard(`RequestSequencer`)
- ✅ a11y — H1 1개, lang=ko, SVG role=img + aria-label, 색 대비 AA 통과
- ✅ OG 메타데이터 + 동적 favicon

### 배포
- ✅ Render — `cleaning-context-backend.onrender.com`, render.yaml blueprint
- ✅ Vercel — `cleaning-context.vercel.app`
- ✅ Github push (main 브랜치)

---

## 남은 작업

### 우선순위 P0 — 멘토 미팅 (2026-05-16) 전
| # | 항목 | 담당 | 예상 |
|---|---|---|---|
| 1 | **HouseMap 가구-텍스트 겹침 해소** | 전유성 | 1h |
| 2 | 4 시나리오 + 직접 입력 모드 시연 시나리오 준비 (말로 설명할 흐름) | 전유성 | 30분 |
| 3 | 멘토 질의 예상 리스트 + 답변 준비 | 전유성·박주상 | 1h |

### 우선순위 P1 — 멘토 미팅 후 ~ 2주차 끝 (2026-05-26)
| # | 항목 | 담당 | 예상 |
|---|---|---|---|
| 4 | **ML 이벤트 분류기** — 별도 plan mode (M1~M6) | 박주상 (이론) + 전유성 (API 통합) | ~6h |
| 5 | 공개 IoT 데이터셋 선정·다운로드 (UCI ADL 권장) | 박주상 | 1h |
| 6 | 데이터 전처리 파이프라인 (시간 binning, 공간 occupancy → 이벤트 라벨) | 박주상 | 2h |
| 7 | 모델 학습·평가 (75%↑ 정확도 KPI) | 박주상 | 2h |
| 8 | 시장 분석 추가 보강 (LG·삼성 가전 출시 사례, 가전 시장 한국 점유율) | 김준성 | 2h |
| 9 | 경쟁사 표 데이터 디테일 (LG CodeZero AI·삼성 비스포크·로보락 사양/가격) | 김준성 | 1h |

### 우선순위 P2 — 3주차 (2026-05-25 ~ 2026-05-30)
| # | 항목 | 담당 |
|---|---|---|
| 10 | 발표 PPT 8슬라이드 작성 (스토리 + Methodology + 데모 캡처 + ML 결과 + 시장 + Closing) | 김준성 (리드) + 전체 |
| 11 | 라이브 데모 백업 영상 녹화 | 전유성 |
| 12 | 발표 리허설 (3회 이상) | 전체 |
| 13 | 사업계획서 hwp 양식 최종본 제출 | 전유성 |

### 백로그 (시간 남으면)
- LLM 누적 패턴 요약 기능 (PLANNING §3.4 ④)
- 시나리오 3 침실 점수 PLANNING(-35) vs 룰(-25) 차이 reconcile
- ML 분류기 결과를 UI에 자동 노출 (active_events 자동 주입 모드)
- `cleanup_gap_2d` 차등 메커니즘 재도입
- 욕실 base_score 멘토링 후 보강

---

## 팀 역할 (PLANNING §10 기반)

### 전유성 (팀장 · 글로벌경영)
- 총괄 · 일정 관리 · 발표 스토리
- 백엔드 (FastAPI) · LLM 통합 · 배포 관리
- 멘토 커뮤니케이션
- **이번 주 액션**: P0-1(UI 겹침), P0-2(시연 흐름), P0-3(질의 응답 준비), P1-4(ML API 통합)

### 김준성 (글로벌경영)
- 시장·경쟁 제품 조사
- 공개 IoT 데이터셋 분석·가중치 보정 노트 (멘토용 자료)
- Mock dataset 설계 (이미 v1 완성, 보강만)
- PPT 시장성·확장성 파트 발표
- **이번 주 액션**: P1-8(시장 분석 추가 보강), P1-9(경쟁사 디테일)

### 박주상 (인공지능)
- ML 이벤트 분류 모델 (scikit-learn) — **본 프로젝트의 데이터·AI 실무 역량 증명 파트**
- LLM 프롬프트 엔지니어링 (한국어 톤 조정·상황별 출력 검토)
- 분류기 성능 발표 (정확도·confusion matrix)
- **이번 주 액션**: P1-5(데이터셋 선정), P1-6(전처리), P1-7(모델 학습) — Solo plan mode 진입

---

## 알려진 이슈

| # | 항목 | 영향 | 비고 |
|---|---|---|---|
| 1 | HouseMap 가구 SVG와 점수·라벨 텍스트 일부 겹침 (특히 작은 방) | 시각 가독성 | P0-1 에서 해결 |
| 2 | 시나리오 3 침실 점수 PLANNING(-35) vs 코드(-25) 불일치 | 발표 자료 일관성 | PLANNING 각주로 해소 또는 룰 재조정 |
| 3 | Render 무료 tier cold start ~30초 | 멘토 미팅 첫 응답 지연 | 미팅 30분 전 warm-up curl |
| 4 | Custom 모드는 LLM 캐시 미사용 (응답 ~3-5초) | 시연 시 응답 지연 | 시연은 preset 위주, custom 은 "확장 데모" 위치로 |

---

## 운영 — 백엔드/프론트 로컬 실행

```bash
# 백엔드
cd team-project-lg/backend
.venv/Scripts/activate
uvicorn app.main:app --port 8123

# 프론트
cd team-project-lg/frontend
NEXT_PUBLIC_API_URL=http://localhost:8123 pnpm dev
```

테스트: `cd backend && pytest -v` (24/24 expected).
