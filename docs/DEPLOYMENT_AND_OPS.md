# GeoInsight BD — CI/CD, VPS Deploy & AI/Ollama Approach

এই ডকুমেন্টে লেখা আছে: কোড কীভাবে **CI/CD** দিয়ে যায়, **VPS**-এ কীভাবে live হয়, **Ollama** ও অন্য AI কোন approach-এ চলে, আর **কেন** এভাবে করা হয়েছে।

ভাষা: বাংলা ব্যাখ্যা + English tech terms (CI/CD, VPS, Redis, Ollama…)।

---

## Table of Contents

1. [Big Picture](#1-big-picture)
2. [CI/CD Process](#2-cicd-process)
3. [VPS Deploy](#3-vps-deploy)
4. [Ollama & AI Approach](#4-ollama--ai-approach)
5. [Performance Approach](#5-performance-approach-কেন-site-fast)
6. [কেন কোনটা বেছে নেওয়া হয়েছে](#6-কেন-কোনটা-বেছে-নেওয়া-হয়েছে)
7. [Day-to-day Operator Guide](#7-day-to-day-operator-guide)
8. [Related Files](#8-related-files)

---

## 1. Big Picture

```
  Developer PC                     GitHub                        Hostinger App VPS
 ┌──────────────┐                ┌─────────────┐               ┌─────────────────────┐
 │ git commit   │   git push     │  main       │   SSH deploy  │ /opt/geoinsight-bd   │
 │ git push ────┼───────────────►│  Actions    │──────────────►│ git pull            │
 └──────────────┘                │  deploy-vps │               │ docker compose build│
                                 └─────────────┘               │ up -d (slim profile)│
                                                               └──────────┬──────────┘
                                                                          │
                                                                          │ OLLAMA_URL
                                                                          ▼
                                                               ┌─────────────────────┐
                                                               │ AI Server (≥16GB)   │
                                                               │ Ollama :11434       │
                                                               │ llama3.1:8b         │
                                                               └─────────────────────┘
```

| Layer | Role |
|-------|------|
| **App VPS** | Dashboard, API Gateway, Postgres, Redis, RabbitMQ, AI Analytics (service) |
| **AI Server** | শুধু **Ollama** (heavy LLM) — আলাদা মেশিন |
| **GitHub Actions** | Push to `main` → auto redeploy App VPS |

---

## 2. CI/CD Process

প্রজেক্টে **দুইটা** workflow আছে। রোজকার Hostinger deploy-এর জন্য যেটা চলে সেটা হলো **Deploy VPS**।

### 2.1 Daily path — `deploy-vps.yml` (automatic)

**Trigger:** `git push origin main` অথবা GitHub-এ **Run workflow** (manual)।

```
push main
   → GitHub Action (ubuntu-latest)
   → SSH into VPS (appleboy/ssh-action)
   → cd /opt/geoinsight-bd
   → git fetch + reset --hard origin/main
   → bash deploy/scripts/vps-redeploy.sh
   → Docker build + slim compose up
   → health check
```

**কেন এই path?**

| Reason | বিস্তারিত |
|--------|-----------|
| Hostinger-friendly | VPS-এ সরাসরি `git pull` + `compose build` — GHCR login বাধ্যতামূলক নয় |
| Simple ops | একটা `.env` VPS-এই থাকে; secret CI-তে কম |
| Fast feedback | `main`-এ merge করলেই live update শুরু |

**Required GitHub Secrets:**

| Secret | Example / meaning |
|--------|-------------------|
| `VPS_HOST` | VPS public IP |
| `VPS_USER` | `root` বা deploy user |
| `VPS_SSH_KEY` | Private SSH key (full PEM) |
| `VPS_SSH_PORT` | Optional, default `22` |
| `VPS_DEPLOY_PATH` | Optional, default `/opt/geoinsight-bd` |

### 2.2 Optional path — `deploy.yml` (GHCR, manual)

**Trigger:** শুধু **workflow_dispatch** (manual) — automatic `main` push-এ চলে না।

```
Manual run
   → Parallel tests (API / AI / Dashboard)
   → Build images → push GHCR (ghcr.io/…)
   → SSH VPS → docker login → compose pull → up
```

**কেন রাখা হয়েছে?**

- Future / production-grade image registry flow
- Test gate (Jest, pytest, Next.js build) আলাদা রাখা যায়
- এখনকার Hostinger everyday deploy `deploy-vps.yml` দিয়েই হয় — build VPS-এ হয়, GHCR ছাড়াও চলে

### 2.3 CI/CD principles যেগুলো অনুসরণ করা হয়েছে

1. **`main` = production source of truth**
2. **Concurrency group** — একসাথে দুইটা deploy আটকে conflict কমানো
3. **Secrets শুধু GitHub Secrets-এ** — repo-তে password commit হয় না
4. **Idempotent redeploy** — একই script বারবার চালানো যায়
5. **Background redeploy** — Hostinger browser terminal disconnect হলেও build চলতে পারে (`vps-redeploy.sh`)

---

## 3. VPS Deploy

### 3.1 প্রথমবার (bootstrap)

```bash
# VPS এ
git clone <repo-url> /opt/geoinsight-bd
cd /opt/geoinsight-bd
cp .env.production.example .env
# .env সম্পাদনা: passwords, JWT, CORS, NEXT_PUBLIC_* = আপনার IP/domain

bash deploy/scripts/hostinger-vps-setup.sh   # যদি ব্যবহার করেন
# অথবা সরাসরি:
bash deploy/scripts/vps-redeploy.sh --force
```

### 3.2 প্রতিদিন / প্রতি push

লোকাল বা GitHub থেকে:

```bash
git push origin main
# → Actions automatically SSH + redeploy
```

VPS-এ manually:

```bash
cd /opt/geoinsight-bd
bash deploy/scripts/vps-redeploy.sh --force
# progress: tail -f logs/redeploy.log
```

### 3.3 Compose stack কী চালায়

```
docker compose \
  -f docker-compose.yml \
  -f docker-compose.apps.yml \
  -f docker-compose.vps.yml \
  up -d
```

| File | কাজ |
|------|-----|
| `docker-compose.yml` | Infra: Postgres, Redis, RabbitMQ, MinIO, PgBouncer |
| `docker-compose.apps.yml` | Apps: API Gateway, AI Analytics, Dashboard, db-init |
| `docker-compose.vps.yml` | **Slim profile** — memory caps, pipeline-on-start off, AI mock default |

**Replica:** `postgres-replica` এখন `profiles: ["with-replica"]` — ছোট VPS-এ default চালু হয় না (~2GB RAM বাঁচে)।

### 3.4 Ports (typical Hostinger)

| Service | Host port |
|---------|-----------|
| Dashboard | `3000` |
| API Gateway | `4800` → container `4000` |
| Postgres | internal / optional mapped |
| Ollama | **অন্য সার্ভারে** `11434` |

---

## 4. Ollama & AI Approach

### 4.1 Architecture decision

```
 App VPS                          AI Server
 ┌─────────────────────┐         ┌──────────────────┐
 │ ai-analytics:8000   │──HTTP──►│ Ollama :11434    │
 │  OLLAMA_URL=…       │         │ llama3.1:8b      │
 │ SENTIMENT_USE_MOCK  │         └──────────────────┘
 │  = true (small VPS) │
 └─────────────────────┘
```

| কাজ | কোথায় চলে | কেন |
|-----|------------|-----|
| Sovereign LLM, Briefing, Citizen chat | **Remote Ollama** | ৫–৮GB model — app VPS-এ চালালে swap/slow |
| Sentiment (Bangla-BERT) | Default **mock** on app VPS | Real BERTও RAM খেয়ে thrash করে |
| Dashboard / API / DB | App VPS | User-facing latency কম রাখতে |

### 4.2 Setup steps

**AI server (≥16GB RAM, GPU optional):**

```bash
bash deploy/scripts/ollama-server-setup.sh --allow-from <APP_VPS_IP>
```

**App VPS:**

```bash
bash deploy/scripts/vps-point-ollama.sh http://<AI_SERVER_IP>:11434
```

### 4.3 যেসব approach **নেওয়া হয়নি** (আর কেন)

| Approach | কেন নেওয়া হয়নি |
|----------|------------------|
| App VPS-এই Ollama | ৪–৮GB Hostinger-এ site + 8B model একসাথে = swap, সব slow |
| OpenAI / cloud LLM API | **Data sovereignty** ভাঙে — national / citizen data বাইরে যায় |
| Public `:11434` open | Security risk — যে কেউ model hit করতে পারে |

### 4.4 Fallback

Ollama down হলে Sovereign chat **template mode**-এ চলে (`sovereign_template`)। Dashboard বাকি অংশ চালু থাকে — full outage হয় না।

বিস্তারিত: [`docs/OLLAMA_PRODUCTION.md`](./OLLAMA_PRODUCTION.md)

---

## 5. Performance Approach (কেন site fast)

VPS-এ slow loading দেখে যে approach নেওয়া হয়েছে:

| Optimization | Approach | কেন |
|--------------|----------|-----|
| Redis cache `dashboard/national` (~90s) | Cache-aside | প্রতি request-এ heavy DB/heatmap এড়াতে |
| Heatmap cache + 250 article cap | Smaller compute | Node-এ ৮০০ row process বন্ধ |
| Marker `Promise.all` | Parallel I/O | Sequential N+1 বন্ধ |
| Slim compose (`docker-compose.vps.yml`) | Memory caps | Swap thrash কমানো |
| Pipeline/ingestion **run-on-start = false** | Staggered load | Deploy পরপর CPU storm বন্ধ |
| Replica off by default | Profile gate | Unused 2GB free |
| PgBouncer smaller pools | Connection control | ছোট DB-কে overwhelm না করা |
| nginx gzip + static cache | Edge assets | Frontend bytes কম (nginx থাকলে) |

**Script shortcuts:**

```bash
bash deploy/scripts/vps-optimize-env.sh   # .env flags + recreate apps
bash deploy/scripts/vps-redeploy.sh --force
```

---

## 6. কেন কোনটা বেছে নেওয়া হয়েছে

### ৬.১ Monorepo + Docker Compose

| Decision | Alternative | কেন এটা |
|----------|-------------|---------|
| Monorepo | আলাদা repo per service | এক PR-এ API + UI + AI একসাথে; Hostinger-এ এক clone |
| Compose (not K8s) | Kubernetes | ছোট VPS — Compose যথেষ্ট; ops সহজ |

### ৬.২ CI = SSH git pull (primary)

| Decision | Alternative | কেন এটা |
|----------|-------------|---------|
| `deploy-vps.yml` auto on `main` | শুধু manual | প্রতি push-এ live আপডেট |
| Build on VPS | সবসময় GHCR pull | Hostinger-এ PAT/registry অপেক্ষা ছাড়াই কাজ করে |
| GHCR workflow manual | Auto সব build | Optional production path রাখা; daily cost/complexity কম |

### ৬.৩ App vs AI split

| Decision | Alternative | কেন এটা |
|----------|-------------|---------|
| Remote Ollama | Same VPS Ollama | Performance + RAM |
| On-prem Llama | Cloud GPT | Sovereignty (gov data) |
| Sentiment mock on small VPS | Always real BERT | Availability > perfect NLP on 4GB |

### ৬.৪ Auth & edge

| Decision | Alternative | কেন এটা |
|----------|-------------|---------|
| Next.js BFF + HTTP-only cookies | Browser → JWT localStorage | XSS থেকে token চুরি কঠিন |
| Role + admin unit scope | Flat roles only | Bangladesh hierarchy drill-down |

### ৬.৫ Data layer

| Decision | Alternative | কেন এটা |
|----------|-------------|---------|
| TimescaleDB | Plain Postgres only | Commodity / time-series |
| Redis + RabbitMQ | শুধু Redis | Cache vs durable async আলাদা দায়িত্ব |
| PgBouncer | Direct Postgres | Node short-lived connections |

---

## 7. Day-to-day Operator Guide

### Deploy নতুন feature

```bash
# Local
git add . && git commit -m "..." && git push origin main
# → GitHub Actions → VPS
```

### Redeploy আটকে গেলে

```bash
bash deploy/scripts/vps-redeploy.sh --status
bash deploy/scripts/vps-redeploy.sh --force
tail -f /opt/geoinsight-bd/logs/redeploy.log
```

### Ollama connect / reconnect

```bash
bash deploy/scripts/vps-point-ollama.sh http://AI_IP:11434
# check: ollama_reachable true
```

### Slow হলে দ্রুত চেক

```bash
docker stats --no-stream
free -h
docker ps | grep replica    # চললে বন্ধ করুন
grep -E 'PIPELINE_RUN_ON_START|SENTIMENT_USE_MOCK|OLLAMA_URL' .env
```

### Login (bootstrap)

- Dashboard: `http://VPS_IP:3000`
- Default PMO (seed): README / db-init অনুযায়ী

---

## 8. Related Files

| Topic | Path |
|-------|------|
| Auto VPS deploy workflow | `.github/workflows/deploy-vps.yml` |
| GHCR + tests workflow | `.github/workflows/deploy.yml` |
| Redeploy script | `deploy/scripts/vps-redeploy.sh` |
| Env optimize | `deploy/scripts/vps-optimize-env.sh` |
| Slim compose | `docker-compose.vps.yml` |
| Ollama compose | `docker-compose.ollama.yml` |
| Ollama server setup | `deploy/scripts/ollama-server-setup.sh` |
| Point app → Ollama | `deploy/scripts/vps-point-ollama.sh` |
| Ollama guide | `docs/OLLAMA_PRODUCTION.md` |
| System design | `docs/SYSTEM_DESIGN.md` |
| Production env template | `.env.production.example` |

---

## এক নজরে — আমাদের approach

| বিষয় | Approach | সংক্ষিপ্ত “কেন” |
|-------|----------|-----------------|
| CI/CD | Push `main` → SSH → git pull → compose | Hostinger-এ সরল, deterministic |
| App runtime | Slim Docker stack, no replica by default | RAM বাঁচানো, UI responsive |
| LLM | আলাদা Ollama server + `OLLAMA_URL` | Fast app VPS + sovereign local model |
| Cloud LLM | Avoid | National data sovereignty |
| Speed | Redis cache + parallel front-end + no boot pipelines | Data তাড়াতাড়ি আসে |

---

**GeoInsight BD** — evidence-based governance, deployable on a lean VPS, with AI kept sovereign and separate.
