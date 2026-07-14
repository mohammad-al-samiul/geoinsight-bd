# GeoInsight BD

**National governance intelligence platform** for Bangladesh — hierarchical admin dashboards, real-time KPI feeds, Bangla sentiment analytics, sovereign on-prem LLM, and Hyperledger-backed project milestones.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-TimescaleDB-4169E1?logo=postgresql&logoColor=white)](https://www.timescale.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

---

## Table of Contents

- [Overview](#overview)
- [Quick Start (Bangla)](#quick-start-bangla)
- [Features](#features)
- [Documentation](#documentation)
- [Quick Start](#quick-start)
- [How Frontend Connects to Backend](#how-frontend-connects-to-backend)
- [Environment Variables](#environment-variables)
- [Service Ports](#service-ports)
- [API Modules](#api-modules)
- [Dashboard Pages & RBAC](#dashboard-pages--rbac)
- [Data Seeding](#data-seeding)
- [Online News Ingestion](#online-news-ingestion-rss--google-news)
- [Running Tests](#running-tests)
- [Production Deployment](#production-deployment)
- [Observability](#observability)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [License](#license)

---

## Overview

GeoInsight BD is a **monorepo** that gives the Government of Bangladesh a single **command center** for:

- **National project tracking** — budget, completion, red flags by division → union
- **Representative KPIs** — MPs, Ministers, DCs with verified metrics
- **AI anomaly detection** — budget overrun, delay, contractor fraud patterns
- **Citizen sentiment** — Bangla-BERT on 333/999-style grievance streams
- **Procurement intelligence** — global commodity arbitrage (rice, wheat, onion, lentil)
- **PM Briefing Copilot** — morning executive summary + voice briefing (Bangla / English)
- **Sovereign Bangla LLM** — on-prem Ollama; verified DB context only
- **Blockchain audit trail** — Hyperledger Fabric milestone anchoring

| Service | Stack | Port | Role |
|---------|-------|------|------|
| **Dashboard** | Next.js 15, Tailwind, Leaflet, Recharts, next-intl | `3000` | Web UI, BFF auth proxy, Socket.io client |
| **API Gateway** | Node.js 20, Express, Prisma, Socket.io | `4000` | REST API, JWT / RBAC, RabbitMQ, Fabric |
| **AI Analytics** | Python 3.12, FastAPI, Bangla-BERT, Ollama | `8000` | NLP, briefing, predictive scoring, arbitrage |
| **Infrastructure** | Docker Compose | — | TimescaleDB, PgBouncer, Redis, RabbitMQ, MinIO |

---

## Quick Start (Bangla)

### Option A — এক কমান্ডে full stack (Windows, recommended)

```powershell
cd geoinsight-bd
cp .env.example .env          # প্রথমবার
.\deploy\scripts\docker-up.ps1
```

| URL | Service |
|-----|---------|
| http://localhost:3000 | Dashboard |
| http://localhost:4000/api/v1/health | API Gateway |
| http://localhost:8000/api/v1/health | AI Analytics |

**Login:** `pmo@geoinsight.gov.bd` / `ChangeMe@123`

`db-init` automatically চলে — divisions, projects, KPIs, red flags seed হয়।

### Option B — Manual local development (৪টা terminal)

1. **Infrastructure:** `docker compose up -d`
2. **API Gateway:** `cd services/api-gateway-node && npm run dev` → `:4000`
3. **AI Analytics:** `cd services/ai-analytics-python && uvicorn app.main:app --reload --port 8000`
4. **Dashboard:** `cd web/dashboard-nextjs && npm run dev` → `:3000`

**Frontend ↔ Backend:** Browser সরাসরি JWT দেখে না। Login → Next.js **BFF** → HTTP-only cookie → `/api/proxy/*` → Gateway `/api/v1/*`. Real-time → **Socket.io** সরাসরি Gateway-এ।

---

## Features

### PMO Command (Tier 1)

| Page | Path | Description |
|------|------|-------------|
| National Overview | `/` | Choropleth map, live KPI scorecards, red flag markers |
| Command Dashboard | `/dashboard` | Same national command viewport |
| PM Briefing Copilot | `/briefing` | AI morning bullets, narrative, voice TTS |
| Sovereign Bangla LLM | `/sovereign-ai` | On-prem chat over verified DB context |
| KPI Digital Twin | `/digital-twin` | Budget reallocation simulation by division |
| Citizen Sentiment | `/sentiment` | 333/999 grievance heatmap (Bangla-BERT) |
| Impact Simulator | `/simulator` | Geopolitical shock → Remittance / RMG impact |
| Procurement Advisor | `/procurement` | Commodity landed cost + lead time |

### Governance & Operations (Tier 2)

| Page | Path | Description |
|------|------|-------------|
| Representative KPIs | `/kpis` | MP / Minister / DC performance metrics |
| Project Tracker | `/projects` | Budget, status, red flags, blockchain |
| Red Flag Alerts | `/alerts` | Predictive scan + live anomaly feed |
| Document Intelligence | `/documents` | Tender / contract anomaly detection |
| AI Audit Trail | `/audit-trail` | Red flag → AI → action timeline |
| Citizen Chatbot | `/citizen-chat` | 333/999 routing demo |
| Flood & Cyclone Risk | `/hazards` | Project vs hazard zone overlay |

### Field & Local (Tier 3–4)

| Page | Path | Description |
|------|------|-------------|
| Agri Markets | `/agro` | Mandi, haat, retail market registry |
| Geo Spatial Map | `/map` | Full command map viewport |
| Representatives | `/representatives` | Directory + Accountability AI scores |

### Global UI

- **Admin Cascade Filter** — Division → District → Upazila → Union
- **Command Search** — `Ctrl+K` across pages, projects, KPIs, alerts
- **Notification Center** — live red flag bell
- **AI Anomaly Feed** — right panel, Socket.io live
- **Locale Switcher** — বাংলা / English

---

## Documentation

System design, CI/CD, VPS deploy, এবং Ollama setup **আলাদা docs page**-এ রাখা হয়েছে — README শুধু link দেয়।

| Document | কী পাবেন |
|----------|----------|
| **[System Design](docs/SYSTEM_DESIGN.md)** | HLD, LLD, ERD, tech stack rationale, ADR |
| **[CI/CD · VPS · Ollama](docs/DEPLOYMENT_AND_OPS.md)** | Deploy pipeline, কেন কোন approach, day-to-day ops |
| **[Ollama Production](docs/OLLAMA_PRODUCTION.md)** | আলাদা AI server + `OLLAMA_URL` setup |
| **[`.env.example`](.env.example)** | Local env template |
| **[`.env.production.example`](.env.production.example)** | VPS env template |

GitHub-এ `docs/SYSTEM_DESIGN.md` খুললে full architecture diagrams ও ব্যাখ্যা দেখা যাবে।

---

## Quick Start

### Option A — Docker full stack (recommended)

```powershell
git clone <repository-url> geoinsight-bd
cd geoinsight-bd
cp .env.example .env
# Edit .env — strong passwords + JWT_SECRET (≥ 32 chars)

.\deploy\scripts\docker-up.ps1
```

Open **http://localhost:3000** — login: `pmo@geoinsight.gov.bd` / `ChangeMe@123`

### Option B — Manual local development

#### 1. Infrastructure

```bash
cp .env.example .env
docker compose up -d
docker compose ps   # wait for healthy postgres, rabbitmq, minio
```

| UI | URL |
|----|-----|
| RabbitMQ Management | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |

#### 2. API Gateway

```bash
cd services/api-gateway-node
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

#### 3. AI Analytics

```bash
cd services/ai-analytics-python
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Ollama (optional, for generative AI):

```bash
ollama pull llama3.1:8b
ollama serve   # default :11434
```

#### 4. Dashboard

```bash
cd web/dashboard-nextjs
cp .env.example .env.local
npm install
npm run dev
```

#### 5. Seed database (if not using docker-up)

```bash
docker compose -f docker-compose.yml -f docker-compose.apps.yml run --rm db-init
```

---

## How Frontend Connects to Backend

### BFF pattern

| Browser path | Purpose |
|--------------|---------|
| `POST /api/auth/login` | Login → sets `gi_access_token`, `gi_refresh_token` cookies |
| `POST /api/auth/refresh` | Silent token refresh |
| `GET /api/auth/me` | Current user profile |
| `POST /api/auth/logout` | Clears cookies + revokes refresh |
| `GET /api/proxy/[...path]` | Proxies to gateway with Bearer from cookie |
| WebSocket `@ NEXT_PUBLIC_SOCKET_URL` | Real-time KPI / alert events |

### Client API usage

```typescript
import { apiClient } from "@/lib/api-client";

// Browser: /api/proxy/kpis/definitions → Gateway: /api/v1/kpis/definitions
const data = await apiClient("/kpis/definitions");
```

- **401** → auto refresh via `/api/auth/refresh`, retry once
- **403** → redirect to `/forbidden`

### Route protection

`web/dashboard-nextjs/src/middleware.ts` guards dashboard routes. Unauthenticated users → `/login`.

---

## Environment Variables

### Root `.env`

See [`.env.example`](.env.example). Key groups:

| Group | Variables |
|-------|-----------|
| PostgreSQL | `POSTGRES_*`, `DATABASE_URL`, `DATABASE_READ_URL`, `DIRECT_DATABASE_URL` |
| Redis | `REDIS_*`, `REDIS_URL` |
| RabbitMQ | `RABBITMQ_*`, `RABBITMQ_URL` |
| MinIO | `MINIO_*` |
| JWT | `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_DAYS` |
| AI / LLM | `AI_SERVICE_URL`, `OLLAMA_URL`, `OLLAMA_MODEL`, `SENTIMENT_USE_MOCK` |
| Fabric | `FABRIC_ENABLED`, `FABRIC_*` |
| Dashboard | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `API_GATEWAY_URL` |

### Per-service overrides

| File | Service |
|------|---------|
| `services/api-gateway-node/.env` | Gateway (localhost DB/MQ) |
| `services/ai-analytics-python/.env` | AI Analytics |
| `web/dashboard-nextjs/.env.local` | Next.js dev |

> **Never commit `.env` files.**

---

## Service Ports

| Service | Port | Protocol |
|---------|------|----------|
| Dashboard (Next.js) | 3000 | HTTP |
| API Gateway | 4000 | HTTP + WebSocket |
| AI Analytics | 8000 | HTTP |
| PostgreSQL | 55432 (local) / 5432 (docker internal) | TCP |
| PgBouncer | 6432 | TCP |
| Redis | 6379 | TCP |
| RabbitMQ AMQP | 5672 | TCP |
| RabbitMQ Management | 15672 | HTTP |
| MinIO API | 9000 | HTTP |
| MinIO Console | 9001 | HTTP |
| Ollama | 11434 | HTTP |
| Prometheus | 9090 | HTTP |
| Grafana | 3002 | HTTP |

**Windows note:** Port `5672` may be reserved by Hyper-V — use `RABBITMQ_PORT=35672`. Port `5432` may conflict — default local mapping is `55432`.

---

## API Modules

Base path: `/api/v1`

### Gateway modules

| Module | Key endpoints | Roles |
|--------|---------------|-------|
| `auth` | `POST /auth/login`, `/register`, `/refresh` | Public / PMO |
| `dashboard` | `GET /dashboard/national` | PMO, MINISTER |
| `briefing` | `GET /briefing/morning?lang=bn` | PMO |
| `sovereign` | `POST /sovereign-llm/chat` | PMO, MINISTER |
| `twin` | `POST /twin/simulate` | PMO |
| `intelligence` | `/intelligence/sentiment/heatmap`, `/predictive/scan`, … | PMO, MINISTER |
| `simulator` | `POST /simulator/run` | PMO |
| `procurement` | `POST /procurement/advise` | PMO |
| `projects` / `kpis` / `alerts` | CRUD-style scoped routes | Scoped |
| `search` | `GET /search?q=` | Authenticated |
| `public-feed` | `/public/feeds/333\|999/stream` | Rate-limited |

### AI Analytics routes

| Router | Path | Purpose |
|--------|------|---------|
| `briefing` | `/briefing/generate` | Morning narrative |
| `sovereign_llm` | `/sovereign-llm/chat` | Verified-context chat |
| `sentiment` | `/sentiment/heatmap`, `/analyze` | Bangla-BERT |
| `predictive` | `/predictive/score` | Project risk scoring |
| `arbitrage` | `/arbitrage/*` | Commodity price engine |
| `procurement` | `/procurement/advise` | Landed cost ranking |
| `documents` / `hazards` / `twin` / `simulator` | module paths | Intelligence APIs |

---

## Dashboard Pages & RBAC

| Tier | Role | Visible pages |
|------|------|---------------|
| 1 | PMO | All pages |
| 2 | MINISTER | KPIs through Hazards (not full PMO-only command set) |
| 3 | DC | Agro, Map, Representatives |
| 4 | UNION_CHAIRMAN | Representatives only |

---

## Data Seeding

Automatic via `deploy/scripts/docker-db-init.sh`:

| Script | Contents |
|--------|----------|
| `seed-national-data.sql` | Divisions, KPI defs, sample projects / representatives |
| `seed-admin-upazila-union.sql` | Upazilas and unions |
| `fix-admin-unit-bn.sql` | Bengali name repair |
| `bootstrap-pmo.sql` | PMO password hash update |

```bash
docker compose -f docker-compose.yml -f docker-compose.apps.yml run --rm db-init
```

---

## Online News Ingestion (RSS + Google News)

Headlines from major BD outlets + Google News topics (government, development, agriculture, corruption, economy).

| Step | Detail |
|------|--------|
| **Fetch** | AI `POST /api/v1/ingestion/fetch` |
| **Store** | Gateway upserts `external_articles` |
| **Analyze** | Bangla-BERT sentiment |
| **Auto sync** | Gateway worker (`INGESTION_INTERVAL_MS`) |

Dashboard → Sentiment → **Fetch news now** for manual sync.

---

## Running Tests

```bash
# API Gateway
cd services/api-gateway-node && npm test

# AI Analytics
cd services/ai-analytics-python && pytest tests/ -q

# Load test
cd load-tests && locust -f locustfile.py --host=http://localhost:4000
```

---

## Production Deployment

Everyday Hostinger flow: push `main` → GitHub Actions SSH → `vps-redeploy.sh` (slim compose).

```bash
# On VPS
cd /opt/geoinsight-bd
bash deploy/scripts/vps-redeploy.sh --force
```

Full guide (CI/CD, slim VPS profile, remote Ollama, **কেন কোন approach**):

→ **[docs/DEPLOYMENT_AND_OPS.md](docs/DEPLOYMENT_AND_OPS.md)**

Optional GHCR path: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (manual).  
Auto VPS path: [`.github/workflows/deploy-vps.yml`](.github/workflows/deploy-vps.yml).

**Secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`  
**Env template:** [`.env.production.example`](.env.production.example)

---

## Observability

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml up -d
```

| Component | Path |
|-----------|------|
| Prometheus | `deploy/observability/prometheus/prometheus.yml` |
| Alert rules | `deploy/observability/prometheus/alerts/geoinsight.rules.yml` |
| Grafana | `deploy/observability/grafana/dashboards/geoinsight-platform.json` |

---

## Project Structure

```
geoinsight-bd/
├── docs/                           # System Design, Deploy & Ops, Ollama
├── .github/workflows/              # CI/CD
├── deploy/                         # nginx, init, scripts, observability
├── services/
│   ├── api-gateway-node/           # Express API + Prisma + Socket.io
│   └── ai-analytics-python/        # FastAPI + Bangla-BERT + Ollama client
├── web/dashboard-nextjs/           # Next.js 15 App Router
├── docker-compose.yml              # Infrastructure
├── docker-compose.apps.yml         # Gateway, AI, Dashboard
├── docker-compose.vps.yml          # Slim Hostinger profile
└── docker-compose.ollama.yml       # Dedicated AI server
```

---

## Troubleshooting

### RabbitMQ port conflict (Windows)

Set `RABBITMQ_PORT=35672` in root `.env`, update `RABBITMQ_URL` in service `.env` files.

### Prisma migration fails

Use `DIRECT_DATABASE_URL` (not PgBouncer) for migrations:

```bash
cd services/api-gateway-node && npx prisma migrate deploy
```

### Dashboard login loop

- Gateway running?
- `API_GATEWAY_URL` correct?
- `JWT_SECRET` unchanged between restarts?

### Socket.io not connecting

- `NEXT_PUBLIC_SOCKET_URL` → Gateway (not Next.js `:3000`)
- Production: nginx WebSocket upgrade — `deploy/nginx/nginx.conf`

### AI / Briefing unavailable

- AI on `:8000`? Ollama up? `curl http://localhost:11434/api/tags`
- Fallback template mode works without Ollama

### Empty dashboard data

```bash
docker compose -f docker-compose.yml -f docker-compose.apps.yml run --rm db-init
```

---

## Security Notes

- JWT access: **15 minutes**; refresh: HTTP-only, rotated
- RBAC + admin-unit tenant isolation on protected routes
- Rate limiting: nginx → gateway → AI (333/999 feeds)
- Production: `SOVEREIGN_MODE`, no external telemetry
- Never expose `DATABASE_URL` / `JWT_SECRET` to the browser — only `NEXT_PUBLIC_*` is client-safe

---

## License

Proprietary — Government of Bangladesh / authorized partners.

---

<p align="center">
  <strong>GeoInsight BD</strong> — Evidence-based governance for every admin unit.<br/>
  <em>National data · Sovereign AI · Transparent governance</em>
</p>
