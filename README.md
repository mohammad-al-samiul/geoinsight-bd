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
- [Quick Start](#quick-start)
- [Features](#features)
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
- **Education · Health · Jobs board** — 64-district sector snapshots (`/sectors`)
- **Local Entity DSS** — MP / Mayor ward desks (CTG-8/9/10, CCC, COCC) + PMO oversight
- **AI anomaly detection** — budget overrun, delay, contractor fraud patterns
- **Narrative & unrest intel** — counter-disinfo shield, protest pulse, strategic outlook
- **Citizen sentiment** — Bangla-BERT on news + 333/999-style grievance streams
- **Procurement intelligence** — global commodity arbitrage (rice, wheat, onion, lentil)
- **PM Briefing Copilot** — morning executive summary + voice briefing (Bangla / English)
- **Sovereign Bangla LLM** — on-prem Ollama; verified DB context only
- **Weather & crisis pulse** — Open-Meteo / GDACS + divisional risk overlay
- **Blockchain audit trail** — Hyperledger Fabric milestone anchoring
- **Optional TOTP MFA** — login step + `/local/security` setup

| Service | Stack | Port (host) | Role |
|---------|-------|-------------|------|
| **Dashboard** | Next.js 15, Tailwind, Leaflet, Recharts, next-intl | `3000` | Web UI, BFF auth proxy, Socket.io client |
| **API Gateway** | Node.js 20, Express, Prisma, Socket.io | `4800` (default; see `.env`) | REST API, JWT / RBAC, RabbitMQ, Fabric |
| **AI Analytics** | Python 3.12, FastAPI, Bangla-BERT, Ollama client | internal `8000` | NLP, briefing, predictive scoring |
| **Infrastructure** | Docker Compose | — | TimescaleDB, PgBouncer, Redis, RabbitMQ, MinIO |

Architecture, CI/CD, এবং Ollama details live under **[docs/](docs/README.md)** — এই README শুধু quick start ও feature index।

---

## Documentation

System design, CI/CD, VPS, এবং Ollama **`docs/`**-এ Markdown — README শুধু integrate করে link দেয়।

| Document | কী পাবেন |
|----------|----------|
| **[Docs hub](docs/README.md)** | সব docs-এর index + nav map |
| **[System Design](docs/SYSTEM_DESIGN.md)** | SRS, HLD, LLD, ERD, tech stack, Local DSS, cost/TCO, ADR |
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

## Quick Start

### Option A — এক কমান্ডে full stack (Windows, recommended)

```powershell
git clone <repository-url> geoinsight-bd
cd geoinsight-bd
cp .env.example .env          # প্রথমবার — strong passwords + JWT_SECRET (≥ 32 chars)
.\deploy\scripts\docker-up.ps1
```

| URL | Service |
|-----|---------|
| http://localhost:3600 | Dashboard (host port; container still listens on 3000) |
| http://localhost:4800/api/v1/health | API Gateway (default host port) |
| AI Analytics | Docker অভ্যন্তরে `ai-analytics:8000` (API দিয়ে proxy) |

**Login** (সব demo password `ChangeMe@123`):

| Role | Email |
|------|-------|
| PMO | `pmo@geoinsight.gov.bd` |
| Minister | `minister@geoinsight.gov.bd` |
| DC | `dc.dhaka@geoinsight.gov.bd` |
| MP (CTG-8) | `mp.ctg8@geoinsight.gov.bd` |
| Mayor (CCC) | `mayor.ccc@geoinsight.gov.bd` |

`db-init` automatically চলে — national hierarchy + local entities (wards, complaints, sectors, integrity) seed হয়।

বিস্তারিত architecture → [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) · deploy → [docs/DEPLOYMENT_AND_OPS.md](docs/DEPLOYMENT_AND_OPS.md)

### Option B — Manual local development (৪টা terminal)

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

Gateway service port `:4000` — Docker host mapping often `4800`.

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

**Frontend ↔ Backend:** Browser সরাসরি JWT দেখে না। Login → Next.js **BFF** → HTTP-only cookie → `/api/proxy/*` → Gateway `/api/v1/*`. Real-time → **Socket.io** সরাসরি Gateway-এ।

---

## Features

Sidebar: `web/dashboard-nextjs/src/components/layout/sidebar.tsx`. MP / MAYOR শুধু `/local/*` দেখে; PMO সব national + Local DSS oversight (`?entityId=`).

### National command (PMO-heavy)

| Page | Path | Description |
|------|------|-------------|
| National Overview | `/` | Choropleth, live KPIs, PMO local-desk strip, national sector strip |
| PM Briefing Copilot | `/briefing` | AI morning bullets, voice TTS, local evidence snippets |
| Narrative Shield | `/narrative-shield` | Counter-disinfo: classify, fact-check, RAG debunk, escalate, CSV |
| Strategic Outlook | `/outlook` | Politics / economy themes, direction, scenarios (Ollama) |
| Unrest Pulse | `/unrest` | National protest / grievance pulse from ingested BD news |
| Education · Health · Jobs | `/sectors` | 64-district sector board (PMO, MINISTER) |
| Anti-Phishing Shield | `/anti-phishing` | Official `.gov.bd` fingerprints vs lookalike URLs (`RED_FLAG`) |
| Procurement Advisor | `/procurement` | Commodity landed cost + lead time |
| Notifications | `/notifications` | Live red-flag / anomaly notification center |

`/dashboard` এবং `/map` → `/` redirect।

### Governance & field

| Page | Path | Typical nav |
|------|------|-------------|
| Flood & Cyclone Risk | `/hazards` | PMO, MINISTER, DC |
| Representative KPIs | `/kpis` | PMO, MINISTER, DC |
| Project Tracker | `/projects` | Budget, status, red flags, blockchain |
| Red Flag Alerts | `/alerts` | Predictive scan + live anomaly feed |
| Document Intelligence | `/documents` | Tender / contract anomaly detection |
| AI Audit Trail | `/audit-trail` | Red flag → AI → action timeline |
| Agri Markets | `/agro` | Mandi, haat, retail |
| Divisional Crisis | `/divisional-crisis` | 8-division risk + PMO integrity hits |
| Representatives | `/representatives` | Directory + Accountability AI scores |
| Face Intel | `/face-intel` | OpenCV VIP match + 6-month ethical card |
| Local DSS (PMO) | `/local` | Oversight into CTG-8/9/10, CCC, COCC |

### Local Entity DSS (MP / Mayor + PMO)

Ward-level action — catalog: **CTG-8, CTG-9, CTG-10, CCC, COCC**. Gateway: `/local-entity/*`. AI: `/local-ai/*`.

| Page | Path | Description |
|------|------|-------------|
| Overview / morning brief | `/local` | Catalog, brief, CSV / WhatsApp digest |
| Field snapshot | `/local/field` | Phone-first queue + offline field brief |
| Complaints & SLA | `/local/complaints` | 24h SLA, AI triage, before/after photo |
| Heatmap | `/local/heatmap` | Aggregated map layers (complaints, outages, sites) |
| Visits | `/local/visits` | WPI / red-alert visit planner + AI top-3 |
| WPI | `/local/wpi` | Ward Performance Index + AI explain |
| Scorecard | `/local/scorecard` | Ward / seat comparison |
| Budget | `/local/budget` | Entity ADP burn + stall risk |
| OSINT | `/local/osint` | Keyword news + propaganda flag |
| Pulse | `/local/pulse` | Influencers, polling, events + **local unrest** |
| Evidence | `/local/evidence` | Thesis / expert / policy abstracts |
| Education | `/local/education` | School pressure (attendance, dropout, teachers) |
| Health | `/local/health` | Clinic load, dengue, stockouts |
| Jobs | `/local/jobs` | Unemployment heat, training seats |
| Crime | `/local/crime` | Theft / snatch / night-hour desk |
| Corruption | `/local/corruption` | Tender flags, holding-tax, bribe reports |
| Command room | `/local/command` | Multi-layer overlay + what-if (not persisted) |
| Specialty | `/local/specialty` | Entity packs + AI anomaly scan |
| Outages | `/local/outage` | Power / gas / fuel / water / drainage / road / internet |
| Alert delivery | `/local/alerts` | WhatsApp / voice crisis log + retry |
| Security | `/local/security` | TOTP MFA setup |

### Search-indexed panels (no dedicated nav page)

Ctrl+K থেকে খোলা যায়; backend আছে, sidebar-এ আলাদা route নেই।

| Capability | Gateway | Notes |
|------------|---------|-------|
| Sovereign Bangla LLM | `/sovereign-llm/*` | On-prem Ollama; verified DB context |
| Digital Twin | `/twin/*` | Budget reallocation simulation |
| Sentiment heatmap | `/intelligence/sentiment/*` | Bangla-BERT on 333/999 + news |
| Impact Simulator | `/simulator/*` | Geopolitical shock scenarios |
| Citizen Chatbot | `/citizen/*` | 333/999 routing (also public) |
| Proximity geo-fence | `/intelligence/proximity/*` | Shapely polygons (PMO / VIP) |
| News ingestion | `/ingestion/*` | RSS + Google News → `external_articles` |
| Pipeline orchestrator | `/pipeline/*` | Cron: news, weather, unrest, outlook, … |
| Intel store | `/intel/*` | Snapshots + pipeline / ingestion history |
| Live weather | `/weather/live` | Feeds `/hazards` + divisional crisis |

### Global UI

- **Admin Cascade Filter** — Division → District → Upazila → Union
- **Command Search** — `Ctrl+K` across pages, projects, KPIs, alerts
- **Notification Center** — `/notifications` + live red flag bell
- **AI Anomaly Feed** — right panel, Socket.io live
- **Locale Switcher** — বাংলা / English
- **PMO local roll-up** — national home + divisional-crisis integrity hits

---

## How Frontend Connects to Backend

### BFF pattern

| Browser path | Purpose |
|--------------|---------|
| `POST /api/auth/login` | Login → cookies, or MFA challenge (`requiresMfa`) |
| `POST /api/auth/mfa/verify` | TOTP complete login → cookies |
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
| `auth` | `POST /auth/login`, `/refresh`, `/mfa/*` | Public login; MFA setup = authenticated |
| `dashboard` | `GET /dashboard/national` | PMO, MINISTER |
| `briefing` | `GET /briefing/morning?lang=bn` | PMO, MINISTER |
| `narrative-shield` | `/narrative-shield/feed`, `/debunk`, `/escalate`, … | PMO, MINISTER (, DC read) |
| `outlook` | `GET /outlook/strategic`, `POST /outlook/refresh` | PMO, MINISTER (, DC read) |
| `unrest` | `GET /unrest/pulse`, `POST /unrest/refresh` | PMO, MINISTER (, DC read) |
| `national-sector` | `GET /national-sector/board` | PMO, MINISTER |
| `divisional-crisis` | `GET /divisional-crisis/pulse` | PMO, MINISTER, DC |
| `local-entity` | `/local-entity/overview`, `/complaints`, `/wpi`, `/sector`, `/integrity`, `/evidence`, `/command`, … | PMO, MP, MAYOR |
| `weather` | `GET /weather/live` | PMO, MINISTER, DC |
| `ingestion` | `/ingestion/sync`, `/articles`, `/stats` | PMO, MINISTER |
| `pipeline` | `/pipeline/status`, `/pipeline/sync/:job` | PMO, MINISTER |
| `intel` | `/intel/stats`, `/snapshots/history`, run history | PMO, MINISTER |
| `sovereign` | `POST /sovereign-llm/chat` | PMO, MINISTER |
| `twin` | `POST /twin/simulate` | PMO, MINISTER |
| `intelligence` | sentiment, predictive, phishing, proximity, face-intel, … | PMO, MINISTER (, DC) |
| `simulator` | `POST /simulator/run` | PMO, MINISTER |
| `procurement` | `POST /procurement/advise` | PMO, MINISTER |
| `projects` / `kpis` / `alerts` | CRUD-style scoped routes | Scoped |
| `search` | `GET /search?q=` | All authenticated roles |
| `public-feed` | `/public/feeds/333\|999/stream` | Rate-limited |
| `citizen` | `POST /citizen/chat` | Public (rate-limited) |

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
| `local_ai` | `/local-ai/morning-brief`, `/complaint-triage`, `/wpi-explain`, … | Local DSS LLM + photo QA |
| `documents` / `hazards` / `twin` / `simulator` / `citizen` | module paths | Intelligence APIs |

---

## Dashboard Pages & RBAC

Sidebar: `minTier` + optional `roles[]`. **PMO** always sees national nav. **MP / MAYOR** are forced onto `/local/*` (`role-route-guard.tsx`).

| Tier | Role | Scope | What they see |
|------|------|-------|----------------|
| 1 | PMO | National | All national pages + `/local` oversight (`?entityId=`) |
| 2 | MINISTER | Division | Hazards, KPIs, projects, alerts, docs, audit, **`/sectors`**, shared |
| 3 | DC | District | Agro + divisional-crisis, representatives, face-intel |
| 4 | UNION_CHAIRMAN | Union | Divisional crisis, representatives, face-intel |
| 5 | MP | Constituency | Local DSS tree only |
| 5 | MAYOR | City Corporation | Local DSS tree only |

Gateway `requireRoles` is often **wider** than sidebar (e.g. DC can call unrest/outlook APIs even if nav is PMO-only). See [System Design](docs/SYSTEM_DESIGN.md) §২.১৫–২.২২.

---

## Data Seeding

Automatic via `deploy/scripts/docker-db-init.sh` — core `seed-national-data.sql` তারপর `deploy/scripts/seed/01-*.sql` … `24-*.sql` (idempotent `ON CONFLICT`).

| Scripts | Contents |
|---------|----------|
| `01`–`10` | Districts, upazilas, reps, projects, agro, KPIs, red flags, commodities, demo users, extra national |
| `11`–`18` | Local entities (CTG-8/9/10, CCC, COCC + 68 wards), complaints/WPI, OSINT/pulse, specialty, alerts, outages, visits |
| `19`–`24` | Map-layer topics, local unrest, evidence, sector sites, integrity incidents, **national sector snapshots** |
| `fix-admin-unit-bn.sql` / `bootstrap-pmo.sql` | Bengali labels + PMO password |

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
| **Consumers** | Unrest pulse, Narrative Shield, Outlook, Briefing, Sentiment, **local OSINT / unrest** |

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
│   ├── SYSTEM_DESIGN.md            # SRS / HLD / LLD / ERD / ADR / cost
│   ├── DEPLOYMENT_AND_OPS.md       # CI/CD + VPS
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
- Optional **TOTP MFA** (`/api/v1/auth/mfa/*`, local security panel)
- RBAC + admin-unit tenant isolation on protected routes (PMO / MINISTER / DC / UNION_CHAIRMAN / MP / MAYOR)
- Rate limiting: nginx → gateway → AI (333/999 feeds)
- Production: `SOVEREIGN_MODE`, no external telemetry
- Never expose `DATABASE_URL` / `JWT_SECRET` to the browser — only `NEXT_PUBLIC_*` is client-safe

---

## License

Proprietary — Government of Bangladesh / authorized partners.

---

**GeoInsight BD** — Evidence-based governance for every admin unit. National data · Sovereign AI · Transparent governance
