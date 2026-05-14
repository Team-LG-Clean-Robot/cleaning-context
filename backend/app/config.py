from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    timely_api_key: str = ""
    timely_base_url: str = "https://hello.timelygpt.co.kr/api/v2/chat/bridge/openai"
    openai_model: str = "gpt-4o-mini"
    llm_timeout_sec: int = 10
    cache_dir: str = "./cache/scenarios"
    cors_origins: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
