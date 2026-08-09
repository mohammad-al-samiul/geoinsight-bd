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
- [Documentation](#documentation)
- [Quick Start (Bangla)](#quick-start-bangla)
- [Features](#features)
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
- **Narrative & unrest intel** — counter-disinfo shield, protest pulse, strategic outlook
- **Citizen sentiment** — Bangla-BERT on news + 333/999-style grievance streams
- **Procurement intelligence** — global commodity arbitrage (rice, wheat, onion, lentil)
- **PM Briefing Copilot** — morning executive summary + voice briefing (Bangla / English)
- **Sovereign Bangla LLM** — on-prem Ollama; verified DB context only
- **Weather & crisis pulse** — Open-Meteo / GDACS + divisional risk overlay
- **Blockchain audit trail** — Hyperledger Fabric milestone anchoring

| Service | Stack | Port (host) | Role |
|---------|-------|-------------|------|
| **Dashboard** | Next.js 15, Tailwind, Leaflet, Recharts, next-intl | `3000` | Web UI, BFF auth proxy, Socket.io client |
| **API Gateway** | Node.js 20, Express, Prisma, Socket.io | `4800` (default; see `.env`) | REST API, JWT / RBAC, RabbitMQ, Fabric |
| **AI Analytics** | Python 3.12, FastAPI, Bangla-BERT, Ollama client | internal `8000` | NLP, briefing, predictive scoring |
| **Infrastructure** | Docker Compose | — | TimescaleDB, PgBouncer, Redis, RabbitMQ, MinIO |

Architecture, CI/CD, and Ollama details live under **[docs/](docs/README.md)** — এই README শুধু quick start ও feature index।

---

## Documentation

System design, CI/CD, VPS, এবং Ollama **`docs/`**-এ আলাদা page — README শুধু integrate করে link দেয়।

| Document | কী পাবেন |
|----------|----------|
| **[Docs hub](docs/README.md)** | সব docs-এর index + nav map |
| **[System Design](docs/SYSTEM_DESIGN.md)** | HLD, LLD, ERD, tech stack rationale, ADR |
| **[CI/CD · VPS · Ops](docs/DEPLOYMENT_AND_OPS.md)** | Deploy pipeline, slim VPS, performance, day-to-day ops |
| **[Ollama Production](docs/OLLAMA_PRODUCTION.md)** | আলাদা AI server + `OLLAMA_URL` setup |
| **[API Gateway README](services/api-gateway-node/README.md)** | Gateway modules + local run |
| **[AI Analytics README](services/ai-analytics-python/README.md)** | FastAPI modules + Ollama |
| **[Dashboard README](web/dashboard-nextjs/README.md)** | Next.js BFF + pages |
| **[`.env.example`](.env.example)** | Local Windows / Docker Desktop |
| **[`.env.production.example`](.env.production.example)** | Hostinger / production VPS |

```
README  ──►  docs/README.md
               ├─ SYSTEM_DESIGN.md
               ├─ DEPLOYMENT_AND_OPS.md
               └─ OLLAMA_PRODUCTION.md
         ──►  services/*/README.md · web/dashboard-nextjs/README.md
```

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
| http://localhost:3600 | Dashboard (host port; container still listens on 3000) |
| http://localhost:4800/api/v1/health | API Gateway (default host port) |
| AI Analytics | Docker অভ্যন্তরে `ai-analytics:8000` (API দিয়ে proxy) |

**Login:** `pmo@geoinsight.gov.bd` / `ChangeMe@123`

`db-init` automatically চলে — divisions, projects, KPIs, red flags seed হয়।

বিস্তারিত architecture → [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) · deploy → [docs/DEPLOYMENT_AND_OPS.md](docs/DEPLOYMENT_AND_OPS.md)

### Option B — Manual local development (৪টা terminal)

1. **Infrastructure:** `docker compose up -d`
2. **API Gateway:** `cd services/api-gateway-node && npm run dev` → `:4000` (service port; Docker host often `4800`)
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
| Narrative Shield | `/narrative-shield` | Counter-disinfo: classify, fact-check, RAG debunk, escalate |
| Strategic Outlook | `/outlook` | Politics / economy themes, direction, scenarios (Ollama) |
| Unrest Pulse | `/unrest` | Protest / grievance pulse from ingested BD news |
| Anti-Phishing Shield | `/anti-phishing` | Official site fingerprints vs lookalike URLs (`RED_FLAG`) |
| Procurement Advisor | `/procurement` | Commodity landed cost + lead time |
| Notifications | `/notifications` | Live red-flag / anomaly notification center |

### Governance & Operations (Tier 2)

| Page | Path | Description |
|------|------|-------------|
| Flood & Cyclone Risk | `/hazards` | Hazard overlay + live weather (Open-Meteo / GDACS) |
| Representative KPIs | `/kpis` | MP / Minister / DC performance metrics |
| Project Tracker | `/projects` | Budget, status, red flags, blockchain |
| Red Flag Alerts | `/alerts` | Predictive scan + live anomaly feed |
| Document Intelligence | `/documents` | Tender / contract anomaly detection |
| AI Audit Trail | `/audit-trail` | Red flag → AI → action timeline |

### Field & Local (Tier 3–4)

| Page | Path | Description |
|------|------|-------------|
| Agri Markets | `/agro` | Mandi, haat, retail market registry |
| Divisional Crisis | `/divisional-crisis` | Division risk pulse (alerts + grievance + weather) |
| Geo Spatial Map | `/map` | Full command map viewport |
| Representatives | `/representatives` | Directory + Accountability AI scores |

### Backend / AI modules (API-backed; UI via command search or panels)

| Capability | Paths / APIs | Notes |
|------------|--------------|-------|
| Sovereign Bangla LLM | Gateway `/sovereign-llm/*` · AI `/sovereign-llm/chat` | On-prem Ollama; verified DB context |
| Digital Twin | Gateway `/twin/*` | Budget reallocation simulation |
| Sentiment heatmap | Gateway `/intelligence/sentiment/*` | Bangla-BERT on 333/999 + news |
| Impact Simulator | Gateway `/simulator/*` | Geopolitical shock scenarios |
| Citizen Chatbot | Gateway `/citizen/*` | 333/999 routing |
| Proximity geo-fence | Gateway `/intelligence/proximity/*` | Shapely polygons (PMO / VIP) |
| Face Intel | Gateway `/intelligence/face-intel/*` | OpenCV VIP match + ethical card |
| News ingestion | Gateway `/ingestion/*` · AI `/ingestion/fetch` | RSS + Google News → `external_articles` |
| Pipeline orchestrator | Gateway `/pipeline/*` | Cron sync: news, weather, unrest, outlook, … |
| Intel store | Gateway `/intel/*` | Snapshots + pipeline/ingestion run history |
| Live weather | Gateway `/weather/live` · AI `/weather/fetch` | Feeds hazards + divisional crisis |

### Global UI

- **Admin Cascade Filter** — Division → District → Upazila → Union
- **Command Search** — `Ctrl+K` across pages, projects, KPIs, alerts
- **Notification Center** — `/notifications` + live red flag bell
- **AI Anomaly Feed** — right panel, Socket.io live
- **Locale Switcher** — বাংলা / English

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

Open **http://localhost:3600** — login: `pmo@geoinsight.gov.bd` / `ChangeMe@123`

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
| MinIO Console | http://localhost:19001 |

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
ollama pull gpt-oss:20b
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
| RabbitMQ | `RABBITMQ_*`, `RABBITMQ_URL` — **async job bus** (gov / AI queues) |
| Redis | `REDIS_*`, `REDIS_URL` — **cache + rate limit + Socket.io** (not BullMQ) |
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

Defaults follow [`.env.example`](.env.example) (Windows-friendly host mappings).

| Service | Host port (local) | Protocol | Notes |
|---------|-------------------|----------|-------|
| Dashboard (Next.js) | 3000 | HTTP | |
| API Gateway | **4800** | HTTP + WebSocket | Container listens on 4000 |
| AI Analytics | — (internal) | HTTP | `ai-analytics:8000` inside Docker |
| PostgreSQL | 55432 | TCP | Internal 5432 |
| PgBouncer | 6432 | TCP | |
| Redis | 6379 | TCP | |
| RabbitMQ AMQP | 5672 | TCP | Use `35672` if Hyper-V blocks |
| RabbitMQ Management | 15672 | HTTP | |
| MinIO API | **19000** | HTTP | Avoid Hyper-V block on 9000 |
| MinIO Console | **19001** | HTTP | |
| Ollama | 11434 | HTTP | Host or dedicated AI server |
| Prometheus | 9090 | HTTP | observability overlay |
| Grafana | 3002 | HTTP | observability overlay |

**Windows note:** Ports `5432`, `4000`, `8000`, `9000` often Hyper-V reserved — prefer values in `.env.example`.

More port rationale → [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) (service ports section).

---

## API Modules

Base path: `/api/v1`

### Gateway modules

| Module | Key endpoints | Roles (typical) |
|--------|---------------|-----------------|
| `auth` | `POST /auth/login`, `/register`, `/refresh` | Public / PMO |
| `dashboard` | `GET /dashboard/national` | PMO, MINISTER |
| `briefing` | `GET /briefing/morning?lang=bn` | PMO |
| `narrative-shield` | `/narrative-shield/feed`, `/debunk`, `/escalate`, … | PMO, MINISTER (, DC read) |
| `outlook` | `GET /outlook/strategic`, `POST /outlook/refresh` | PMO, MINISTER (, DC read) |
| `unrest` | `GET /unrest/pulse`, `POST /unrest/refresh` | PMO, MINISTER (, DC read) |
| `divisional-crisis` | `GET /divisional-crisis/pulse` | PMO, MINISTER, DC |
| `weather` | `GET /weather/live` | PMO, MINISTER, DC |
| `ingestion` | `/ingestion/sync`, `/articles`, `/stats` | PMO, MINISTER |
| `pipeline` | `/pipeline/status`, `/pipeline/sync/:job` | PMO, MINISTER |
| `intel` | `/intel/stats`, `/snapshots/history`, run history | PMO, MINISTER |
| `sovereign` | `POST /sovereign-llm/chat` | PMO, MINISTER |
| `twin` | `POST /twin/simulate` | PMO |
| `intelligence` | sentiment, predictive, phishing, proximity, face-intel, … | PMO, MINISTER |
| `simulator` | `POST /simulator/run` | PMO |
| `procurement` | `POST /procurement/advise` | PMO |
| `projects` / `kpis` / `alerts` | CRUD-style scoped routes | Scoped |
| `search` | `GET /search?q=` | Authenticated |
| `public-feed` | `/public/feeds/333\|999/stream` | Rate-limited |

Full register list: `services/api-gateway-node/src/modules/register-modules.ts`

### AI Analytics routes

| Router | Path | Purpose |
|--------|------|---------|
| `briefing` | `/briefing/generate` | Morning narrative |
| `narrative_shield` | `/narrative-shield/classify`, `/debunk`, `/fact-check` | Counter-disinfo NLP |
| `outlook` | `/outlook/generate` | Strategic outlook LLM |
| `weather` | `/weather/fetch` | Open-Meteo + disaster feeds |
| `ingestion` | `/ingestion/fetch`, `/sources` | RSS / Google News fetch |
| `sovereign_llm` | `/sovereign-llm/chat` | Verified-context chat |
| `sentiment` | `/sentiment/heatmap`, `/analyze` | Bangla-BERT |
| `predictive` | `/predictive/score` | Project risk scoring |
| `arbitrage` | `/arbitrage/*` | Commodity price engine |
| `procurement` | `/procurement/advise` | Landed cost ranking |
| `phishing` / `proximity` / `face_intel` | DSS modules | Cyber / GIS / CV |
| `documents` / `hazards` / `twin` / `simulator` / `citizen` | module paths | Intelligence APIs |

---

## Dashboard Pages & RBAC

Sidebar filter: `minTier >= userTier` (PMO=`1` … UNION_CHAIRMAN=`4`); **PMO always sees everything**.

| Tier | Role | Sidebar visibility (approx.) |
|------|------|------------------------------|
| 1 | PMO | All pages |
| 2 | MINISTER | Hazards, KPIs, Projects, Alerts, Documents, Audit Trail (+ shared) |
| 3 | DC | Agro (+ Divisional Crisis, Representatives) |
| 4 | UNION_CHAIRMAN | Divisional Crisis, Representatives |

Gateway `requireRoles` is often **wider** than sidebar (e.g. DC can call unrest/outlook APIs even if nav is PMO-only). See [System Design](docs/SYSTEM_DESIGN.md) §২.১৫–২.২০.
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
| **Analyze** | Bangla-BERT sentiment + geo-match |
| **Auto sync** | Gateway `pipeline` / ingestion worker (`INGESTION_INTERVAL_MS`) |
| **Consumers** | Unrest pulse, Narrative Shield, Outlook, Briefing, Sentiment |

Manual: `POST /api/v1/ingestion/sync` or `POST /api/v1/pipeline/sync/news` (PMO / MINISTER).

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

এই README-তে শুধু entry points — full guide docs-এ।

| Topic | Document |
|-------|----------|
| CI/CD + VPS + slim stack + **কেন** | **[docs/DEPLOYMENT_AND_OPS.md](docs/DEPLOYMENT_AND_OPS.md)** |
| Remote Ollama (step-by-step) | **[docs/OLLAMA_PRODUCTION.md](docs/OLLAMA_PRODUCTION.md)** |
| Architecture | **[docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)** |
| Docs index | **[docs/README.md](docs/README.md)** |

Everyday Hostinger: `git push origin main` → GitHub Actions → `vps-redeploy.sh`.

```bash
# Manual on VPS
cd /opt/geoinsight-bd
bash deploy/scripts/vps-redeploy.sh --force
```

- Auto workflow: [`.github/workflows/deploy-vps.yml`](.github/workflows/deploy-vps.yml)  
- Optional GHCR: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)  
- Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`  
- Env: [`.env.production.example`](.env.production.example)

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
├── docs/
│   ├── README.md                   # Docs hub (start here)
│   ├── SYSTEM_DESIGN.md            # HLD / LLD / ERD / ADR
│   ├── DEPLOYMENT_AND_OPS.md       # CI/CD, VPS, performance
│   └── OLLAMA_PRODUCTION.md        # Dedicated Ollama server
├── .github/workflows/              # deploy-vps.yml, deploy.yml
├── deploy/                         # nginx, init, scripts, observability
├── services/
│   ├── api-gateway-node/           # Express API + Prisma + Socket.io
│   │   └── README.md
│   ├── ai-analytics-python/        # FastAPI + Bangla-BERT + Ollama client
│   │   └── README.md
│   └── postgres/                   # DB image / extensions helpers
├── web/dashboard-nextjs/           # Next.js 15 App Router
│   └── README.md
├── docker-compose.yml              # Infrastructure
├── docker-compose.apps.yml         # Gateway, AI, Dashboard
├── docker-compose.vps.yml          # Slim Hostinger profile
└── docker-compose.ollama.yml       # Dedicated AI server
```

Full monorepo map → [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md#১১-monorepo-structure).

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
