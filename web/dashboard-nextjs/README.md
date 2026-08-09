# Dashboard (Next.js 15)

National command UI for GeoInsight BD — App Router, Tailwind, Leaflet, Recharts, next-intl (bn/en), and a **BFF** that keeps JWTs in HTTP-only cookies.

**Monorepo docs:** [Root README](../../README.md) · [System Design](../../docs/SYSTEM_DESIGN.md) · [Docs hub](../../docs/README.md)

---

## Role

| Concern | Detail |
|---------|--------|
| UI | PMO → Union Chairman hierarchical dashboards |
| BFF | `/api/auth/*` + `/api/proxy/[...path]` → API Gateway |
| Real-time | Socket.io client (`NEXT_PUBLIC_SOCKET_URL`) |
| i18n | `next-intl` — বাংলা / English |
| Maps | Leaflet choropleth / proximity / crisis overlays |

Browser never stores access tokens in `localStorage`.

---

## Local run

```bash
# Gateway must be reachable (Docker :4800 or local :4000)
cd web/dashboard-nextjs
cp .env.example .env.local
npm install
npm run dev    # :3000
```

Docker full stack host URL is often **http://localhost:3600** (see root README).

Default login (seeded): `pmo@geoinsight.gov.bd` / `ChangeMe@123`

---

## Key routes

| Path | Feature |
|------|---------|
| `/` · `/dashboard` | National overview |
| `/briefing` | PM morning briefing |
| `/narrative-shield` | Counter-disinfo feed |
| `/outlook` | Strategic outlook |
| `/unrest` | Protest / unrest pulse |
| `/divisional-crisis` | Division risk pulse |
| `/anti-phishing` | Phishing RED_FLAG scanner |
| `/hazards` | Flood/cyclone + live weather |
| `/agro` · `/procurement` | Markets & commodity advisor |
| `/kpis` · `/projects` · `/alerts` | Governance ops |
| `/documents` · `/audit-trail` | Docs + AI audit timeline |
| `/notifications` | Notification center |
| `/representatives` · `/map` | Directory + geo map |
| `/login` | Auth |

Sidebar RBAC: `src/components/layout/sidebar.tsx` (`minTier` 1–4).

---

## BFF ↔ Gateway

| Browser | Gateway |
|---------|---------|
| `POST /api/auth/login` | `POST /api/v1/auth/login` + set cookies |
| `GET /api/proxy/*` | `GET /api/v1/*` with Bearer from cookie |
| Socket `@ NEXT_PUBLIC_SOCKET_URL` | Gateway WebSocket |

Client helper: `src/lib/api-client.ts` → `apiClient("/kpis/definitions")`.

---

## Key env (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `API_GATEWAY_URL` | Server-side BFF → gateway (e.g. `http://localhost:4800`) |
| `NEXT_PUBLIC_API_URL` | Public API base if needed |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io endpoint (gateway, not Next) |

---

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
