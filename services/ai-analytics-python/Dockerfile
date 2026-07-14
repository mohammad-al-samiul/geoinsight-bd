# syntax=docker/dockerfile:1
# GeoInsight BD — AI Analytics (production / local Docker)
# Uses CPU-only PyTorch (no multi‑GB NVIDIA CUDA wheels on every rebuild).

FROM python:3.12-slim AS builder

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Torch first from the official CPU wheel index (cached by BuildKit across rebuilds).
# Remaining deps from PyPI — also cache-mounted so interrupted builds resume without re-download.
RUN --mount=type=cache,target=/root/.cache/pip \
    grep -Ev '^(pytest|pytest-asyncio|torch==)' requirements.txt \
      | grep -Ev '^[[:space:]]*$$' > requirements-prod.txt \
    && pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements-prod.txt

FROM python:3.12-slim AS production

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production

RUN groupadd --system app && useradd --system --gid app app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY app ./app
COPY ml_models ./ml_models

RUN mkdir -p /app/ml_models/cache \
    && chown -R app:app /app

USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
