# Local Development

> One command: `docker compose up` — against **hike-agentic-playground** GCP (no emulators).

## Prerequisites

```bash
gcloud auth application-default login
gcloud config set project hike-agentic-playground
```

Copy Firebase web config into `compose.env` and ADC path into `.env`:

```bash
cp compose.env.example compose.env
cp .env.example .env
# .env → GCLOUD_ADC_DIR (Docker volume mount for ADC)
# compose.env → VITE_FIREBASE_* from Firebase console
```

## Setup

```bash
cp -r template/ ../my-poc && cd ../my-poc
pnpm install
docker compose up --build
```

## Services

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| API health | http://localhost:8081/api/health |

## Layout

```
frontend/
backend/
  src/routes/
  src/middleware/
  rules/
docker-compose.yml
compose.env          # ADC path + Firebase web config (gitignored)
```

## Rules

- **GCP dev project** — local Docker talks to real Firebase in `hike-agentic-playground` via ADC.
- Backend mounts `${GCLOUD_ADC_DIR}` → `/root/.config/gcloud` for `applicationDefault()` credentials.
- Never put secrets in `VITE_*` variables.

## Verification

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
curl http://localhost:8081/api/health
```

Firestore rules unit tests are skipped unless `FIRESTORE_EMULATOR_HOST` is set. Validate rules with `firebase deploy --only firestore:rules` against the dev project.
