# Cleaning Context Backend

FastAPI 백엔드 — 시나리오 → scoring → LLM 설명.

## 빠른 시작

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -e ".[dev]"
cp .env.example .env              # TIMELY_API_KEY 채움
uvicorn app.main:app --reload --port 8123
```

확인: http://localhost:8123/api/health

루트 `README.md`와 `frontend/next.config.ts`도 로컬 백엔드 포트를 `8123`으로 가정한다.

## 테스트

```bash
pytest -v
```

## 구조

- `app/config.py` — 환경설정
- `app/data_loader.py` — JSON 4종 로딩 (lru_cache)
- `app/schemas/` — Pydantic v2 모델
- `app/services/` — context_builder, scoring, llm_explainer, cache
- `app/routers/` — health, scenarios, simulate, events, infer, ask
- `app/data/*.json` — 공간/이벤트/시나리오/센서/추론/스코어링 룰 시드

설계 문서: `../docs/{PRD,TRD,IOT_DOMAIN,SCORING_RULES,MOCK_DATA_SCHEMA}.md` (TRD §0에 기술 스택 포함)
