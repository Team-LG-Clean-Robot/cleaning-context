"""LLM explainer + 캐시 동작 테스트.

실 API는 호출하지 않음 (smoke test는 .env에 TIMELY_API_KEY 있을 때만 별도 실행).
"""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services import cache, llm_explainer


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "cache_dir", str(tmp_path), raising=False)
    # lru_cache는 settings 인스턴스를 들고 있으므로 setattr 가능
    yield


def test_cache_roundtrip():
    payload = {"foo": "bar", "scores": [1, 2, 3]}
    cache.put("test_key", payload)
    assert cache.get("test_key") == payload
    assert cache.get("missing") is None


def test_cache_key_includes_rule_version():
    key = cache.cache_key("rainy_return")
    assert key.endswith("_v1")


def test_llm_fallback_when_no_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "timely_api_key", "", raising=False)
    text, fallback = llm_explainer.generate_explanation("ctx", [])
    assert fallback is True
    assert text == llm_explainer.FALLBACK_TEXT


def test_llm_fallback_on_exception(monkeypatch):
    monkeypatch.setattr(get_settings(), "timely_api_key", "fake-key", raising=False)
    llm_explainer._client.cache_clear()  # reset lazy client

    class Boom:
        class chat:
            class completions:
                @staticmethod
                def create(**_):
                    raise RuntimeError("simulated failure")

    monkeypatch.setattr(llm_explainer, "_client", lambda: Boom())
    text, fallback = llm_explainer.generate_explanation("ctx", [])
    assert fallback is True
    assert text == llm_explainer.FALLBACK_TEXT


def test_simulate_returns_fallback_without_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "timely_api_key", "", raising=False)
    client = TestClient(app)
    res = client.post("/api/simulate", json={"scenario_id": "rainy_return"})
    assert res.status_code == 200
    body = res.json()
    assert body["fallback"] is True
    assert body["explanation"] == llm_explainer.FALLBACK_TEXT
