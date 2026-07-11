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
- [Features](#features)
- [System Design](#system-design)
  - [সিস্টেম ডিজাইন (বাংলা)](#সিস্টেম-ডিজাইন-বাংলা)
  - [System Design (English)](#system-design-english)
- [Quick Start](#quick-start)
- [How Frontend Connects to Backend](#how-frontend-connects-to-backend)
- [Environment Variables](#environment-variables)
- [Service Ports](#service-ports)
- [API Modules](#api-modules)
- [Dashboard Pages & RBAC](#dashboard-pages--rbac)
- [Data Seeding](#data-seeding)
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
- **PM Briefing Copilot** — morning executive summary + voice briefing (Bangla/English)
- **Sovereign Bangla LLM** — on-prem Ollama; verified DB context only
- **Blockchain audit trail** — Hyperledger Fabric milestone anchoring

| Service | Stack | Port | Responsibility |
|---------|-------|------|----------------|
| **Dashboard** | Next.js 15, Tailwind, Leaflet, Recharts, next-intl | `3000` | Web UI, BFF auth proxy, Socket.io client |
| **API Gateway** | Node.js 20, Express, Prisma, Socket.io | `4000` | REST API, JWT/RBAC, RabbitMQ, Fabric |
| **AI Analytics** | Python 3.12, FastAPI, Bangla-BERT, Ollama | `8000` | NLP, briefing, predictive scoring, arbitrage |
| **Infrastructure** | Docker Compose | — | TimescaleDB, PgBouncer, Redis, RabbitMQ, MinIO |

---

## বাংলায় সংক্ষিপ্ত নির্দেশনা

### এক কমান্ডে পুরো স্ট্যাক (Windows — সবচেয়ে সহজ)

```powershell
cd geoinsight-bd
cp .env.example .env          # প্রথমবার
.\deploy\scripts\docker-up.ps1
```

| URL | কাজ |
|-----|-----|
| http://localhost:3000 | Dashboard |
| http://localhost:4000/api/v1/health | API Gateway |
| http://localhost:8000/api/v1/health | AI Service |

**লগইন:** `pmo@geoinsight.gov.bd` / `ChangeMe@123`

`db-init` অটো চালে — seed ডেটা (বিভাগ, প্রকল্প, KPI, red flag) ঢোকে।

### ম্যানুয়াল ডেভেলপমেন্ট (৪ টার্মিনাল)

1. **Infrastructure:** `docker compose up -d`
2. **Gateway:** `cd services/api-gateway-node && npm run dev` → `:4000`
3. **AI:** `cd services/ai-analytics-python && uvicorn app.main:app --reload --port 8000`
4. **Dashboard:** `cd web/dashboard-nextjs && npm run dev` → `:3000`

**Frontend ↔ Backend:** ব্রাউজার সরাসরি token দেখে না। Login → Next.js BFF → HTTP-only cookie → `/api/proxy/*` → Gateway `/api/v1/*`. Real-time → Socket.io সরাসরি Gateway।

---

## Features

### PMO Command (Tier 1)

| Page | Path | Description |
|------|------|-------------|
| National Overview | `/` | Choropleth map, 3 live KPI scorecards, red flag markers |
| Command Dashboard | `/dashboard` | Same national command viewport |
| PM Briefing Copilot | `/briefing` | AI morning bullets, narrative, voice TTS |
| Sovereign Bangla LLM | `/sovereign-ai` | On-prem chat over verified DB context |
| KPI Digital Twin | `/digital-twin` | Budget reallocation simulation by division |
| Citizen Sentiment | `/sentiment` | 333/999 grievance heatmap (Bangla-BERT) |
| Impact Simulator | `/simulator` | Geopolitical shock → Remittance/RMG impact |
| Procurement Advisor | `/procurement` | Commodity landed cost + lead time comparison |

### Governance & Operations (Tier 2)

| Page | Path | Description |
|------|------|-------------|
| Representative KPIs | `/kpis` | MP/Minister/DC performance metrics |
| Project Tracker | `/projects` | Budget, status, red flags, blockchain |
| Red Flag Alerts | `/alerts` | Predictive scan + live anomaly feed |
| Document Intelligence | `/documents` | Tender/contract anomaly detection |
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

## System Design

| Language | Section |
|----------|---------|
| **বাংলা** | [সিস্টেম ডিজাইন (বাংলা)](#সিস্টেম-ডিজাইন-বাংলা) |
| **English** | [System Design (English)](#system-design-english) |

নিচে **বাংলা** ও **English** — দুই ভাষায় আর্কিটেকচার ডায়াগ্রাম ও ব্যাখ্যা আছে। প্রতিটি সেকশনে চিত্রের আগে/পরে সংক্ষিপ্ত বর্ণনা দেওয়া হয়েছে।

---

### সিস্টেম ডিজাইন (বাংলা)

#### ১. উচ্চ-স্তরের আর্কিটেকচার

GeoInsight BD একটি **মডুলার মনোরেপো** — চারটি স্তরে ভাগ: Presentation (Dashboard), Application (Gateway), Intelligence (AI), Data (DB/Cache/Storage)। ব্রাউজার সরাসরি Gateway-এ যায় না; Next.js BFF cookie দিয়ে auth করে। Gateway PgBouncer দিয়ে read/write split DB ব্যবহার করে, RabbitMQ দিয়ে async job চালায়, Socket.io দিয়ে live update পাঠায়।

| স্তর | সেবা | দায়িত্ব |
|------|------|----------|
| **Presentation** | Next.js Dashboard (:3000) | UI, BFF auth proxy, Socket.io client |
| **Application** | API Gateway (:4000) | REST API, JWT/RBAC, RabbitMQ consumer |
| **Intelligence** | AI Analytics (:8000) | Bangla-BERT, Ollama, arbitrage worker |
| **Data** | TimescaleDB + PgBouncer + Redis + MinIO | ডেটা সংরক্ষণ, ক্যাশ, ফাইল |
| **Messaging** | RabbitMQ | অ্যাসিঙ্ক ইভেন্ট ও AI job queue |
| **Ledger** | Hyperledger Fabric (ঐচ্ছিক) | প্রকল্প milestone anchoring |

**নকশার মূলনীতি:**

1. **টোকেন `localStorage`-এ নয়** — HTTP-only cookie (Next.js BFF)
2. **Tenant isolation** — প্রতিটি query `admin_unit_id` + role দিয়ে সীমিত
3. **Read/Write split** — `prismaRead` → replica; `prismaWrite` → primary
4. **AI সার্বভৌমতা** — Ollama on-prem; production-এ বাইরের LLM API নয়
5. **Event-driven** — RabbitMQ → Socket.io hierarchy broadcast
6. **Idempotent seed** — `deploy/scripts/*.sql` বারবার চালানো safe

নিচের চিত্রে দেখুন কীভাবে User → Dashboard → Gateway → DB/AI/MQ সংযুক্ত:

```mermaid
flowchart TB
  subgraph clients [Clients]
    Browser[Browser / Tablet]
  end

  subgraph presentation [Presentation Layer]
    NextJS[Next.js Dashboard :3000]
    BFF_AUTH["/api/auth/*"]
    BFF_PROXY["/api/proxy/*"]
  end

  subgraph application [Application Layer]
    Gateway[API Gateway :4000]
    REST["/api/v1/* REST"]
    WS[Socket.io]
    RBAC[JWT + RBAC Middleware]
    GovConsumer[Gov Queue Consumer]
  end

  subgraph intelligence [Intelligence Layer]
    AI[AI Analytics :8000]
    BERT[Bangla-BERT]
    Ollama[Ollama llama3.1]
    ArbWorker[Arbitrage Worker]
    AIConsumer[AI Queue Consumer]
  end

  subgraph data [Data Layer]
    PgBouncer[(PgBouncer :6432)]
    PGWrite[(TimescaleDB Primary)]
    PGRead[(TimescaleDB Replica)]
    Redis[(Redis)]
    MinIO[(MinIO S3)]
  end

  subgraph messaging [Messaging]
    RMQ[RabbitMQ]
    Exchange[geoinsight_exchange]
  end

  subgraph ledger [Optional Ledger]
    Fabric[Hyperledger Fabric]
  end

  Browser --> NextJS
  NextJS --> BFF_AUTH
  NextJS --> BFF_PROXY
  Browser -->|WebSocket| WS
  BFF_AUTH --> REST
  BFF_PROXY -->|Bearer JWT| REST
  REST --> RBAC
  RBAC --> PgBouncer
  PgBouncer --> PGWrite
  PgBouncer --> PGRead
  REST --> Redis
  REST --> AI
  REST --> RMQ
  GovConsumer --> RMQ
  GovConsumer --> WS
  AI --> BERT
  AI --> Ollama
  AI --> Redis
  AI --> RMQ
  AIConsumer --> RMQ
  ArbWorker --> RMQ
  REST --> MinIO
  REST --> Fabric
```

**চিত্র ব্যাখ্যা:** বামে `Browser` — PMO/Minister/DC লগইন করে। `BFF_PROXY` cookie থেকে JWT নিয়ে Gateway-এ পাঠায়। `GovConsumer` RabbitMQ থেকে alert/KPI message নিয়ে `WS` (Socket.io) দিয়ে room-এ broadcast করে। `AI` layer আলাদা FastAPI সার্ভিস — Gateway orchestration করে।

---

#### ২. কম্পোনেন্ট ডায়াগ্রাম

তিনটি মূল সার্ভিস: **Dashboard** (UI + BFF), **Gateway** (business logic + DB), **AI Analytics** (ML/LLM)। Dashboard-এর hooks BFF route দিয়ে Gateway module-এ hit করে; real-time-এর জন্য আলাদা Socket.io connection।

| কম্পোনেন্ট | ফোল্ডার | কাজ |
|-----------|---------|-----|
| **Dashboard** | `web/dashboard-nextjs` | ১৭+ পেজ, hooks, i18n (bn/en) |
| **BFF** | `src/app/api/auth`, `api/proxy` | Cookie-based auth, gateway proxy |
| **Gateway** | `services/api-gateway-node` | ২০+ domain module, Prisma, Socket.io |
| **AI Service** | `services/ai-analytics-python` | briefing, sentiment, sovereign LLM, predictive |

Gateway **orchestrator** — DB থেকে ডেটা নিয়ে AI-কে পাঠায়, ফল Dashboard-এ ফেরত দেয়।

```mermaid
flowchart LR
  subgraph web [web/dashboard-nextjs]
    Pages[App Router Pages]
    Hooks[React Hooks]
    BFF[Routes /api/auth + /api/proxy]
    Middleware[Auth Middleware]
    SocketClient[useSocket]
  end

  subgraph gateway [services/api-gateway-node]
    Modules[20+ Domain Modules]
    Prisma[Prisma Client R/W]
    SocketServer[Socket.io Server]
    FabricClient[Fabric Gateway Client]
    Metrics[Prometheus Middleware]
  end

  subgraph ai [services/ai-analytics-python]
    FastAPI[FastAPI Routers]
    Sentiment[Sentiment Service]
    BriefingSvc[Briefing Service]
    SovereignSvc[Sovereign LLM]
    Predictive[Predictive Engine]
    Procurement[Procurement Advisor]
  end

  Pages --> Hooks
  Hooks --> BFF
  BFF --> Modules
  Hooks --> SocketClient
  SocketClient --> SocketServer
  Modules --> Prisma
  Modules --> FastAPI
  Modules --> FabricClient
  FastAPI --> Sentiment
  FastAPI --> BriefingSvc
  FastAPI --> SovereignSvc
```

**চিত্র ব্যাখ্যা:** `Pages` → `Hooks` → `BFF` — REST call path। `useSocket` সরাসরি Gateway-এ WebSocket খোলে (BFF দিয়ে proxy নয়)। `Modules` (যেমন `briefing`, `dashboard`, `kpi`) Prisma দিয়ে DB পড়ে, প্রয়োজনে FastAPI call করে।

---

#### ৩. অনুরোধ ও Authentication Flow

Login-এ password Gateway-এ verify হয়; token browser-এ JSON হিসেবে রাখা হয় না — **HTTP-only cookie**-তে set হয়। প্রতিটি API call BFF দিয়ে যায়, যেখানে cookie থেকে Bearer header বানানো হয়।

| ধাপ | বিবরণ |
|-----|--------|
| ১. Login | Browser → `/api/auth/login` → Gateway → bcrypt verify |
| ২. Cookie | `gi_access_token`, `gi_refresh_token` HTTP-only cookie-তে set |
| ৩. API call | `/api/proxy/*` → cookie থেকে Bearer token → Gateway |
| ৪. RBAC | JWT verify + role + admin unit scope check |
| ৫. Response | JSON Dashboard-এ ফেরত |

| প্যারামিটার | মান |
|------------|-----|
| Access token TTL | ১৫ মিনিট |
| Refresh token | ৭ দিন, rotation on use |
| 401 | BFF auto refresh → retry |
| 403 | `/forbidden` redirect |

```mermaid
sequenceDiagram
  participant B as Browser
  participant N as Next.js BFF
  participant G as API Gateway
  participant DB as PostgreSQL
  participant AI as AI Service

  Note over B,N: Login
  B->>N: POST /api/auth/login {email, password}
  N->>G: POST /api/v1/auth/login
  G->>DB: Verify user + bcrypt
  G-->>N: {accessToken, refreshToken}
  N-->>B: Set HTTP-only cookies gi_access_token, gi_refresh_token

  Note over B,G: Authenticated API call
  B->>N: GET /api/proxy/dashboard/national
  N->>N: Read gi_access_token from cookie
  N->>G: GET /api/v1/dashboard/national Authorization Bearer
  G->>G: JWT verify + RBAC + unit scope
  G->>DB: prismaRead.project.findMany(...)
  G-->>N: JSON response
  N-->>B: JSON response

  Note over B,AI: AI-backed feature
  B->>N: GET /api/proxy/briefing/morning?lang=bn
  N->>G: GET /api/v1/briefing/morning
  G->>DB: Aggregate metrics + alerts
  G->>AI: POST /api/v1/briefing/generate
  AI-->>G: bullets + narrative + voice_text
  G-->>N: briefing payload
  N-->>B: briefing payload
```

**চিত্র ব্যাখ্যা:** তিনটি flow — (১) Login ও cookie set, (২) সাধারণ DB read, (৩) AI feature যেখানে Gateway প্রথম DB aggregate করে তারপর AI-কে generate করতে দেয়। XSS থেকে রক্ষা পেতে token JavaScript-এ exposed হয় না।

---

#### ৪. রিয়েল-টাইম ইভেন্ট Flow

Red flag বা KPI update হলে Gateway/AI RabbitMQ-তে message publish করে। **Gov Queue Consumer** consume করে admin unit অনুযায়ী Socket room resolve করে — PMO জাতীয় room-এ, Minister নিজ division room-এ পায়।

AI বা Gateway যখন red flag / KPI update তৈরি করে:

1. Message **RabbitMQ** `gov_core_queue`-তে publish
2. **Gov Queue Consumer** consume করে
3. `resolveBroadcastRooms(adminUnitId)` — division, district, national room
4. **Socket.io** emit → Dashboard update (map marker, anomaly feed)

**Socket rooms:**

| Room | Pattern | সদস্য |
|------|---------|-------|
| জাতীয় | `room:national` | PMO |
| বিভাগ | `room:division:{id}` | Minister + PMO |
| জেলা | `room:district:{id}` | DC + upstream |
| উপজেলা/ইউনিয়ন | `room:upazila:{id}` | Scoped users |

**ইভেন্ট:** `kpi:update`, `alert:created`, `dashboard:refresh`, `connected`

**Scaling:** Redis adapter — একাধিক Gateway instance-এ broadcast।

```mermaid
sequenceDiagram
  participant AI as AI / Gateway
  participant RMQ as RabbitMQ
  participant G as Gov Queue Consumer
  participant SIO as Socket.io
  participant B as Dashboard Browser

  AI->>RMQ: Publish gov_core_queue {type: alert_created, adminUnitId, payload}
  RMQ->>G: Consume message
  G->>G: resolveBroadcastRooms(unitId)
  G->>SIO: emit to room:division:*, room:national
  SIO->>B: event alert:created
  B->>B: Update map markers + anomaly feed
```

**চিত্র ব্যাখ্যা:** HTTP polling নয় — push model। Chattogram-এ alert হলে শুধু Chattogram division room + national room (PMO) update পায়; অন্য division-এর user দেখে না — **tenant-scoped broadcast**।

---

#### ৫. AI Pipeline

Gateway module DB context তৈরি করে; AI Analytics FastAPI endpoint-এ পাঠায়। Generative কাজ (Briefing, Sovereign LLM) **Ollama**-তে; sentiment **Bangla-BERT**; arbitrage/predictive **heuristic ML**।

| ফিচার | ইনপুট | মডেল | আউটপুট |
|-------|-------|------|--------|
| PM Briefing | DB metrics + alerts | Ollama | bullets, narrative, voice |
| Sovereign LLM | DB context + প্রশ্ন | Ollama | Markdown উত্তর |
| Sentiment heatmap | ৩৩৩/৯৯৯ stream | Bangla-BERT | Grievance/Demand/Neutral |
| Predictive red flag | Project budget/history | ML heuristic | confidence % |
| Procurement | commodity_price_logs | Arbitrage engine | দেশ ranking |
| Document intel | টেন্ডার text | Ollama + rules | clauses, anomalies |
| Digital twin | division budgets | simulation | projected completion |
| Impact simulator | geopolitical sliders | risk engine | ministry impacts |

**লোকাল dev:** `SENTIMENT_USE_MOCK=true`, `ollama run llama3.1:8b`

```mermaid
flowchart TB
  subgraph inputs [Inputs]
    DB[(PostgreSQL)]
    Mock333[Mock 333/999 Stream]
    UserText[User Document / Chat]
    Sliders[Simulator Sliders]
  end

  subgraph gateway_ai [Gateway Orchestration]
    BriefingMod[briefing.service]
    IntelMod[intelligence.service]
    SovereignMod[sovereign-context.service]
    TwinMod[twin.service]
  end

  subgraph ai_svc [AI Analytics FastAPI]
    BriefingGen["/briefing/generate"]
    SovereignChat["/sovereign-llm/chat"]
    SentimentHM["/sentiment/heatmap"]
    Predictive["/predictive/score"]
    Arbitrage["/arbitrage/*"]
    Documents["/documents/analyze"]
    TwinSim["/twin/simulate"]
    RiskSim["/simulator/*"]
    Citizen["/citizen/chat"]
  end

  subgraph models [Models]
    BERT[l3cube Bangla-BERT]
    Ollama[Ollama llama3.1:8b]
    Heuristics[Rule + ML Heuristics]
  end

  DB --> BriefingMod
  DB --> IntelMod
  DB --> SovereignMod
  BriefingMod --> BriefingGen
  IntelMod --> Predictive
  IntelMod --> SentimentHM
  SovereignMod --> SovereignChat
  Mock333 --> SentimentHM
  UserText --> Documents
  UserText --> Citizen
  Sliders --> RiskSim

  BriefingGen --> Ollama
  SovereignChat --> Ollama
  SentimentHM --> BERT
  Predictive --> Heuristics
  Arbitrage --> Heuristics
  Documents --> Ollama
  TwinSim --> Heuristics
  RiskSim --> Heuristics
  Citizen --> BERT
```

**চিত্র ব্যাখ্যা:** `gateway_ai` layer business context বানায় (কোন division, কোন alert) — raw DB AI-তে যায় না। Sovereign mode-এ সব generative call **on-prem Ollama**-তে; বাইরের OpenAI/Claude API production-এ disabled।

---

#### ৬. ডাটাবেস ডিজাইন

**Engine:** PostgreSQL 16 + TimescaleDB  
**ORM:** Prisma  
**Pooling:** PgBouncer — `geoinsight_write` (লেখা), `geoinsight_read` (পড়া)

সব entity `admin_units` hierarchy-র সাথে যুক্ত — project, user, representative, agro market সব `admin_unit_id` দিয়ে scope হয়। নিচের ER চিত্র core relationship দেখায়:

```mermaid
erDiagram
  AdminUnit ||--o{ AdminUnit : parent
  AdminUnit ||--o{ User : scopes
  AdminUnit ||--o{ Representative : represents
  AdminUnit ||--o{ Project : hosts
  AdminUnit ||--o{ AgroMarket : contains
  AdminUnit ||--o{ CommodityPriceLog : contextualizes

  Representative ||--o{ KpiRecord : has
  KpiDefinition ||--o{ KpiRecord : defines

  Project ||--o{ RedFlagAlert : triggers
  Project ||--o{ BlockchainMilestoneQueue : anchors

  User ||--o{ AuditLog : performs
  User ||--o{ RefreshToken : owns
  User ||--o{ RedFlagAlert : resolves

  AdminUnit {
    uuid id PK
    string code
    string name
    enum type
    uuid parent_id FK
    uuid division_id
    uuid district_id
    uuid upazila_id
    json geo_json
  }

  Project {
    uuid id PK
    string title
    decimal budget_allocated
    decimal budget_spent
    enum status
    uuid admin_unit_id FK
  }

  RedFlagAlert {
    uuid id PK
    enum flag_type
    int severity
    text ai_explanation
    string blockchain_hash
  }

  KpiRecord {
    uuid id PK
    decimal value
    enum status
    bool verified
  }

  CommodityPriceLog {
    uuid id PK
    timestamptz created_at PK
    string commodity_code
    decimal landed_cost_usd
  }
```

**প্রশাসনিক hierarchy:**

```
DIVISION (৮)
  └── DISTRICT (৬৪)
        └── UPAZILA (~৪৯৫)
              └── UNION (~৪,৫০০+)
```

- **Materialized path** (`path`) — hierarchy walk
- **Denormalized IDs** (`division_id`, `district_id`, `upazila_id`) — দ্রুত scope filter
- **DB trigger** — insert/update-এ ancestor IDs auto-fill

**মূল টেবিল:**

| টেবিল | উদ্দেশ্য |
|-------|----------|
| `admin_units` | বিভাগ → ইউনিয়ন hierarchy |
| `users` | PMO, Minister, DC, Union Chairman |
| `representatives` | MP, Minister, DC |
| `projects` | উন্নয়ন প্রকল্প, বাজেট, status |
| `red_flag_alerts` | AI anomaly alerts |
| `kpi_definitions` / `kpi_records` | প্রতিনিধি KPI |
| `commodity_price_logs` | TimescaleDB — global commodity দাম |
| `agro_markets` | মান্ডি, হাট, retail |
| `audit_logs` | user action audit |
| `blockchain_milestone_queue` | Fabric tx queue |

**চিত্র ব্যাখ্যা:** `AdminUnit` self-referencing tree — সব data এই tree-তে bind। `Project` → `RedFlagAlert` AI anomaly chain। `CommodityPriceLog` time-series — procurement/arbitrage-এ ব্যবহৃত।

---

#### ৭. RBAC ও Multi-Tenancy

প্রতিটি HTTP request JWT verify → RBAC → **unit scope check** পasses করতে হয়। PMO সব division দেখে; Minister শুধু নিজ division subtree; DC district; Union Chairman শুধু নিজ union।

| Role | Tier | Scope | উদাহরণ পেজ |
|------|------|-------|-----------|
| `PMO` | ১ | জাতীয় — সব বিভাগ | Briefing, Sovereign AI |
| `MINISTER` | ২ | এক বিভাগ | KPIs, Projects, Alerts |
| `DC` | ৩ | এক জেলা | Agro, Map |
| `UNION_CHAIRMAN` | ৪ | এক ইউনিয়ন | Representatives |

**URL scope:** `?division=&district=&upazila=&union=`

**নিবন্ধন:** `POST /auth/register` — PMO token লাগে। প্রথম PMO: `docker-db-init.sh`

```mermaid
flowchart TB
  Request[HTTP Request] --> Auth[JWT Auth Middleware]
  Auth --> RBAC[RBAC Middleware]
  RBAC --> Scope{Unit scope check}
  Scope -->|PMO| National[All divisions]
  Scope -->|MINISTER| Division[Own division subtree]
  Scope -->|DC| District[Own district subtree]
  Scope -->|UNION_CHAIRMAN| Union[Own union only]
  National --> Handler[Route Handler]
  Division --> Handler
  District --> Handler
  Union --> Handler
```

**চিত্র ব্যাখ্যা:** Auth fail → 401; RBAC fail → 403; scope fail → forbidden বা filtered empty result। Sidebar menu-ও role অনুযায়ী hide — কিন্তু security backend middleware-এ enforce হয়।

---

#### ৮. Message Queue Topology

দুই ধরনের queue: **gov_core_queue** (real-time Socket.io broadcast) এবং **geoinsight_exchange** (async AI jobs — arbitrage, sentiment, risk)।

| Queue / Exchange | Routing keys | উদ্দেশ্য |
|------------------|--------------|----------|
| `gov_core_queue` | — | Real-time gov events → Socket.io |
| `geoinsight_exchange` | `gov.arbitrage`, `ai.sentiment`, `ai.risk` | Async AI jobs |
| `ai_analytics_queue` | exchange-bound | AI worker dispatch |

```mermaid
flowchart LR
  subgraph producers [Producers]
    GW[API Gateway]
    AIW[AI Arbitrage Worker]
    AIC[AI Queue Consumer]
  end

  subgraph rabbit [RabbitMQ]
    Ex[geoinsight_exchange]
    GovQ[gov_core_queue]
    AIQ[ai_analytics_queue]
  end

  subgraph consumers [Consumers]
    GovCons[Gov Queue Consumer]
    AICons[AI Queue Consumer]
  end

  subgraph sinks [Sinks]
    SIO[Socket.io broadcast]
    DB2[(PostgreSQL)]
  end

  GW -->|alert_created, kpi_update| GovQ
  GW -->|arbitrage_request| Ex
  AIW -->|arbitrage_update| Ex
  Ex --> AIQ
  AIQ --> AICons
  GovQ --> GovCons
  GovCons --> SIO
  AICons --> Ex
```

**চিত্র ব্যাখ্যা:** Gateway alert create করলে `GovQ` → Socket.io। Arbitrage worker commodity price scrape করে `Ex` → Gateway DB persist। Decouple — AI slow হলেও API response block হয় না।

---

#### ৯. Deployment Topology

| পরিবেশ | ফাইল | বর্ণনা |
|--------|------|--------|
| **Infrastructure only** | `docker-compose.yml` | Postgres, Redis, RabbitMQ, MinIO |
| **Full stack (local)** | `+ docker-compose.apps.yml` | + Gateway, AI, Dashboard, db-init |
| **Production** | `docker-compose.prod.yml` | + nginx TLS, GHCR images |
| **Observability** | `+ docker-compose.observability.yml` | Prometheus, Grafana |

**Windows one-command:** `.\deploy\scripts\docker-up.ps1`

**Production:** GitHub Actions → GHCR build → VPS SSH deploy

Docker full stack-এ সব service এক `geoinsight_net` network-এ; `db-init` one-shot container seed SQL চালায়:

```mermaid
flowchart TB
  subgraph docker [Docker Network geoinsight_net]
    DBInit[db-init one-shot]
    PG[(postgres)]
    Replica[(postgres-replica)]
    PGB[(pgbouncer)]
    Redis[(redis)]
    RMQ[rabbitmq]
    MinIO[minio]
    GW[api-gateway]
    AI[ai-analytics]
    Dash[dashboard-nextjs]
  end

  User[User :3000] --> Dash
  Dash --> GW
  User -->|WebSocket| GW
  GW --> PGB
  PGB --> PG
  PGB --> Replica
  GW --> Redis
  GW --> AI
  GW --> RMQ
  AI --> RMQ
  AI --> Redis
  DBInit --> PG
  GW --> MinIO
```

**চিত্র ব্যাখ্যা:** User শুধু `:3000` (Dashboard) দেখে। Gateway `:4000` internal। PgBouncer read/write pool split — replica read load কমায়। Production-এ nginx সামনে TLS terminate করে।

---

#### ১০. Security Architecture

Defense in depth — edge (nginx TLS) → application (BFF cookie, JWT, RBAC) → data (PgBouncer, audit) → sovereign AI (local Ollama, no external API)।

| স্তর | নিয়ন্ত্রণ |
|------|-----------|
| Transport | TLS (prod), HSTS |
| Auth | JWT + refresh rotation, HTTP-only cookies |
| Authorization | Role + admin-unit tenant isolation |
| AI | Sovereign mode — local Ollama, verified DB only |
| Audit | `audit_logs` + blockchain hash on red flags |
| Rate limit | nginx → gateway → AI (333/999 feeds) |
| Secrets | `.env` gitignored; browser-এ শুধু `NEXT_PUBLIC_*` |

```mermaid
flowchart TB
  subgraph edge [Edge]
    Nginx[nginx TLS + rate limit]
  end

  subgraph app_sec [Application Security]
    BFF[Next.js BFF — cookie only]
    JWT[JWT 15m access]
    Refresh[Refresh rotation]
    RBAC2[RBAC + unit scope]
    RateLimit[express-rate-limit]
  end

  subgraph data_sec [Data Security]
    PGBouncer[PgBouncer pooled connections]
    Audit[audit_logs table]
    Hash[bcrypt password]
    BlockHash[SHA-256 alert anchors]
  end

  subgraph sovereign [Sovereign Mode]
    OllamaLocal[Ollama on-prem]
    NoTelemetry[HF_TELEMETRY disabled]
    NoExternal[No external LLM API]
  end

  Nginx --> BFF
  BFF --> JWT
  JWT --> RBAC2
  RBAC2 --> PGBouncer
  RBAC2 --> Audit
```

**চিত্র ব্যাখ্যা:** Sensitive data (JWT secret, DB password) কখনো browser-এ যায় না। Red flag alert-এ optional **blockchain hash** — tamper-evident audit trail। Sovereign block নিশ্চিত করে citizen data বাইরের cloud LLM-এ upload হয় না।

---

### System Design (English)

#### 1. High-Level Architecture

GeoInsight BD is a **modular monorepo** split into four layers: Presentation (Dashboard), Application (Gateway), Intelligence (AI), and Data (DB/cache/storage). The browser never talks to the Gateway directly — the Next.js BFF handles auth via cookies. The Gateway uses PgBouncer for read/write DB split, RabbitMQ for async jobs, and Socket.io for live updates.

| Layer | Service | Responsibility |
|-------|---------|----------------|
| **Presentation** | Next.js Dashboard (:3000) | UI, BFF auth proxy, Socket.io client |
| **Application** | API Gateway (:4000) | REST API, JWT/RBAC, RabbitMQ consumer |
| **Intelligence** | AI Analytics (:8000) | Bangla-BERT, Ollama, arbitrage worker |
| **Data** | TimescaleDB + PgBouncer + Redis + MinIO | Storage, cache, files |
| **Messaging** | RabbitMQ | Async events and AI job queue |
| **Ledger** | Hyperledger Fabric (optional) | Project milestone anchoring |

**Design principles:**

1. **Tokens never in `localStorage`** — HTTP-only cookies via Next.js BFF
2. **Tenant isolation** — every query scoped by `admin_unit_id` + role
3. **Read/write split** — `prismaRead` → replica; `prismaWrite` → primary
4. **AI sovereignty** — Ollama on-prem; no external LLM API in production
5. **Event-driven updates** — RabbitMQ → Socket.io hierarchy broadcast
6. **Idempotent seeds** — `deploy/scripts/*.sql` safe to re-run

The diagram below shows how User → Dashboard → Gateway → DB/AI/MQ connect:

```mermaid
flowchart TB
  subgraph clients [Clients]
    Browser[Browser / Tablet]
  end

  subgraph presentation [Presentation Layer]
    NextJS[Next.js Dashboard :3000]
    BFF_AUTH["/api/auth/*"]
    BFF_PROXY["/api/proxy/*"]
  end

  subgraph application [Application Layer]
    Gateway[API Gateway :4000]
    REST["/api/v1/* REST"]
    WS[Socket.io]
    RBAC[JWT + RBAC Middleware]
    GovConsumer[Gov Queue Consumer]
  end

  subgraph intelligence [Intelligence Layer]
    AI[AI Analytics :8000]
    BERT[Bangla-BERT]
    Ollama[Ollama llama3.1]
    ArbWorker[Arbitrage Worker]
    AIConsumer[AI Queue Consumer]
  end

  subgraph data [Data Layer]
    PgBouncer[(PgBouncer :6432)]
    PGWrite[(TimescaleDB Primary)]
    PGRead[(TimescaleDB Replica)]
    Redis[(Redis)]
    MinIO[(MinIO S3)]
  end

  subgraph messaging [Messaging]
    RMQ[RabbitMQ]
    Exchange[geoinsight_exchange]
  end

  subgraph ledger [Optional Ledger]
    Fabric[Hyperledger Fabric]
  end

  Browser --> NextJS
  NextJS --> BFF_AUTH
  NextJS --> BFF_PROXY
  Browser -->|WebSocket| WS
  BFF_AUTH --> REST
  BFF_PROXY -->|Bearer JWT| REST
  REST --> RBAC
  RBAC --> PgBouncer
  PgBouncer --> PGWrite
  PgBouncer --> PGRead
  REST --> Redis
  REST --> AI
  REST --> RMQ
  GovConsumer --> RMQ
  GovConsumer --> WS
  AI --> BERT
  AI --> Ollama
  AI --> Redis
  AI --> RMQ
  AIConsumer --> RMQ
  ArbWorker --> RMQ
  REST --> MinIO
  REST --> Fabric
```

**Diagram notes:** On the left, `Browser` — PMO/Minister/DC users log in. `BFF_PROXY` reads the JWT from cookies and forwards to the Gateway. `GovConsumer` pulls alert/KPI messages from RabbitMQ and broadcasts via `WS` (Socket.io) to rooms. The `AI` layer is a separate FastAPI service — the Gateway orchestrates calls to it.

---

#### 2. Component Diagram

Three main services: **Dashboard** (UI + BFF), **Gateway** (business logic + DB), **AI Analytics** (ML/LLM). Dashboard hooks hit Gateway modules through BFF routes; real-time uses a separate Socket.io connection.

| Component | Folder | Role |
|-----------|--------|------|
| **Dashboard** | `web/dashboard-nextjs` | 17+ pages, hooks, i18n (bn/en) |
| **BFF** | `src/app/api/auth`, `api/proxy` | Cookie-based auth, gateway proxy |
| **Gateway** | `services/api-gateway-node` | 20+ domain modules, Prisma, Socket.io |
| **AI Service** | `services/ai-analytics-python` | briefing, sentiment, sovereign LLM, predictive |

The Gateway acts as an **orchestrator** — it reads from the database, calls AI services, and returns results to the Dashboard.

```mermaid
flowchart LR
  subgraph web [web/dashboard-nextjs]
    Pages[App Router Pages]
    Hooks[React Hooks]
    BFF[Routes /api/auth + /api/proxy]
    Middleware[Auth Middleware]
    SocketClient[useSocket]
  end

  subgraph gateway [services/api-gateway-node]
    Modules[20+ Domain Modules]
    Prisma[Prisma Client R/W]
    SocketServer[Socket.io Server]
    FabricClient[Fabric Gateway Client]
    Metrics[Prometheus Middleware]
  end

  subgraph ai [services/ai-analytics-python]
    FastAPI[FastAPI Routers]
    Sentiment[Sentiment Service]
    BriefingSvc[Briefing Service]
    SovereignSvc[Sovereign LLM]
    Predictive[Predictive Engine]
    Procurement[Procurement Advisor]
  end

  Pages --> Hooks
  Hooks --> BFF
  BFF --> Modules
  Hooks --> SocketClient
  SocketClient --> SocketServer
  Modules --> Prisma
  Modules --> FastAPI
  Modules --> FabricClient
  FastAPI --> Sentiment
  FastAPI --> BriefingSvc
  FastAPI --> SovereignSvc
```

**Diagram notes:** `Pages` → `Hooks` → `BFF` is the REST call path. `useSocket` opens a WebSocket directly to the Gateway (not proxied through BFF). `Modules` (e.g. `briefing`, `dashboard`, `kpi`) read DB via Prisma and call FastAPI when needed.

---

#### 3. Request & Authentication Flow

On login, the password is verified at the Gateway; tokens are **not** stored in the browser as JSON — they are set in **HTTP-only cookies**. Every API call goes through the BFF, which builds the Bearer header from cookies.

| Step | Detail |
|------|--------|
| 1. Login | Browser → `/api/auth/login` → Gateway → bcrypt verify |
| 2. Cookie | `gi_access_token`, `gi_refresh_token` set as HTTP-only cookies |
| 3. API call | `/api/proxy/*` → Bearer token from cookie → Gateway |
| 4. RBAC | JWT verify + role + admin unit scope check |
| 5. Response | JSON returned to Dashboard |

| Parameter | Value |
|-----------|-------|
| Access token TTL | 15 minutes |
| Refresh token | 7 days, rotation on use |
| 401 | BFF auto refresh → retry |
| 403 | Redirect to `/forbidden` |

```mermaid
sequenceDiagram
  participant B as Browser
  participant N as Next.js BFF
  participant G as API Gateway
  participant DB as PostgreSQL
  participant AI as AI Service

  Note over B,N: Login
  B->>N: POST /api/auth/login {email, password}
  N->>G: POST /api/v1/auth/login
  G->>DB: Verify user + bcrypt
  G-->>N: {accessToken, refreshToken}
  N-->>B: Set HTTP-only cookies gi_access_token, gi_refresh_token

  Note over B,G: Authenticated API call
  B->>N: GET /api/proxy/dashboard/national
  N->>N: Read gi_access_token from cookie
  N->>G: GET /api/v1/dashboard/national Authorization Bearer
  G->>G: JWT verify + RBAC + unit scope
  G->>DB: prismaRead.project.findMany(...)
  G-->>N: JSON response
  N-->>B: JSON response

  Note over B,AI: AI-backed feature
  B->>N: GET /api/proxy/briefing/morning?lang=bn
  N->>G: GET /api/v1/briefing/morning
  G->>DB: Aggregate metrics + alerts
  G->>AI: POST /api/v1/briefing/generate
  AI-->>G: bullets + narrative + voice_text
  G-->>N: briefing payload
  N-->>B: briefing payload
```

**Diagram notes:** Three flows — (1) login and cookie set, (2) standard DB read, (3) AI feature where the Gateway first aggregates DB data then asks AI to generate. Tokens are not exposed to JavaScript, protecting against XSS.

---

#### 4. Real-Time Event Flow

When a red flag or KPI update occurs, the Gateway/AI publishes a message to RabbitMQ. The **Gov Queue Consumer** consumes it and resolves Socket rooms by admin unit — PMO gets the national room, Ministers get their division room.

When AI or the Gateway creates a red flag or KPI update:

1. Message published to **RabbitMQ** `gov_core_queue`
2. **Gov Queue Consumer** consumes it
3. `resolveBroadcastRooms(adminUnitId)` — division, district, national rooms
4. **Socket.io** emit → Dashboard update (map marker, anomaly feed)

**Socket rooms:**

| Room | Pattern | Members |
|------|---------|---------|
| National | `room:national` | PMO |
| Division | `room:division:{id}` | Minister + PMO |
| District | `room:district:{id}` | DC + upstream |
| Upazila / Union | `room:upazila:{id}` | Scoped users |

**Events:** `kpi:update`, `alert:created`, `dashboard:refresh`, `connected`

**Scaling:** Redis adapter — broadcast across multiple Gateway instances.

```mermaid
sequenceDiagram
  participant AI as AI / Gateway
  participant RMQ as RabbitMQ
  participant G as Gov Queue Consumer
  participant SIO as Socket.io
  participant B as Dashboard Browser

  AI->>RMQ: Publish gov_core_queue {type: alert_created, adminUnitId, payload}
  RMQ->>G: Consume message
  G->>G: resolveBroadcastRooms(unitId)
  G->>SIO: emit to room:division:*, room:national
  SIO->>B: event alert:created
  B->>B: Update map markers + anomaly feed
```

**Diagram notes:** Push model, not HTTP polling. An alert in Chattogram updates only the Chattogram division room + national room (PMO) — other divisions do not see it. This is **tenant-scoped broadcast**.

---

#### 5. AI Pipeline

Gateway modules build DB context and send it to AI Analytics FastAPI endpoints. Generative tasks (Briefing, Sovereign LLM) use **Ollama**; sentiment uses **Bangla-BERT**; arbitrage/predictive use **heuristic ML**.

| Feature | Input | Model | Output |
|---------|-------|-------|--------|
| PM Briefing | DB metrics + alerts | Ollama | bullets, narrative, voice |
| Sovereign LLM | DB context + query | Ollama | Markdown answer |
| Sentiment heatmap | 333/999 stream | Bangla-BERT | Grievance/Demand/Neutral |
| Predictive red flag | Project budget/history | ML heuristic | confidence % |
| Procurement | commodity_price_logs | Arbitrage engine | country ranking |
| Document intel | tender text | Ollama + rules | clauses, anomalies |
| Digital twin | division budgets | simulation | projected completion |
| Impact simulator | geopolitical sliders | risk engine | ministry impacts |

**Local dev:** `SENTIMENT_USE_MOCK=true`, `ollama run llama3.1:8b`

```mermaid
flowchart TB
  subgraph inputs [Inputs]
    DB[(PostgreSQL)]
    Mock333[Mock 333/999 Stream]
    UserText[User Document / Chat]
    Sliders[Simulator Sliders]
  end

  subgraph gateway_ai [Gateway Orchestration]
    BriefingMod[briefing.service]
    IntelMod[intelligence.service]
    SovereignMod[sovereign-context.service]
    TwinMod[twin.service]
  end

  subgraph ai_svc [AI Analytics FastAPI]
    BriefingGen["/briefing/generate"]
    SovereignChat["/sovereign-llm/chat"]
    SentimentHM["/sentiment/heatmap"]
    Predictive["/predictive/score"]
    Arbitrage["/arbitrage/*"]
    Documents["/documents/analyze"]
    TwinSim["/twin/simulate"]
    RiskSim["/simulator/*"]
    Citizen["/citizen/chat"]
  end

  subgraph models [Models]
    BERT[l3cube Bangla-BERT]
    Ollama[Ollama llama3.1:8b]
    Heuristics[Rule + ML Heuristics]
  end

  DB --> BriefingMod
  DB --> IntelMod
  DB --> SovereignMod
  BriefingMod --> BriefingGen
  IntelMod --> Predictive
  IntelMod --> SentimentHM
  SovereignMod --> SovereignChat
  Mock333 --> SentimentHM
  UserText --> Documents
  UserText --> Citizen
  Sliders --> RiskSim

  BriefingGen --> Ollama
  SovereignChat --> Ollama
  SentimentHM --> BERT
  Predictive --> Heuristics
  Arbitrage --> Heuristics
  Documents --> Ollama
  TwinSim --> Heuristics
  RiskSim --> Heuristics
  Citizen --> BERT
```

**Diagram notes:** The `gateway_ai` layer builds business context (which division, which alerts) — raw DB is not sent blindly to AI. In sovereign mode, all generative calls go to **on-prem Ollama**; external OpenAI/Claude APIs are disabled in production.

---

#### 6. Database Design

**Engine:** PostgreSQL 16 + TimescaleDB  
**ORM:** Prisma  
**Pooling:** PgBouncer — `geoinsight_write` (writes), `geoinsight_read` (reads)

All entities tie to the `admin_units` hierarchy — projects, users, representatives, and agro markets are scoped by `admin_unit_id`. The ER diagram below shows core relationships:

```mermaid
erDiagram
  AdminUnit ||--o{ AdminUnit : parent
  AdminUnit ||--o{ User : scopes
  AdminUnit ||--o{ Representative : represents
  AdminUnit ||--o{ Project : hosts
  AdminUnit ||--o{ AgroMarket : contains
  AdminUnit ||--o{ CommodityPriceLog : contextualizes

  Representative ||--o{ KpiRecord : has
  KpiDefinition ||--o{ KpiRecord : defines

  Project ||--o{ RedFlagAlert : triggers
  Project ||--o{ BlockchainMilestoneQueue : anchors

  User ||--o{ AuditLog : performs
  User ||--o{ RefreshToken : owns
  User ||--o{ RedFlagAlert : resolves

  AdminUnit {
    uuid id PK
    string code
    string name
    enum type
    uuid parent_id FK
    uuid division_id
    uuid district_id
    uuid upazila_id
    json geo_json
  }

  Project {
    uuid id PK
    string title
    decimal budget_allocated
    decimal budget_spent
    enum status
    uuid admin_unit_id FK
  }

  RedFlagAlert {
    uuid id PK
    enum flag_type
    int severity
    text ai_explanation
    string blockchain_hash
  }

  KpiRecord {
    uuid id PK
    decimal value
    enum status
    bool verified
  }

  CommodityPriceLog {
    uuid id PK
    timestamptz created_at PK
    string commodity_code
    decimal landed_cost_usd
  }
```

**Admin hierarchy:**

```
DIVISION (8)
  └── DISTRICT (64)
        └── UPAZILA (~495)
              └── UNION (~4,500+)
```

- **Materialized path** (`path`) — hierarchy walks
- **Denormalized IDs** (`division_id`, `district_id`, `upazila_id`) — fast scope filters
- **DB trigger** — auto-fills ancestor IDs on insert/update

**Core tables:**

| Table | Purpose |
|-------|---------|
| `admin_units` | Division → Union hierarchy |
| `users` | PMO, Minister, DC, Union Chairman |
| `representatives` | MP, Minister, DC |
| `projects` | Development projects, budget, status |
| `red_flag_alerts` | AI anomaly alerts |
| `kpi_definitions` / `kpi_records` | Representative KPIs |
| `commodity_price_logs` | TimescaleDB — global commodity prices |
| `agro_markets` | Mandi, haat, retail |
| `audit_logs` | User action audit |
| `blockchain_milestone_queue` | Fabric tx queue |

**Diagram notes:** `AdminUnit` is a self-referencing tree — all data binds to this tree. `Project` → `RedFlagAlert` is the AI anomaly chain. `CommodityPriceLog` is time-series data used for procurement/arbitrage.

---

#### 7. RBAC & Multi-Tenancy

Every HTTP request must pass JWT verify → RBAC → **unit scope check**. PMO sees all divisions; Minister sees only their division subtree; DC sees district; Union Chairman sees only their union.

| Role | Tier | Scope | Example pages |
|------|------|-------|---------------|
| `PMO` | 1 | National — all divisions | Briefing, Sovereign AI |
| `MINISTER` | 2 | Single division | KPIs, Projects, Alerts |
| `DC` | 3 | Single district | Agro, Map |
| `UNION_CHAIRMAN` | 4 | Single union | Representatives |

**URL scope:** `?division=&district=&upazila=&union=`

**Registration:** `POST /auth/register` requires PMO token. First PMO: `docker-db-init.sh`

```mermaid
flowchart TB
  Request[HTTP Request] --> Auth[JWT Auth Middleware]
  Auth --> RBAC[RBAC Middleware]
  RBAC --> Scope{Unit scope check}
  Scope -->|PMO| National[All divisions]
  Scope -->|MINISTER| Division[Own division subtree]
  Scope -->|DC| District[Own district subtree]
  Scope -->|UNION_CHAIRMAN| Union[Own union only]
  National --> Handler[Route Handler]
  Division --> Handler
  District --> Handler
  Union --> Handler
```

**Diagram notes:** Auth fail → 401; RBAC fail → 403; scope fail → forbidden or filtered empty result. The sidebar hides menus by role — but security is enforced in backend middleware.

---

#### 8. Message Queue Topology

Two queue types: **gov_core_queue** (real-time Socket.io broadcast) and **geoinsight_exchange** (async AI jobs — arbitrage, sentiment, risk).

| Queue / Exchange | Routing keys | Purpose |
|------------------|--------------|---------|
| `gov_core_queue` | — | Real-time gov events → Socket.io |
| `geoinsight_exchange` | `gov.arbitrage`, `ai.sentiment`, `ai.risk` | Async AI jobs |
| `ai_analytics_queue` | exchange-bound | AI worker dispatch |

```mermaid
flowchart LR
  subgraph producers [Producers]
    GW[API Gateway]
    AIW[AI Arbitrage Worker]
    AIC[AI Queue Consumer]
  end

  subgraph rabbit [RabbitMQ]
    Ex[geoinsight_exchange]
    GovQ[gov_core_queue]
    AIQ[ai_analytics_queue]
  end

  subgraph consumers [Consumers]
    GovCons[Gov Queue Consumer]
    AICons[AI Queue Consumer]
  end

  subgraph sinks [Sinks]
    SIO[Socket.io broadcast]
    DB2[(PostgreSQL)]
  end

  GW -->|alert_created, kpi_update| GovQ
  GW -->|arbitrage_request| Ex
  AIW -->|arbitrage_update| Ex
  Ex --> AIQ
  AIQ --> AICons
  GovQ --> GovCons
  GovCons --> SIO
  AICons --> Ex
```

**Diagram notes:** When the Gateway creates an alert → `GovQ` → Socket.io. The arbitrage worker scrapes commodity prices → `Ex` → Gateway persists to DB. Decoupled — slow AI does not block API responses.

---

#### 9. Deployment Topology

| Environment | File | Description |
|-------------|------|-------------|
| **Infrastructure only** | `docker-compose.yml` | Postgres, Redis, RabbitMQ, MinIO |
| **Full stack (local)** | `+ docker-compose.apps.yml` | + Gateway, AI, Dashboard, db-init |
| **Production** | `docker-compose.prod.yml` | + nginx TLS, GHCR images |
| **Observability** | `+ docker-compose.observability.yml` | Prometheus, Grafana |

**Windows one-command:** `.\deploy\scripts\docker-up.ps1`

**Production:** GitHub Actions → GHCR build → VPS SSH deploy

In the Docker full stack, all services share one `geoinsight_net` network; `db-init` is a one-shot container that runs seed SQL:

```mermaid
flowchart TB
  subgraph docker [Docker Network geoinsight_net]
    DBInit[db-init one-shot]
    PG[(postgres)]
    Replica[(postgres-replica)]
    PGB[(pgbouncer)]
    Redis[(redis)]
    RMQ[rabbitmq]
    MinIO[minio]
    GW[api-gateway]
    AI[ai-analytics]
    Dash[dashboard-nextjs]
  end

  User[User :3000] --> Dash
  Dash --> GW
  User -->|WebSocket| GW
  GW --> PGB
  PGB --> PG
  PGB --> Replica
  GW --> Redis
  GW --> AI
  GW --> RMQ
  AI --> RMQ
  AI --> Redis
  DBInit --> PG
  GW --> MinIO
```

**Diagram notes:** Users only see `:3000` (Dashboard). Gateway `:4000` is internal. PgBouncer splits read/write pools — replica handles read load. In production, nginx terminates TLS at the edge.

---

#### 10. Security Architecture

Defense in depth — edge (nginx TLS) → application (BFF cookie, JWT, RBAC) → data (PgBouncer, audit) → sovereign AI (local Ollama, no external API).

| Layer | Control |
|-------|---------|
| Transport | TLS (prod), HSTS |
| Auth | JWT + refresh rotation, HTTP-only cookies |
| Authorization | Role + admin-unit tenant isolation |
| AI | Sovereign mode — local Ollama, verified DB only |
| Audit | `audit_logs` + blockchain hash on red flags |
| Rate limit | nginx → gateway → AI (333/999 feeds) |
| Secrets | `.env` gitignored; only `NEXT_PUBLIC_*` in browser |

```mermaid
flowchart TB
  subgraph edge [Edge]
    Nginx[nginx TLS + rate limit]
  end

  subgraph app_sec [Application Security]
    BFF[Next.js BFF — cookie only]
    JWT[JWT 15m access]
    Refresh[Refresh rotation]
    RBAC2[RBAC + unit scope]
    RateLimit[express-rate-limit]
  end

  subgraph data_sec [Data Security]
    PGBouncer[PgBouncer pooled connections]
    Audit[audit_logs table]
    Hash[bcrypt password]
    BlockHash[SHA-256 alert anchors]
  end

  subgraph sovereign [Sovereign Mode]
    OllamaLocal[Ollama on-prem]
    NoTelemetry[HF_TELEMETRY disabled]
    NoExternal[No external LLM API]
  end

  Nginx --> BFF
  BFF --> JWT
  JWT --> RBAC2
  RBAC2 --> PGBouncer
  RBAC2 --> Audit
```

**Diagram notes:** Sensitive data (JWT secret, DB password) never reaches the browser. Red flag alerts optionally include a **blockchain hash** for tamper-evident audit trails. The sovereign block ensures citizen data is not uploaded to external cloud LLMs.

---

## Quick Start

### Option A — Docker full stack (recommended)

```powershell
git clone <repository-url> geoinsight-bd
cd geoinsight-bd
cp .env.example .env
# Edit .env — set strong passwords and JWT_SECRET (≥ 32 chars)

.\deploy\scripts\docker-up.ps1
```

Open **http://localhost:3000** — login with `pmo@geoinsight.gov.bd` / `ChangeMe@123`

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

Host `.env` example:

```env
DATABASE_URL=postgresql://geoinsight_admin:PASSWORD@localhost:6432/geoinsight_write?schema=public&pgbouncer=true
DATABASE_READ_URL=postgresql://geoinsight_admin:PASSWORD@localhost:6432/geoinsight_read?schema=public&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://geoinsight_admin:PASSWORD@localhost:55432/geoinsight_db?schema=public
JWT_SECRET=your_secret_minimum_32_characters_long
CORS_ORIGIN=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000
```

#### 3. AI Analytics

```bash
cd services/ai-analytics-python
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional — generative AI:

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

#### 6. Bootstrap PMO user (manual SQL only)

If `db-init` did not run, create PMO via SQL — see [Data Seeding](#data-seeding).

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
| `intelligence` | `/intelligence/sentiment/heatmap`, `/predictive/scan`, `/documents/analyze`, `/hazards/overlay` | PMO, MINISTER |
| `simulator` | `POST /simulator/run` | PMO |
| `procurement` | `POST /procurement/advise` | PMO |
| `projects` | `GET /projects`, `GET /projects/:id` | Scoped |
| `kpis` | `GET /kpis/definitions`, `/records`, `POST /records` | Scoped |
| `alerts` | `GET /alerts`, `PATCH /alerts/:id/resolve` | Scoped |
| `representatives` | `GET /representatives` | Scoped |
| `agro-markets` | `GET /agro-markets` | Scoped |
| `blockchain` | `POST /blockchain/milestones` | PMO, MINISTER |
| `audit-trail` | `GET /audit-trail` | PMO, MINISTER |
| `citizen` | `POST /citizen/chat` | PMO, MINISTER |
| `search` | `GET /search?q=` | Authenticated |
| `public-feed` | `/public/feeds/333|999/stream` | Rate-limited |

### AI Analytics routes

| Router | Path | Purpose |
|--------|------|---------|
| `briefing` | `/briefing/generate` | Morning narrative |
| `sovereign_llm` | `/sovereign-llm/chat` | Verified-context chat |
| `sentiment` | `/sentiment/heatmap`, `/analyze` | Bangla-BERT |
| `predictive` | `/predictive/score` | Project risk scoring |
| `arbitrage` | `/arbitrage/*` | Commodity price engine |
| `procurement` | `/procurement/advise` | Landed cost ranking |
| `documents` | `/documents/analyze` | Tender anomaly |
| `hazards` | `/hazards/overlay` | Flood/cyclone exposure |
| `twin` | `/twin/simulate` | Budget simulation |
| `simulator` | `/simulator/*` | Geopolitical risk |
| `accountability` | `/accountability/score` | Representative scoring |
| `citizen` | `/citizen/chat` | 333/999 routing |
| `risk` | `/risk/score` | Remittance/RMG impact |

---

## Dashboard Pages & RBAC

| Tier | Role | Visible pages |
|------|------|---------------|
| 1 | PMO | All 17 pages |
| 2 | MINISTER | KPIs through Hazards (not National Overview / Briefing / Sovereign AI) |
| 3 | DC | Agro, Map, Representatives |
| 4 | UNION_CHAIRMAN | Representatives only |

PMO sees all nav items regardless of tier filter.

---

## Data Seeding

Automatic via `deploy/scripts/docker-db-init.sh`:

| Script | Contents |
|--------|----------|
| `seed-national-data.sql` | 8 divisions, districts, KPI defs, 5 representatives, 6 projects, 5 red flags, 5 agro markets, commodity prices |
| `seed-admin-upazila-union.sql` | Upazilas and unions |
| `fix-admin-unit-bn.sql` | Bengali name repair |
| `bootstrap-pmo.sql` | PMO password hash update |

Re-run seed safely:

```bash
docker compose -f docker-compose.yml -f docker-compose.apps.yml run --rm db-init
```

Manual PMO insert (if needed):

```sql
INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pmo@geoinsight.gov.bd',
  '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
  'PMO', true, NOW(), NOW()
);
-- Password: ChangeMe@123
```

---

## Online News Ingestion (RSS + Google News)

Automatically collects headlines from **Prothom Alo, Daily Star, BDNews24, Jugantor, Samakal** and **Google News** (government, development, agriculture, corruption, economy).

| Step | Detail |
|------|--------|
| **Fetch** | AI service `POST /api/v1/ingestion/fetch` |
| **Store** | Gateway upserts to `external_articles` table |
| **Analyze** | Bangla-BERT sentiment (Grievance / Demand / Neutral) |
| **Auto sync** | Gateway worker every 15 min (`INGESTION_INTERVAL_MS=900000`) |
| **Manual sync** | Dashboard → Sentiment → **Fetch news now** |

**Env vars** (root `.env`):

```env
INGESTION_ENABLED=true
INGESTION_INTERVAL_MS=900000
INGESTION_RUN_ON_START=true
INGESTION_STARTUP_DELAY_MS=45000
```

**API (authenticated):**

| Endpoint | Role |
|----------|------|
| `POST /api/v1/ingestion/sync` | PMO, Minister |
| `GET /api/v1/ingestion/articles` | PMO, Minister, DC |
| `GET /api/v1/ingestion/stats` | PMO, Minister |

**Used by:** Sentiment heatmap, PM Briefing, Sovereign LLM context, global search.

Docker rebuild after code changes:

```powershell
docker compose -f docker-compose.yml -f docker-compose.apps.yml up -d --build api-gateway ai-analytics
```

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

```bash
cp .env.example .env
export IMAGE_TAG=latest
export GHCR_OWNER=<your-github-org>

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Includes: TimescaleDB, RabbitMQ, MinIO, API Gateway, AI Analytics, Dashboard, **nginx** (TLS, CSP, rate limits).

**CI/CD:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — test → build GHCR images → SSH deploy.

**Required GitHub Secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_PAT`

**VPS bootstrap:** [`deploy/scripts/vps-bootstrap.sh`](deploy/scripts/vps-bootstrap.sh)

**Sovereign production:** [`deploy/security/tier4-sovereignty.env.example`](deploy/security/tier4-sovereignty.env.example)

---

## Observability

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml up -d
```

| Component | Path |
|-----------|------|
| Prometheus | `deploy/observability/prometheus/prometheus.yml` |
| Alert rules | `deploy/observability/prometheus/alerts/geoinsight.rules.yml` |
| Grafana dashboard | `deploy/observability/grafana/dashboards/geoinsight-platform.json` |

Metrics:

- Gateway: `GET /metrics`
- AI: `GET /metrics`
- RabbitMQ: `:15692` (prometheus plugin)

---

## Project Structure

```
geoinsight-bd/
├── .github/workflows/              # CI/CD (test, build, deploy)
├── deploy/
│   ├── init/                       # Postgres, RabbitMQ, MinIO init
│   ├── nginx/                      # Production reverse proxy
│   ├── observability/              # Prometheus, Grafana, Alertmanager
│   ├── hyperledger/                # Fabric connection profile + wallet
│   ├── pgbouncer/                  # PgBouncer config
│   ├── scripts/
│   │   ├── docker-up.ps1           # One-command Windows full stack
│   │   ├── docker-down.ps1
│   │   ├── docker-db-init.sh       # Seed + PMO bootstrap
│   │   ├── seed-national-data.sql
│   │   ├── seed-admin-upazila-union.sql
│   │   └── vps-bootstrap.sh
│   └── security/                   # Tier-4 sovereignty templates
├── services/
│   ├── api-gateway-node/
│   │   ├── prisma/                 # Schema + migrations
│   │   └── src/
│   │       ├── modules/            # 20+ domain modules
│   │       ├── infrastructure/     # Socket, RabbitMQ, Redis, Fabric
│   │       └── core/               # Auth, RBAC, DI, metrics
│   └── ai-analytics-python/
│       ├── app/modules/            # briefing, sentiment, sovereign, etc.
│       └── app/ml/                   # Bangla-BERT, Ollama client
├── web/
│   └── dashboard-nextjs/
│       ├── src/app/                # App Router pages
│       ├── src/components/         # UI modules
│       ├── src/hooks/              # Data + socket hooks
│       └── messages/               # bn.json, en.json (i18n)
├── load-tests/                     # Locust scenarios
├── docker-compose.yml              # Infrastructure only
├── docker-compose.apps.yml         # + Gateway, AI, Dashboard, db-init
├── docker-compose.prod.yml         # Production full stack
└── docker-compose.observability.yml
```

---

## Troubleshooting

### RabbitMQ port conflict (Windows)

Set `RABBITMQ_PORT=35672` in root `.env`, update `RABBITMQ_URL` in service `.env` files.

### Prisma migration fails

```bash
docker compose ps postgres
cd services/api-gateway-node && npx prisma migrate deploy
```

Use `DIRECT_DATABASE_URL` (port 55432) for migrations, not PgBouncer pool.

### Dashboard login loop

- Gateway running on `:4000`?
- `API_GATEWAY_URL` correct in `web/dashboard-nextjs/.env.local`?
- `JWT_SECRET` unchanged between restarts?

### CORS errors

Gateway: `CORS_ORIGIN=http://localhost:3000`  
AI: `CORS_ORIGINS=http://localhost:3000,http://localhost:4000`

### Socket.io not connecting

- `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000` (not Next.js `:3000`)
- Production: nginx WebSocket upgrade — see `deploy/nginx/nginx.conf`

### AI / Briefing unavailable

- AI service on `:8000`?
- Ollama running? `curl http://localhost:11434/api/tags`
- Fallback: template mode works without Ollama

### Empty dashboard data

Run db-init:

```bash
docker compose -f docker-compose.yml -f docker-compose.apps.yml run --rm db-init
```

### Bengali text garbled in admin units

```bash
docker compose exec postgres psql -U geoinsight_admin -d geoinsight_db -f /scripts/fix-admin-unit-bn.sql
```

---

## Security Notes

- JWT access tokens: **15 minutes**; refresh tokens: HTTP-only, rotated
- RBAC + admin-unit tenant isolation on every protected route
- Rate limiting: nginx → gateway → AI (333/999 public feeds)
- Production: enable `SOVEREIGN_MODE`, disable external telemetry
- Never expose `DATABASE_URL`, `JWT_SECRET`, or `API_GATEWAY_URL` to the browser
- Only `NEXT_PUBLIC_*` variables are client-safe
- Red flag `blockchain_hash` — SHA-256 tamper-evident anchor (Fabric optional)

---

## License

Proprietary — Government of Bangladesh / authorized partners. Contact the PMO technical team for usage terms.

---

<p align="center">
  <strong>GeoInsight BD</strong> — Evidence-based governance for every admin unit.<br/>
  <em>জাতীয় তথ্য · সার্বভৌম AI · স্বচ্ছ শাসন</em>
</p>
