"""
4 시나리오를 백엔드에 호출해 응답을 cached_responses/에 저장.

사용법:
  1. uvicorn app.main:app --port 8000 (or whatever port)
  2. python scripts/seed_cache.py [--port 8000]

발표 안정성 보장 — 시드된 응답은 git 트래킹되어 Render 배포 시 자동 복사.
"""

import argparse
import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
SEED_DIR = ROOT / "app" / "data" / "cached_responses"
SCENARIOS = ["rainy_return", "post_cooking", "pre_sleep", "guest_incoming"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--rule-version", default="v1")
    args = parser.parse_args()

    SEED_DIR.mkdir(parents=True, exist_ok=True)
    base = f"http://localhost:{args.port}"

    try:
        health = requests.get(f"{base}/api/health", timeout=5).json()
    except Exception as e:
        print(f"백엔드 접근 실패 ({base}): {e}", file=sys.stderr)
        return 1

    if not health.get("llm_available"):
        print("[WARN] TIMELY_API_KEY missing -- fallback responses will be seeded", file=sys.stderr)

    for sc in SCENARIOS:
        try:
            r = requests.post(
                f"{base}/api/simulate",
                json={"scenario_id": sc},
                timeout=30,
            )
            r.raise_for_status()
        except Exception as e:
            print(f"  [FAIL] {sc}: {e}", file=sys.stderr)
            continue

        payload = r.json()
        payload.pop("duration_ms", None)
        out = SEED_DIR / f"{sc}_{args.rule_version}.json"
        out.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        fallback = " (fallback)" if payload.get("fallback") else ""
        print(f"  [OK] {sc} -> {out.relative_to(ROOT).as_posix()}{fallback}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
