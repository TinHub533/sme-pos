# SME POS + Inventory

Monorepo for the SME POS project: a POS/inventory backend for small retailers, plus its Next.js frontend.

```
sme-pos/
  backend/    Spring Boot 3 API — see backend/README.md
  frontend/   Next.js 14 App Router client — see frontend/README.md
  tools/      Standalone infra pieces (Postgres, nginx) — see below
  docker-compose.yml   App services (backend + frontend)
```

## Why split this way (vs. a single combined README)

Each side has its own dependency manager, its own run/test commands, and
its own Dockerfile — `backend/` builds a JRE container image,
`frontend/` builds a Next.js standalone container image. Keeping
`backend/README.md` and `frontend/README.md` separate means each one
stays scoped to commands that actually apply inside that directory,
rather than a root README trying to interleave `mvn` and `npm` commands.

## Quickstart — Docker (whole stack)

Postgres and nginx each live in their own compose lifecycle under
`tools/`, independent of the app services and of each other, so any one
of them can be started/stopped/rebuilt without touching the others (see
`tools/postgresql/docker-compose.yml` and `tools/nginx/docker-compose.yml`
for the reasoning, repeated in each). Postgres has to exist before the app
services (it owns the shared network); nginx just needs the app services'
container names to already exist to proxy to them, so it goes last (and
is genuinely optional for local dev — the app services stay reachable on
their own published ports, 8080/3000, either way):

```
# 1. Postgres (start first, it owns the shared network)
docker compose -f tools/postgresql/docker-compose.yml up -d

# 2. Backend + frontend
docker compose up -d --build

# 3. nginx (optional — reverse proxy in front of both, port 8000)
docker compose -f tools/nginx/docker-compose.yml up -d
```

Then visit `http://localhost:3000/admin-setup` (or `:8000/admin-setup`
through nginx) to create the first platform ADMIN account (one-time — see
backend/README.md), or `/onboarding` to create a shop + Owner account
directly. There's no seed data.

Each compose file reads defaults baked in for local dev; copy
`.env.example` → `.env` in each directory that has one (root,
`tools/postgresql/`, `tools/nginx/`) to override anything for a real
deployment — see the comments in each for which values have to agree with
each other across files.

Tear down in reverse order: `docker compose -f tools/nginx/docker-compose.yml down`,
`docker compose down` (root), `docker compose -f tools/postgresql/docker-compose.yml down`
— the Postgres data volume survives unless you also pass `-v`.

## Quickstart — local dev (no Docker)

```
# 1. Postgres + backend
docker compose -f tools/postgresql/docker-compose.yml up -d
cd backend && mvn spring-boot:run

# 2. Frontend (separate terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Current status

- **Backend**: JWT auth (`ADMIN`/`OWNER`/`CASHIER`) with optional TOTP
  MFA for `ADMIN`, self-service password change + admin/owner-initiated
  resets, shop onboarding + admin bootstrap, product catalog with
  concurrency-safe inventory, cash/bank/KHQR checkout with idempotent
  webhook confirmation, receipts, daily-closing reconciliation, admin shop
  management (list/detail/suspend/reactivate — revokes already-issued
  JWTs immediately on suspend, not just at next login), an admin
  audit log, rate limiting on login/webhook, Actuator health/info,
  pagination on products/orders. See `backend/README.md` for the full
  endpoint list and what's genuinely not built yet (real KHQR gateway
  integration, outbox pattern, self-service forgot-password).
- **Frontend**: full role-scoped UI for every backend feature above
  (Owner/Cashier POS + back-office, platform Admin console covering
  shops/admins/security/audit-log, public onboarding/login/admin-bootstrap),
  loading states, pagination, print-responsive receipts, ESLint, and a
  Playwright e2e suite. See `frontend/README.md` for the route map and
  what's not built yet (real KHQR payload, ESC/POS thermal-printer
  bridge).
- **Deployment**: both apps are Dockerized (`backend/Dockerfile`,
  `frontend/Dockerfile`) with a compose setup split into app services
  (root `docker-compose.yml`) and independent tools (`tools/postgresql/`,
  `tools/nginx/` — reverse proxy, routes the KHQR webhook straight to the
  backend and everything else to the frontend; TLS deliberately left
  unconfigured, needs a real domain + cert) — see the Docker quickstart
  above.
- **CI**: `.github/workflows/backend.yml` / `frontend.yml` exist and are
  individually verified (each command runs clean standalone), but this
  repo has no git remote yet so GitHub Actions itself has never actually
  run them.
