# GeoInsight BD

**National governance intelligence platform** for Bangladesh — hierarchical admin dashboards, real-time KPI feeds, Bangla sentiment analytics, and Hyperledger-backed project milestones.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-TimescaleDB-4169E1?logo=postgresql&logoColor=white)](https://www.timescale.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start (Local Development)](#quick-start-local-development)
- [How Frontend Connects to Backend](#how-frontend-connects-to-backend)
- [Environment Variables](#environment-variables)
- [Service Ports](#service-ports)
- [Running Tests](#running-tests)
- [Production Deployment](#production-deployment)
- [Observability](#observability)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [License](#license)

---

## বাংলায় সংক্ষিপ্ত নির্দেশনা

পুরো প্রজেক্ট চালাতে **৪টি ধাপ**:

1. **Infrastructure (Docker)** — রুট ফোল্ডারে:
   ```bash
   cp .env.example .env
   docker compose up -d
   ```
   এতে PostgreSQL, RabbitMQ, MinIO চালু হবে।

2. **Backend API Gateway** — `services/api-gateway-node`:
   ```bash
   cp .env.example .env   # DATABASE_URL এ localhost ব্যবহার করুন
   npm install && npx prisma migrate deploy && npm run dev
   ```
   → http://localhost:4000

3. **AI Service** — `services/ai-analytics-python`:
   ```bash
   cp .env.example .env
   python -m venv .venv && .venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
   → http://localhost:8000

4. **Frontend Dashboard** — `web/dashboard-nextjs`:
   ```bash
   cp .env.example .env.local
   npm install && npm run dev
   ```
   → http://localhost:3000

**Frontend ↔ Backend কীভাবে কাজ করে:**

- ব্রাউজার সরাসরি Gateway-এ token পাঠায় না।
- Login → Next.js `/api/auth/login` → Gateway; token **HTTP-only cookie**-তে থাকে।
- API ডেটা → `/api/proxy/...` → Gateway `/api/v1/...` (cookie থেকে Bearer token যোগ হয়)।
- Real-time → Socket.io সরাসরি Gateway (`NEXT_PUBLIC_SOCKET_URL=http://localhost:4000`)।

প্রথম login-এর জন্য README-র [Create the first admin user](#6-create-the-first-admin-user-one-time) সেকশন দেখুন।

---

GeoInsight BD is a **monorepo** containing:

| Service | Stack | Port | Responsibility |
|---------|-------|------|----------------|
| **Dashboard** | Next.js 15, Tailwind, Leaflet, Recharts | `3000` | Web UI, BFF auth proxy, real-time socket client |
| **API Gateway** | Node.js, Express, Prisma, Socket.io | `4000` | REST API, JWT/RBAC, RabbitMQ consumer, Fabric ledger |
| **AI Analytics** | Python, FastAPI, Bangla-BERT | `8000` | Sentiment analysis, public 333/999 feeds, arbitrage signals |
| **Infrastructure** | Docker Compose | — | TimescaleDB, RabbitMQ, MinIO |

---

## Architecture

```mermaid
flowchart TB
  subgraph browser [Browser]
    UI[Next.js Dashboard :3000]
  end

  subgraph bff [Next.js BFF — same origin]
    AUTH["/api/auth/*"]
    PROXY["/api/proxy/*"]
  end

  subgraph gateway [API Gateway :4000]
    REST["/api/v1/*"]
    WS[Socket.io]
    RBAC[JWT + RBAC]
  end

  subgraph ai [AI Analytics :8000]
    ML[FastAPI + Bangla-BERT]
  end

  subgraph infra [Infrastructure]
    PG[(TimescaleDB)]
    RMQ[RabbitMQ]
    S3[MinIO]
  end

  UI --> AUTH
  UI --> PROXY
  UI -->|WebSocket| WS
  AUTH --> REST
  PROXY -->|Bearer token| REST
  REST --> RBAC
  RBAC --> PG
  REST --> RMQ
  REST --> ML
  ML --> RMQ
  REST --> S3
```

**Request flow (authenticated API call):**

1. Browser calls `GET /api/proxy/kpis/definitions` (same origin, cookies attached).
2. Next.js BFF reads `gi_access_token` from HTTP-only cookie and forwards to `http://localhost:4000/api/v1/kpis/definitions` with `Authorization: Bearer …`.
3. API Gateway validates JWT, applies RBAC + admin-unit scope, queries PostgreSQL, returns JSON.
4. BFF passes the response back to the browser — **tokens never touch `localStorage`**.

**Real-time updates:**

- Dashboard opens a Socket.io connection to `NEXT_PUBLIC_SOCKET_URL` (API Gateway).
- Events: `kpi:update`, `alert:created`, dashboard refresh envelopes.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ | Postgres, RabbitMQ, MinIO |
| [Node.js](https://nodejs.org/) | **20 LTS+** | Gateway + Dashboard |
| [Python](https://www.python.org/) | **3.12+** | AI Analytics |
| Git | 2.x | Clone repository |

**Windows note:** Port `5672` is often reserved by Hyper-V. If RabbitMQ fails to bind, set `RABBITMQ_PORT=35672` in root `.env` and use `localhost:35672` in service `.env` files.

---

## Quick Start (Local Development)

### 1. Clone and configure environment

```bash
git clone <repository-url> geoinsight-bd
cd geoinsight-bd

# Root infrastructure config
cp .env.example .env
# Edit .env — change passwords and JWT_SECRET (min 32 chars)
```

### 2. Start infrastructure (Docker)

```bash
docker compose up -d
docker compose ps
```

Wait until `postgres`, `rabbitmq`, and `minio` are **healthy**.

| UI | URL | Credentials (from `.env`) |
|----|-----|---------------------------|
| RabbitMQ Management | http://localhost:15672 | `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` |
| MinIO Console | http://localhost:9001 | `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |

### 3. API Gateway (Node.js)

```bash
cd services/api-gateway-node
cp .env.example .env
```

Edit `services/api-gateway-node/.env` for **host machine** access:

```env
DATABASE_URL=postgresql://geoinsight_admin:YOUR_PASSWORD@localhost:5432/geoinsight_db?schema=public
RABBITMQ_URL=amqp://geoinsight_mq:YOUR_PASSWORD@localhost:5672/
# Windows: use port 35672 if you changed RABBITMQ_PORT
JWT_SECRET=your_secret_minimum_32_characters_long
CORS_ORIGIN=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000
```

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Gateway runs at **http://localhost:4000**  
Health check: `GET http://localhost:4000/api/v1/health`

### 4. AI Analytics (Python)

```bash
cd services/ai-analytics-python
cp .env.example .env
```

```env
RABBITMQ_URL=amqp://geoinsight_mq:YOUR_PASSWORD@localhost:5672/
SENTIMENT_USE_MOCK=true
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
```

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

AI service runs at **http://localhost:8000**  
Health check: `GET http://localhost:8000/api/v1/health`

> Set `SENTIMENT_USE_MOCK=true` for local dev without downloading Bangla-BERT weights.

### 5. Dashboard (Next.js)

```bash
cd web/dashboard-nextjs
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
API_GATEWAY_URL=http://localhost:4000
```

```bash
npm install
npm run dev
```

Open **http://localhost:3000**

### 6. Create the first admin user (one-time)

User registration (`POST /api/v1/auth/register`) requires an existing **PMO** token. Bootstrap the first PMO account via SQL:

```bash
# Generate bcrypt hash for your password (from api-gateway-node directory)
node -e "require('bcryptjs').hash('ChangeMe@123', 12).then(console.log)"
```

```sql
-- Run in psql or any PostgreSQL client
INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pmo@geoinsight.gov.bd',
  '$2a$12$PASTE_BCRYPT_HASH_HERE',
  'PMO',
  true,
  NOW(),
  NOW()
);
```

Then log in at http://localhost:3000/login with that email and password.

PMO can register additional users (Minister, DC, Union Chairman) via `POST /api/v1/auth/register`.

### Local dev — all services at a glance

Open **4 terminals**:

| # | Directory | Command | URL |
|---|-----------|---------|-----|
| 1 | repo root | `docker compose up -d` | — |
| 2 | `services/api-gateway-node` | `npm run dev` | http://localhost:4000 |
| 3 | `services/ai-analytics-python` | `uvicorn app.main:app --reload --port 8000` | http://localhost:8000 |
| 4 | `web/dashboard-nextjs` | `npm run dev` | http://localhost:3000 |

---

## How Frontend Connects to Backend

### BFF (Backend-for-Frontend) pattern

The Next.js app does **not** call the API Gateway directly from the browser for authenticated routes. Instead:

| Layer | Path | Purpose |
|-------|------|---------|
| **Browser → Next.js** | `/api/auth/login` | Login; sets HTTP-only cookies `gi_access_token`, `gi_refresh_token` |
| **Browser → Next.js** | `/api/auth/refresh` | Silent token refresh (also used by middleware) |
| **Browser → Next.js** | `/api/auth/me` | Current user profile |
| **Browser → Next.js** | `/api/auth/logout` | Clears cookies + revokes refresh token |
| **Browser → Next.js** | `/api/proxy/[...path]` | Proxies to gateway with Bearer token from cookie |
| **Browser → Gateway** | WebSocket `@ NEXT_PUBLIC_SOCKET_URL` | Real-time KPI / alert events |

### Client-side API usage

```typescript
// web/dashboard-nextjs/src/lib/api-client.ts
import { apiClient } from "@/lib/api-client";

// Calls /api/proxy/kpis/definitions → gateway /api/v1/kpis/definitions
const data = await apiClient("/kpis/definitions");
```

- **401** → auto refresh via `/api/auth/refresh`, then retry once.
- **403** → redirect to `/forbidden` (RBAC / tenant scope denied).

### Route protection

`web/dashboard-nextjs/src/middleware.ts` guards dashboard routes. Unauthenticated users are redirected to `/login`; expired access tokens trigger silent refresh.

### RBAC roles

| Role | Scope |
|------|-------|
| `PMO` | National — all divisions |
| `MINISTER` | Single division |
| `DC` | Single district |
| `UNION_CHAIRMAN` | Single union |

Admin-unit drill-down uses URL params: `?division=&district=&upazila=&union=`.

### Gateway ↔ AI Analytics

- Gateway proxies public sentiment feeds: `/api/v1/public/feeds/333|999/stream` → AI service.
- Gateway publishes/consumes RabbitMQ messages on `geoinsight_exchange`.
- AI worker processes `ai_analytics_queue` for async NLP jobs.

---

## Environment Variables

### Root `.env` (Docker infrastructure)

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `POSTGRES_*` | TimescaleDB credentials |
| `RABBITMQ_*` | Message broker credentials |
| `MINIO_*` | Object storage credentials |
| `JWT_SECRET` | Signing key for access tokens (≥ 32 chars) |
| `NEXT_PUBLIC_API_URL` | Browser-facing API base (dashboard build) |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io endpoint (dashboard) |

### Per-service overrides

| File | Used by |
|------|---------|
| `services/api-gateway-node/.env` | Local gateway (`localhost` DB/MQ URLs) |
| `services/ai-analytics-python/.env` | Local AI service |
| `web/dashboard-nextjs/.env.local` | Next.js dev server |

> **Never commit `.env` files.** They are listed in [`.gitignore`](.gitignore).

---

## Service Ports

| Service | Port | Protocol |
|---------|------|----------|
| Dashboard (Next.js) | 3000 | HTTP |
| API Gateway | 4000 | HTTP + WebSocket |
| AI Analytics | 8000 | HTTP |
| PostgreSQL | 5432 | TCP |
| RabbitMQ AMQP | 5672 | TCP |
| RabbitMQ Management | 15672 | HTTP |
| RabbitMQ Prometheus | 15692 | HTTP (internal) |
| MinIO API | 9000 | HTTP |
| MinIO Console | 9001 | HTTP |
| Prometheus (observability) | 9090 | HTTP |
| Grafana (observability) | 3002 | HTTP |

---

## Running Tests

### API Gateway (Jest + Supertest)

```bash
cd services/api-gateway-node
npm test
```

### AI Analytics (pytest)

```bash
cd services/ai-analytics-python
pip install -r requirements.txt
pytest tests/ -q
```

### Load testing (Locust)

```bash
pip install locust
cd load-tests
locust -f locustfile.py --host=http://localhost:4000
```

---

## Production Deployment

### Docker Compose (full stack)

```bash
cp .env.example .env
# Configure production secrets on the VPS

export IMAGE_TAG=latest
export GHCR_OWNER=<your-github-org>

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Production stack includes: TimescaleDB, RabbitMQ, MinIO, API Gateway, AI Analytics, Dashboard, and **nginx** (TLS termination, CSP, rate limits).

See [`docker-compose.prod.yml`](docker-compose.prod.yml) and [`deploy/nginx/nginx.conf`](deploy/nginx/nginx.conf).

### CI/CD (GitHub Actions)

On merge to `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Runs tests for all three services in parallel.
2. Builds and pushes Docker images to **GHCR** (tags: commit SHA + `latest`).
3. SSH deploys to Ubuntu VPS via `appleboy/ssh-action`.

**Required GitHub Secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_PAT`

**VPS bootstrap:** [`deploy/scripts/vps-bootstrap.sh`](deploy/scripts/vps-bootstrap.sh)

---

## Observability

Prometheus, Grafana, and Alertmanager ship as a compose overlay:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml up -d
```

| Component | Path |
|-----------|------|
| Prometheus config | [`deploy/observability/prometheus/prometheus.yml`](deploy/observability/prometheus/prometheus.yml) |
| Alert rules | [`deploy/observability/prometheus/alerts/geoinsight.rules.yml`](deploy/observability/prometheus/alerts/geoinsight.rules.yml) |
| Grafana dashboard | [`deploy/observability/grafana/dashboards/geoinsight-platform.json`](deploy/observability/grafana/dashboards/geoinsight-platform.json) |

Metrics endpoints:

- API Gateway: `GET /metrics` (express-prom-bundle)
- AI Analytics: `GET /metrics` (prometheus-fastapi-instrumentator)
- RabbitMQ: `:15692` (rabbitmq_prometheus plugin)

---

## Project Structure

```
geoinsight-bd/
├── .github/workflows/          # CI/CD pipelines
├── deploy/
│   ├── init/                   # Postgres, RabbitMQ, MinIO bootstrap
│   ├── nginx/                  # Production reverse proxy + security headers
│   ├── observability/          # Prometheus, Grafana, Alertmanager
│   ├── hyperledger/            # Fabric connection profile + wallet
│   └── security/               # Tier-4 sovereignty env templates
├── services/
│   ├── api-gateway-node/       # Express API, Prisma, Socket.io, Fabric
│   └── ai-analytics-python/    # FastAPI, Bangla-BERT, RabbitMQ worker
├── web/
│   └── dashboard-nextjs/       # Next.js 15 App Router dashboard
├── load-tests/                 # Locust scenarios
├── docker-compose.yml          # Local infrastructure only
├── docker-compose.prod.yml     # Full production stack
└── docker-compose.observability.yml
```

---

## Troubleshooting

### RabbitMQ port conflict (Windows)

```
Error: bind: An attempt was made to access a socket in a way forbidden...
```

**Fix:** In root `.env`, set `RABBITMQ_PORT=35672`, restart compose, and update `RABBITMQ_URL` in service `.env` files to use `localhost:35672`.

### Prisma migration fails

Ensure Postgres is healthy and `DATABASE_URL` matches root `.env` credentials:

```bash
docker compose ps postgres
cd services/api-gateway-node && npx prisma migrate deploy
```

### Dashboard shows login loop

- Confirm API Gateway is running on port 4000.
- Check `API_GATEWAY_URL` in `web/dashboard-nextjs/.env.local`.
- Verify `JWT_SECRET` is identical between gateway restarts (changing it invalidates tokens).

### CORS errors

Set `CORS_ORIGIN=http://localhost:3000` in the gateway `.env`. AI service needs `CORS_ORIGINS=http://localhost:3000,http://localhost:4000`.

### Socket.io not connecting

- `NEXT_PUBLIC_SOCKET_URL` must point to the gateway (not Next.js).
- In production, nginx must proxy WebSocket upgrades — see `deploy/nginx/nginx.conf`.

### AI service slow on first request

With `SENTIMENT_USE_MOCK=false`, Bangla-BERT weights download on first inference. Use mock mode locally or pre-cache models in `ml_models/cache`.

---

## Security Notes

- JWT access tokens are short-lived (15m); refresh tokens are HTTP-only cookies with rotation.
- RBAC enforces role + admin-unit tenant isolation on every protected route.
- Rate limiting: nginx → gateway → AI service (333/999 public feeds).
- Production: enable `SOVEREIGN_MODE`, disable external telemetry — see [`deploy/security/tier4-sovereignty.env.example`](deploy/security/tier4-sovereignty.env.example).
- Never expose `API_GATEWAY_URL` or database credentials to the browser — only `NEXT_PUBLIC_*` vars are client-safe.

---

## License

Proprietary — Government of Bangladesh / authorized partners. Contact the PMO technical team for usage terms.

---

<p align="center">
  <strong>GeoInsight BD</strong> — Evidence-based governance for every admin unit.
</p>
