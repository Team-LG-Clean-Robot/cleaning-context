from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.data_loader import load_events, load_rooms, load_rules, load_scenarios
from app.routers import events, health, scenarios, simulate


def _seed_cache_from_disk() -> None:
    """app/data/cached_responses/*.json → cache_dir/*.json (없는 항목만)."""
    seed_dir = Path(__file__).parent / "data" / "cached_responses"
    if not seed_dir.exists():
        return
    cache_dir = Path(get_settings().cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)
    for src in seed_dir.glob("*.json"):
        dst = cache_dir / src.name
        if not dst.exists():
            dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_rooms()
    load_events()
    load_scenarios()
    load_rules()
    _seed_cache_from_disk()
    yield


app = FastAPI(title="Cleaning Context Simulator", lifespan=lifespan)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(simulate.router, prefix="/api")
app.include_router(events.router, prefix="/api")
