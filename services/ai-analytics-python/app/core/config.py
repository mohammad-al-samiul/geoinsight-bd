from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "GeoInsight AI Analytics"
    environment: str = Field(default="development", alias="NODE_ENV")
    ai_core_port: int = Field(default=8000, alias="AI_CORE_PORT")
    cors_origins: str = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
    )

    model_cache_dir: Path = Field(
        default=Path("./ml_models/cache"),
        alias="AI_MODEL_CACHE_DIR",
    )
    worker_pool_size: int = Field(default=4, alias="AI_WORKER_POOL_SIZE")
    scrape_interval_sec: int = Field(default=300, alias="AI_SCRAPE_INTERVAL_SEC")
    mock_country_count: int = Field(default=195, alias="AI_MOCK_COUNTRY_COUNT")

    rabbitmq_url: str = Field(
        default="amqp://geoinsight_mq:change_me@rabbitmq:5672/",
        alias="RABBITMQ_URL",
    )
    rabbitmq_exchange: str = Field(
        default="geoinsight_exchange",
        alias="RABBITMQ_EXCHANGE",
    )
    rabbitmq_ai_queue: str = Field(
        default="ai_analytics_queue",
        alias="RABBITMQ_AI_QUEUE",
    )

    bangla_bert_model_id: str = Field(
        default="l3cube-pune/bengali-sentiment-analysis",
        alias="BANGLA_BERT_MODEL_ID",
    )
    sentiment_use_mock: bool = Field(default=False, alias="SENTIMENT_USE_MOCK")
    sovereign_mode: bool = Field(default=False, alias="SOVEREIGN_MODE")
    public_feed_333_rate_max: int = Field(default=30, alias="PUBLIC_FEED_333_RATE_MAX")
    public_feed_999_rate_max: int = Field(default=15, alias="PUBLIC_FEED_999_RATE_MAX")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
