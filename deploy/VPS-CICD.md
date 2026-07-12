# CI/CD + VPS deploy notes

## Auto-deploy (push → live)

Workflow: `.github/workflows/deploy-vps.yml`

On every push to `main`, GitHub Actions SSHs into the VPS and runs:

```bash
git fetch origin main
git reset --hard origin/main
bash deploy/scripts/vps-redeploy.sh
```

### GitHub Secrets (required)

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Example |
|--------|---------|
| `VPS_HOST` | `187.127.185.67` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Full private key PEM (`-----BEGIN ... PRIVATE KEY-----` …) |

Optional: `VPS_SSH_PORT` (default 22), `VPS_DEPLOY_PATH` (default `/opt/geoinsight-bd`)

### One-time VPS SSH key for GitHub

On your laptop:

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ./geoinsight-deploy -N ""
```

- Public key → VPS `/root/.ssh/authorized_keys`
- Private key (`geoinsight-deploy`) → GitHub secret `VPS_SSH_KEY`

VPS must be a **git clone** of the repo (not only uploaded files).

---

## db-init exit 3 (fixed)

Cause: seeds ran before Prisma migrations → tables missing.

Fix: `db-migrate` runs `prisma migrate deploy`, then `db-init` seeds.

### Immediate fix on VPS (before CI is wired)

```bash
cd /opt/geoinsight-bd
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.apps.yml up -d --build
```

If stuck:

```bash
docker compose -f docker-compose.yml -f docker-compose.apps.yml logs db-migrate db-init --tail 100
```
