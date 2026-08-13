# Ollama in Production (GeoInsight BD)

**Related:** [Docs hub](./README.md) · [CI/CD & VPS (approach)](./DEPLOYMENT_AND_OPS.md#4-ollama--ai-approach) · [System Design](./SYSTEM_DESIGN.md) · [README](../README.md)

## Recommended architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│  App VPS (4–8GB)    │         │  AI Server (≥16GB / GPU) │
│  Dashboard + API    │  HTTP   │  Ollama :11434           │
│  Postgres + Redis   │ ──────► │  gpt-oss:20b (quality)   │
│  ai-analytics       │         │  llama3.1:8b (fast)      │
│  BanglaBERT classify│         │  OLLAMA_NUM_PARALLEL=1   │
└─────────────────────┘         └──────────────────────────┘
```

**Do not** run Ollama on the same small Hostinger app VPS — it will swap and make the whole site slow.

**Do not** default `llama3.1:70b` — needs ≥48GB and hurts concurrency. Optional A/B only: `gemma4:31b`.

### Dual-model policy (Phase 0)

| Tier | Env | Default | Used for |
|------|-----|---------|----------|
| Quality | `OLLAMA_MODEL` | `gpt-oss:20b` | Morning brief, WPI explain, national briefing, outlook, narrative debunk, procurement, documents, sovereign chat |
| Fast | `OLLAMA_MODEL_FAST` | `llama3.1:8b` | Complaint triage, visit recommend, citizen chat, field summary |

**Classification** (sentiment / propaganda / grievance category) stays on **BanglaBERT** (or mock) — never Ollama.

On ~16GB RAM: keep `OLLAMA_MAX_LOADED_MODELS=1` and accept unload between tiers. On ≥24GB: set `=2` to keep both resident.

---

## 1. AI server setup

```bash
# clone or copy repo onto the AI machine
cd /opt/geoinsight-bd
bash deploy/scripts/ollama-server-setup.sh --allow-from <APP_VPS_PUBLIC_IP>
```

This starts `docker-compose.ollama.yml`, pulls **quality + fast** models, and (if UFW exists) allows only the app VPS.

Check:

```bash
curl -s http://127.0.0.1:11434/api/tags
docker exec geoinsight-ollama ollama list
```

---

## 2. Point the app VPS at remote Ollama

On the **app** VPS:

```bash
cd /opt/geoinsight-bd
bash deploy/scripts/vps-point-ollama.sh http://<AI_SERVER_IP>:11434
```

This updates `.env`:

```env
LLM_PROVIDER=ollama
OLLAMA_URL=http://<AI_SERVER_IP>:11434
OLLAMA_MODEL=gpt-oss:20b
OLLAMA_MODEL_FAST=llama3.1:8b
SENTIMENT_USE_MOCK=true
```

…and recreates `geoinsight-ai-analytics`.

Verify:

```bash
curl -s http://127.0.0.1:8000/api/v1/sovereign-llm/status
# expect: ollama_reachable, model (quality), model_fast, policy.version=phase0-v1
```

---

## 3. Firewall checklist

| Rule | Why |
|------|-----|
| App VPS → AI `:11434` allow | Required |
| Public internet → `:11434` deny | Security |
| Prefer private VPC / Tailscale IP | Best |

---

## 4. Local Windows (dev)

Keep using host Ollama:

```env
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gpt-oss:20b
OLLAMA_MODEL_FAST=llama3.1:8b
```

Pull both models once: `ollama pull gpt-oss:20b` and `ollama pull llama3.1:8b`.

---

## 5. GPU (optional)

In `docker-compose.ollama.yml`, uncomment the NVIDIA `deploy.resources` block and install [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

---

## 6. Fallback behaviour

If Ollama is down, generative paths fall back to template replies (`sovereign_template` / rule-based). Classification still uses BanglaBERT or mock. The rest of the dashboard keeps working.

---

## Related

| Topic | Link |
|-------|------|
| Docs index | [docs/README.md](./README.md) |
| Why remote Ollama / CI-CD context | [DEPLOYMENT_AND_OPS.md §4](./DEPLOYMENT_AND_OPS.md#4-ollama--ai-approach) |
| Local Windows Docker tip | Host Ollama + `OLLAMA_URL=http://host.docker.internal:11434` in `.env` |
| Env templates | [`.env.example`](../.env.example), [`.env.production.example`](../.env.production.example), [`.env.ollama.example`](../.env.ollama.example) |
| Policy code | `services/ai-analytics-python/app/ml/ai_policy.py` |
