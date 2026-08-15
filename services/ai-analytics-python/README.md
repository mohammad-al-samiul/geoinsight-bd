# AI Analytics (Python)

FastAPI service for GeoInsight BD — Bangla NLP, Ollama LLM, commodity arbitrage, GIS/CV DSS, weather, and news ingestion workers.

**Monorepo docs:** [Root README](../../README.md) · [System Design](../../docs/SYSTEM_DESIGN.md) · [Ollama Production](../../docs/OLLAMA_PRODUCTION.md)

---

## Role

| Concern | Detail |
|---------|--------|
| NLP | Bangla-BERT sentiment; narrative classify / fact-check |
| LLM | Ollama client (`OLLAMA_URL`) for briefing, outlook, sovereign chat, debunk, **local DSS** |
| GIS / CV | Shapely proximity; OpenCV face intel; phishing HTML fingerprints |
| Markets | Commodity scrape + Redis cache + Timescale-friendly payloads |
| Feeds | RSS / Google News ingestion; Open-Meteo + GDACS weather |
| Async | RabbitMQ `ai_analytics_queue` consumer |

Gateway owns RBAC and Prisma persistence; this service focuses on compute.

---

## Local run

```bash
cd services/ai-analytics-python
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional LLM:

```bash
ollama pull gpt-oss:20b
ollama serve   # :11434
```

OpenAPI: `http://localhost:8000/docs`

---

## Module directories (`app/modules/`)

| Module | Purpose |
|--------|---------|
| `sentiment` | Bangla-BERT analyze + heatmap |
| `briefing` | Morning executive narrative |
| `sovereign_llm` | Verified-context chat |
| `narrative_shield` | Classify, fact-check, RAG debunk |
| `outlook` | Strategic politics / economy generate |
| `ingestion` | RSS / Google News fetch + geo-match |
| `weather` | Open-Meteo + disaster alert feeds |
| `arbitrage` / `procurement` | Commodity prices & landed cost |
| `predictive` / `risk` / `accountability` | Scoring helpers |
| `documents` / `hazards` / `twin` / `simulator` / `citizen` | Domain DSS |
| `phishing` / `proximity` / `face_intel` | Cyber / geo-fence / VIP CV |
| `local_ai` | Morning brief, complaint triage, WPI explain, photo QA, citizen-assist |
| `health` | Liveness |

Routers wired in `app/api/router.py`.

---

## Key env

| Variable | Purpose |
|----------|---------|
| `OLLAMA_URL` / `OLLAMA_MODEL` | Local or remote Ollama |
| `REDIS_URL` | Arbitrage / worker cache |
| `RABBITMQ_URL` | AI job queue |
| `SENTIMENT_USE_MOCK` | Skip heavy model in CI/dev |

Production Ollama on a separate host → [OLLAMA_PRODUCTION.md](../../docs/OLLAMA_PRODUCTION.md).

---

## Tests

```bash
pytest tests/ -q
```
