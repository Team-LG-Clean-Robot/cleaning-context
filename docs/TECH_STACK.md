# Tech Stack

> 본 프로젝트는 PLANNING.md §3.4의 Rule-based + LLM 하이브리드 아키텍처를 구현한다.
> 의사결정의 결정론적 부분(scoring)은 Python으로, 시각화·인터랙션은 Next.js로 분리.

## Backend

| 항목 | 선택 | 비고 |
|---|---|---|
| 언어 | Python 3.11+ | type hints + pydantic v2 |
| 웹 프레임워크 | FastAPI | async, OpenAPI 자동 생성 |
| 데이터 검증 | Pydantic v2 | 요청/응답 스키마 |
| ML | scikit-learn | 이벤트 분류기 (DecisionTree → RandomForest 비교) |
| 데이터 처리 | pandas, numpy | 공개 IoT 데이터셋 분석 |
| LLM SDK | openai (>=1.x) | GPT-4o-mini |
| 환경변수 | python-dotenv | `.env` |
| 테스트 | pytest | scoring engine 단위 테스트 |
| 패키지 관리 | uv 또는 pip + venv | uv 우선 |

## Frontend

| 항목 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router) | React 19 |
| 언어 | TypeScript | strict mode |
| 스타일 | Tailwind CSS v4 | utility-first |
| 상태 | React useState/useReducer | 전역 store 불필요 (단일 시뮬레이션 페이지) |
| API 클라이언트 | fetch + 작은 wrapper | 의존성 최소 |
| 시각화 | inline SVG (2D 맵) + Tailwind class로 heatmap 색상 | 추가 라이브러리 X |
| 패키지 관리 | pnpm | |

## LLM

| 항목 | 선택 | 비고 |
|---|---|---|
| Provider | OpenAI | day01에서 Timely GPT bridge 사용 검증 |
| Model | `gpt-4o-mini` | 비용·속도 균형. 설명 생성에 충분 |
| 호출 모드 | non-streaming | 시나리오당 1회, 응답 캐싱 |
| 캐시 | 디스크 JSON (`backend/cache/scenarios/*.json`) | 발표 안정성 — PLANNING.md §12 리스크 대응 |

## 개발 환경

| 항목 | 선택 |
|---|---|
| 모노레포 구조 | 단일 폴더 (`backend/`, `frontend/`) |
| 로컬 실행 | `uvicorn` (8000) + `pnpm dev` (3000), Next.js rewrites로 `/api` 프록시 |
| Python 포맷터 | ruff (lint + format) |
| TS 포맷터 | Biome 또는 Prettier (Next.js 기본) |
| Git hook | (선택) pre-commit으로 ruff·tsc |

## 배포 (발표 데모용)

| 항목 | 선택 |
|---|---|
| Frontend | Vercel (GitHub 연동) |
| Backend | Render 또는 Fly.io 무료 tier |
| 폴백 | 사전 캐싱된 시나리오 응답으로 오프라인 데모 가능 |

## 비채택

- **Streamlit**: day01에서 사용했으나 2D heatmap·인터랙션 한계로 발표 임팩트 부족
- **데이터베이스**: MVP는 in-memory + JSON 파일로 충분. 도입 시 SQLite
- **인증**: 데모이므로 불필요
- **WebSocket**: 시나리오 클릭 → 단일 응답이면 REST로 충분
