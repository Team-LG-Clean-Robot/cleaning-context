# 생활 맥락 로봇청소기 시뮬레이터

> LG전자 가전 멘토링 트랙 · 팀 럭키 금성 · 성균관대 AI Intensive Project

로봇청소기가 **시간·날씨·이벤트** 같은 상황 정보를 종합해 어디를·언제·어떻게 청소할지 결정하고, 그 이유를 **자연어로 설명**하는 Physical AI Agent 시뮬레이터.

## 🌐 라이브 데모

- **앱**: https://cleaning-context.vercel.app/
- **API 헬스체크**: https://cleaning-context-backend.onrender.com/api/health

## 한 줄로

> "청소를 잘하는 로봇"이 아니라 **"왜 이렇게 청소했는지 설명하는 로봇"** — 단순 자동화에서 상황 이해·설명 가능한 Physical AI Agent로의 시장 포지션 이동을 제안.

## 데모 시나리오 4종

| 시나리오 | 입력 | 핵심 의사결정 |
|---|---|---|
| 비 오는 날 귀가 | 20:30 · 비 · 사용자 귀가 · 취침 2h 전 | 현관 우선 + 침실 제외 (취침 페널티) |
| 요리 직후 | 19:20 · 요리 완료 · 거실에 사용자 머무름 | 주방 즉시 + 거실 지연 |
| 취침 직전 | 22:50 · 취침 30분 전 · 침실에 사용자 | 침실·거실 제외 + 현관·주방 저소음 |
| 손님 방문 예정 | 17:00 · 2시간 후 방문 · 거실·현관 청소 공백 | 거실·현관 우선 + 침실 후순위 |

추가로 **"직접 입력" 모드** — 시간·취침예정·사용자 위치·이벤트 7개 중 다중 선택해서 임의 상황 만들기.

## 시스템 5-Layer

1. **Spatial Layer** — 5개 공간 + 속성(오염도·사용 빈도·소음 민감도)
2. **Behavioral Layer** — 7개 이벤트(비/귀가/요리/취침/손님 …)와 공간별 영향
3. **Context Layer** — 시간·이벤트·공간 상태 종합 컨텍스트
4. **Decision Layer** — Rule-based scoring → 공간별 priority score
5. **Explainable Layer** — LLM이 점수표를 자연어로 해석

> **Rule-based + LLM 분리.** 점수 계산은 결정론적 알고리즘(재현성·디버깅 가능). LLM 은 점수표를 자연어로 해석만 — 점수 계산에 관여하지 않음.

## 기술 스택

| 영역 | 스택 |
|---|---|
| 백엔드 | Python 3.12 · FastAPI · Pydantic v2 |
| LLM | OpenAI SDK via Timely GPT bridge · gpt-4o-mini |
| 프론트 | Next.js 15 · TypeScript · Tailwind v4 · React 19 |
| 디자인 | Pretendard · JetBrains Mono · CSS variables (`@theme`) |
| 배포 | Render (백엔드) · Vercel (프론트) |
| 테스트 | pytest 24 케이스 (golden score + LLM cache + custom mode) |

## 디렉토리

```
team-project-lg/
├── PLANNING.md              # 사업계획서 14섹션
├── STATUS.md                # 팀 내부 현황·액션 (gitignored 아님 — 팀 공유용)
├── DEPLOY.md                # 배포 매뉴얼
├── backend/
│   ├── app/                 # FastAPI 앱 (routers/schemas/services/data)
│   ├── tests/               # pytest 24 케이스
│   └── scripts/seed_cache.py
├── frontend/
│   ├── app/                 # Next.js App Router (layout, page, globals.css, icon)
│   ├── components/          # HouseMap, Simulator, MethodologyCard, ScenarioPanel, CustomModePanel, PriorityList, ExplanationCard, LoadingSkeleton
│   └── lib/                 # types, api, colors
├── docs/                    # 설계 문서 5종 (PRD·TRD·SCORING_RULES·MOCK_DATA_SCHEMA·TECH_STACK)
└── exports/                 # 사업계획서 PDF·hwp 자동 채우기 스크립트
```

## 로컬 실행

### 백엔드
```bash
cd team-project-lg/backend
python -m venv .venv
.venv/Scripts/activate          # Windows. macOS/Linux: source .venv/bin/activate
pip install -e .
cp .env.example .env             # TIMELY_API_KEY 채움
uvicorn app.main:app --port 8123 --reload
```

헬스체크: http://localhost:8123/api/health

### 프론트
```bash
cd team-project-lg/frontend
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8123 pnpm dev
```

http://localhost:3000 접속.

### 테스트
```bash
cd team-project-lg/backend && pytest -v       # 24 케이스
cd team-project-lg/frontend && pnpm typecheck # tsc --noEmit
```

## 팀

| 이름 | 전공 | 역할 |
|---|---|---|
| **전유성** (팀장) | 글로벌경영 | 총괄·일정·백엔드·LLM 통합·발표 스토리·멘토 커뮤니케이션 |
| **김준성** | 글로벌경영 | 시장·경쟁 제품 조사·공개 IoT 데이터셋 분석·PPT 시장성 파트 발표 |
| **박주상** | 인공지능 | ML 이벤트 분류 모델(scikit-learn)·LLM 프롬프트 엔지니어링·분류기 성능 발표 |

## 일정

총 4주 (2026-05-04 ~ 2026-05-30).

| 주차 | 기간 | 핵심 |
|---|---|---|
| 1주 | 5/4~5/10 | 사업계획서·설계 문서 |
| 2주 | 5/11~5/17 | MVP 백엔드+프론트+배포 ← **현재** |
| 3주 | 5/18~5/24 | ML 이벤트 분류기 + UI 폴리싱 |
| 4주 | 5/25~5/30 | 발표 PPT·리허설·**5/30 최종 발표** |

자세한 진척은 [STATUS.md](./STATUS.md) 참조.

## 라이선스

학내 프로젝트 — 외부 배포 시 팀 문의.
