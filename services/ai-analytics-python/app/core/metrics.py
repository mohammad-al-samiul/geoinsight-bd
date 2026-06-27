"""Prometheus metrics for FastAPI (exposed at GET /metrics)."""

from prometheus_client import REGISTRY, Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    excluded_handlers=["/metrics", "/api/v1/health"],
    env_var_name="ENABLE_METRICS",
    inprogress_name="geoinsight_ai_http_inprogress",
    inprogress_labels=True,
)

# Custom AI inference latency (optional hook for sentiment pipeline)
sentiment_inference_seconds = Histogram(
    "geoinsight_ai_sentiment_inference_seconds",
    "Bangla-BERT sentiment inference duration",
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=REGISTRY,
)

sentiment_requests_total = Counter(
    "geoinsight_ai_sentiment_requests_total",
    "Total sentiment analysis requests",
    labelnames=("source", "outcome"),
    registry=REGISTRY,
)


def setup_metrics(app) -> None:
    instrumentator.instrument(app).expose(
        app,
        endpoint="/metrics",
        include_in_schema=False,
    )
