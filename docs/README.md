# GeoInsight BD — Documentation

এই ফোল্ডারে **architecture**, **CI/CD / VPS deploy**, এবং **Ollama production** গাইড আছে।  
রোজকার setup/login → মূল [`README.md`](../README.md)।

| Document | Audience | কী আছে |
|----------|----------|--------|
| **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** | Architect / reviewer | HLD, LLD, ERD, NFR, security, ADR — incl. **Anti-Phishing**, **Proximity geo-fence**, **Face Intel** |
| **[DEPLOYMENT_AND_OPS.md](./DEPLOYMENT_AND_OPS.md)** | DevOps / operator | CI/CD (`deploy-vps.yml`), Hostinger VPS, slim compose, performance, day-to-day ops |
| **[OLLAMA_PRODUCTION.md](./OLLAMA_PRODUCTION.md)** | AI ops | আলাদা AI server, `OLLAMA_URL`, GPU optional, local Windows tip |

### New DSS modules (see System Design §২.১২–২.১৪)

| Module | Dashboard | AI prefix | Gateway |
|--------|-----------|-----------|---------|
| Anti-Phishing | `/anti-phishing` | `/api/v1/phishing` | `/intelligence/phishing/*` |
| Proximity Map | `/proximity` | `/api/v1/proximity` | `/intelligence/proximity/*` |
| Face Intel | `/face-intel` | `/api/v1/face-intel` | `/intelligence/face-intel/*` |

### দ্রুত নেভিগেশন

```
README (quick start / features)
   │
   ├─► docs/SYSTEM_DESIGN.md          ← কেন এমন architecture
   ├─► docs/DEPLOYMENT_AND_OPS.md     ← কীভাবে CI/CD + VPS
   │       └─► docs/OLLAMA_PRODUCTION.md  ← LLM server detail
   └─► .env.example / .env.production.example
```

### Env templates

| File | Use |
|------|-----|
| [`.env.example`](../.env.example) | Local Windows + Docker Desktop |
| [`.env.production.example`](../.env.production.example) | Hostinger / production VPS |

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
