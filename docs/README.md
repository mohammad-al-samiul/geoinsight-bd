# GeoInsight BD — Documentation

এই ফোল্ডারে **architecture**, **CI/CD / VPS deploy**, এবং **Ollama production** গাইড আছে।  
রোজকার setup/login → মূল [`README.md`](../README.md)।

| Document | Audience | কী আছে |
|----------|----------|--------|
| **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** | Architect / reviewer | HLD, LLD, ERD, NFR, security, ADR — incl. Narrative Shield, Unrest, Outlook, Divisional Crisis, Weather, DSS modules |
| **[DEPLOYMENT_AND_OPS.md](./DEPLOYMENT_AND_OPS.md)** | DevOps / operator | CI/CD (`deploy-vps.yml`), Hostinger VPS, slim compose, performance, day-to-day ops |
| **[OLLAMA_PRODUCTION.md](./OLLAMA_PRODUCTION.md)** | AI ops | আলাদা AI server, `OLLAMA_URL`, GPU optional, local Windows tip |

### Service READMEs

| Service | Path |
|---------|------|
| API Gateway | [`services/api-gateway-node/README.md`](../services/api-gateway-node/README.md) |
| AI Analytics | [`services/ai-analytics-python/README.md`](../services/ai-analytics-python/README.md) |
| Dashboard | [`web/dashboard-nextjs/README.md`](../web/dashboard-nextjs/README.md) |

### DSS & intel modules (see System Design §২.১২–২.২০)

| Module | Dashboard | AI prefix | Gateway |
|--------|-----------|-----------|---------|
| Anti-Phishing | `/anti-phishing` | `/api/v1/phishing` | `/intelligence/phishing/*` |
| Proximity Map | (panel / API) | `/api/v1/proximity` | `/intelligence/proximity/*` |
| Face Intel | (panel / API) | `/api/v1/face-intel` | `/intelligence/face-intel/*` |
| Narrative Shield | `/narrative-shield` | `/api/v1/narrative-shield` | `/narrative-shield/*` |
| Unrest Pulse | `/unrest` | — (gateway analytics) | `/unrest/*` |
| Strategic Outlook | `/outlook` | `/api/v1/outlook` | `/outlook/*` |
| Divisional Crisis | `/divisional-crisis` | — | `/divisional-crisis/*` |
| Weather | embedded in `/hazards` | `/api/v1/weather` | `/weather/*` |
| Ingestion / Pipeline / Intel | ops APIs | `/api/v1/ingestion` | `/ingestion/*`, `/pipeline/*`, `/intel/*` |

### দ্রুত নেভিগেশন

```
README (quick start / features)
   │
   ├─► docs/SYSTEM_DESIGN.md          ← কেন এমন architecture
   ├─► docs/DEPLOYMENT_AND_OPS.md     ← কীভাবে CI/CD + VPS
   │       └─► docs/OLLAMA_PRODUCTION.md  ← LLM server detail
   ├─► services/*/README.md           ← per-service runbook
   └─► .env.example / .env.production.example
```

### Env templates

| File | Use |
|------|-----|
| [`.env.example`](../.env.example) | Local Windows + Docker Desktop |
| [`.env.production.example`](../.env.production.example) | Hostinger / production VPS |
| [`.env.ollama.example`](../.env.ollama.example) | Dedicated Ollama host |

### Related scripts & compose

| Topic | Path |
|-------|------|
| Local full stack | `deploy/scripts/docker-up.ps1` |
| VPS redeploy | `deploy/scripts/vps-redeploy.sh` |
| Point app → Ollama | `deploy/scripts/vps-point-ollama.sh` |
| Ollama server setup | `deploy/scripts/ollama-server-setup.sh` |
| Slim VPS overlay | `docker-compose.vps.yml` |
| Ollama compose | `docker-compose.ollama.yml` |
| Auto deploy on `main` | `.github/workflows/deploy-vps.yml` |
