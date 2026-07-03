# Vibe-Coding POC Template

Copy this directory to start a new POC:

```bash
cp -r template/ ../my-poc && cd ../my-poc
```

## Quick start

```bash
# 1. Authenticate to GCP (ADC)
gcloud auth application-default login
gcloud config set project hike-agentic-playground

# 2. Configure local env
cp compose.env.example compose.env
cp .env.example .env
# Edit .env → GCLOUD_ADC_DIR (ADC mount for Docker)
# Edit compose.env → VITE_FIREBASE_* from Firebase console

# 3. Install and run
pnpm install
docker compose up -d db
pnpm --filter backend run db:push   # sync Drizzle schema (rerun after editing src/db/schema.ts)
docker compose up --build
```

- Frontend: http://localhost:5173
- API health: http://localhost:8081/api/health

See [02 - Local dev](../docs/vibe-coding/02-local-dev.md) for the validated checklist and troubleshooting.

## Layout

```
frontend/          React + Vite + TypeScript + shadcn/ui
backend/
  src/app.ts       Route wiring - health public, /api/* behind Firebase auth
  src/routes/      One Hono sub-router per resource, handlers only
  src/middleware/  Auth verification (ADC)
  src/db/          Drizzle schema + client (Postgres)
  src/lib/         firebase-admin init
  rules/           Firestore + Storage security rules
compose.env        Local ADC path + Firebase web config
terraform/         GCP provisioning (plan before apply)
```

## Data

API-owned data lives in **Postgres via [Drizzle](https://orm.drizzle.team)** - schema in `backend/src/db/schema.ts`, synced with `db:push` (no migration files in POC). Local and deployed Postgres both run in Docker on a VM - no Cloud SQL. Firestore remains for client-direct, user-scoped docs under security rules. Adding a resource: define the table in `schema.ts`, add a sub-router in `src/routes/`, mount it in `src/app.ts`.
