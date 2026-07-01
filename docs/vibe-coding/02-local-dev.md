# Local Development

> One command: `docker compose up`.

## Prerequisites

- Docker Desktop
- Node 22+ (for host-side `npm install` if needed)

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
| Firebase Emulator UI | http://localhost:4000 |
| API health | http://localhost:8081/api/health |
| Auth emulator | localhost:9099 |
| Firestore emulator | localhost:8080 |

## Layout

```
frontend/
backend/
  src/routes/
  src/middleware/
  rules/
docker-compose.yml
```

## Rules

- **Emulator-first** — never develop against production Firebase.
- Local Docker uses `json-file` logging (not `gcplogs`).
- `VITE_USE_EMULATORS=true` in compose wires the frontend SDK to emulators.

## Verification

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
curl -sf http://localhost:8081/api/health
```
