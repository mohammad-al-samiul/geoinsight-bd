# API Gateway (Node.js)

Express + TypeScript gateway for GeoInsight BD — REST `/api/v1`, JWT/RBAC, Prisma (TimescaleDB), Socket.io, RabbitMQ consumers, and proxies to AI Analytics.

**Monorepo docs:** [Root README](../../README.md) · [System Design](../../docs/SYSTEM_DESIGN.md) · [Docs hub](../../docs/README.md)

---

## Role

| Concern | Detail |
|---------|--------|
| Auth | Login / refresh / register / **TOTP MFA**; HTTP-only cookies set by Next.js BFF |
| Data | Prisma write + read clients via PgBouncer |
| Real-time | Socket.io + Redis adapter; hierarchy rooms |
| Async | RabbitMQ `gov_core_queue` consumer → dashboard broadcasts |
| AI | Sync HTTP to `AI_SERVICE_URL` for NLP / LLM / CV modules |
| Blockchain | Optional Hyperledger Fabric milestone queue |

---

## Local run

```bash
# From repo root: infra first
docker compose up -d

cd services/api-gateway-node
cp .env.example .env   # or reuse root DATABASE_URL / REDIS_URL
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev            # default :4000 (Docker host often maps 4800)
```

Health: `GET /api/v1/health`

---

## Module map

Registered in `src/modules/register-modules.ts`:

| Module | Responsibility |
|--------|----------------|
| `auth`, `admin-unit`, `representative` | Identity & hierarchy |
| `kpi`, `project`, `alert`, `agro-market` | Core governance data |
| `dashboard`, `briefing`, `search` | Aggregations & discovery |
| `intelligence`, `sovereign`, `twin`, `simulator`, `procurement`, `citizen` | AI-backed DSS proxies |
| `narrative-shield`, `unrest`, `outlook`, `divisional-crisis`, `national-sector` | News / intel / district sector board |
| `local-entity` | MP/Mayor DSS — complaints, WPI, sectors, integrity, evidence, command, outages |
| `weather`, `ingestion`, `pipeline`, `intel` | Feeds, cron orchestration, snapshots |
| `blockchain`, `public-feed`, `audit-trail`, `health` | Ledger, 333/999, audit, probes |

---

## Key env

See root [`.env.example`](../../.env.example) and local `.env.example`.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` / `DATABASE_READ_URL` | PgBouncer write / read |
| `DIRECT_DATABASE_URL` | Migrations only |
| `REDIS_URL` | Cache, denylist, Socket.io |
| `RABBITMQ_URL` | Async bus |
| `JWT_SECRET` | Access tokens (≥ 32 chars) |
| `AI_SERVICE_URL` | FastAPI base (e.g. `http://localhost:8000`) |
| `FABRIC_ENABLED` | Hyperledger on/off |

---

## Tests

```bash
npm test
```

Schema source of truth: `prisma/schema.prisma`
