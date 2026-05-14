# Cleaning Context Backend

FastAPI 백엔드 — 시나리오 → scoring → LLM 설명.

## 빠른 시작

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -e ".[dev]"
cp .env.example .env              # TIMELY_API_KEY 채움
uvicorn app.main:app --reload --port 8000
```

확인: http://localhost:8000/api/health

## 테스트

```bash
pytest -v
```

## 구조

- `app/config.py` — 환경설정
- `app/data_loader.py` — JSON 4종 로딩 (lru_cache)
- `app/schemas/` — Pydantic v2 모델
- `app/services/` — context_builder, scoring, llm_explainer, cache
- `app/routers/` — health, scenarios, simulate
- `app/data/*.json` — 공간/이벤트/시나리오/룰 시드

설계 문서: `../docs/{TECH_STACK,PRD,TRD,SCORING_RULES,MOCK_DATA_SCHEMA}.md`
