# Local Development

> One command: `docker compose up --build` — against **hike-agentic-playground** GCP (no emulators).

This flow was validated on Windows with Docker Desktop, Node 22, and pnpm 9.

## Prerequisites

1. **Google Cloud CLI** with Application Default Credentials:

```bash
gcloud auth application-default login
gcloud config set project hike-agentic-playground   # not your default org project
gcloud auth application-default print-access-token  # should succeed
```

2. **Firebase CLI** (optional — to fetch web config without the console):

```bash
firebase login
firebase apps:list --project=hike-agentic-playground
firebase apps:sdkconfig WEB <APP_ID> --project=hike-agentic-playground
```

3. **Docker Desktop** running.

4. **pnpm** (matches `packageManager` in root `package.json`).

## First-time setup

Copy the template and configure env files:

```bash
cp -r template/ ../my-poc && cd ../my-poc
cp compose.env.example compose.env
cp .env.example .env
pnpm install
```

| File | Purpose |
|---|---|
| `.env` | `GCLOUD_ADC_DIR` — host path mounted into backend container for ADC |
| `compose.env` | `VITE_FIREBASE_*` — public Firebase web config (not secrets) |

**`.env` (Windows example):**

```
GCLOUD_ADC_DIR=C:/Users/YOU/AppData/Roaming/gcloud
```

**`.env` (macOS/Linux example):**

```
GCLOUD_ADC_DIR=/Users/YOU/.config/gcloud
```

**`compose.env`** — fill from Firebase console or `firebase apps:sdkconfig`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=hike-agentic-playground.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hike-agentic-playground
```

## Run

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| API health | http://localhost:8081/api/health |

Backend mounts `${GCLOUD_ADC_DIR}` → `/root/.config/gcloud` (read-only) so `firebase-admin` uses `applicationDefault()`.

## Layout

```
frontend/
backend/
  src/routes/
  src/middleware/
  rules/
docker-compose.yml
.env                 # GCLOUD_ADC_DIR (gitignored)
compose.env          # VITE_FIREBASE_* (gitignored)
```

## Validated checklist

Run these after setup. All should pass before you treat local dev as working.

### 1. Static checks (host)

```bash
pnpm run typecheck   # exit 0
pnpm run lint        # exit 0
pnpm run test        # 1 passed, firestore rules skipped
```

Expected test output:

```
✓ src/routes/health.test.ts
↓ rules/firestore.test.ts (skipped)
```

Firestore rules unit tests are **opt-in** — they require an emulator and are not part of the default POC workflow. To run them explicitly (only if you add emulator support locally):

```bash
RUN_FIRESTORE_RULES_TESTS=true FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm run test
```

For POC projects, validate rules by deploying to the dev project:

```bash
firebase deploy --only firestore:rules --project=hike-agentic-playground
```

### 2. Docker smoke

```bash
docker compose up --build -d --wait
curl http://localhost:8081/api/health
# → {"status":"ok","service":"api","version":"0.1.0"}
curl -o /dev/null -w "%{http_code}\n" http://localhost:5173
# → 200
```

On Windows PowerShell, use `curl.exe` (not the `Invoke-WebRequest` alias).

### 3. Auth smoke (browser)

1. Open http://localhost:5173
2. Click **Anonymous** — page should show `Signed in as <uid> (anonymous)`
3. Sign out (refresh) and try **Google** — completes OAuth against the dev project

If anonymous sign-in fails, check browser devtools for Firebase config errors (wrong `VITE_FIREBASE_*` in `compose.env`).

## Rules

- **GCP dev project only** — local Docker talks to real Firebase in `hike-agentic-playground` via ADC.
- **No Firebase emulators** in the POC playbook.
- Never put secrets in `VITE_*` variables (web config is public by design).
- Always `gcloud config set project hike-agentic-playground` — your shell default may point elsewhere.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ports are not available: 5173` | Stop a stray Vite dev server: `netstat -ano \| findstr :5173` (Windows) or `lsof -i :5173` (macOS), kill the PID, then `docker compose up` again |
| Backend unhealthy / Firebase auth errors | Re-run `gcloud auth application-default login`; confirm `.env` → `GCLOUD_ADC_DIR` points at the folder containing `application_default_credentials.json` |
| `pnpm install` EPERM on `node_modules` | Run `docker compose down` first — volume mounts lock files while containers are up |
| Firestore rules tests fail locally | Stale `FIRESTORE_EMULATOR_HOST` in your shell — unset it, or rely on the default skip (tests only run when `RUN_FIRESTORE_RULES_TESTS=true`) |
| Frontend loads but auth fails | Regenerate `compose.env` from `firebase apps:sdkconfig`; restart frontend container |
| Wrong GCP project in logs | `gcloud config set project hike-agentic-playground` |

## Stop

```bash
docker compose down
```
