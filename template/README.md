# Vibe-Coding POC Template

Copy this directory to start a new POC:

```bash
cp -r template/ ../my-poc && cd ../my-poc
```

See [docs/vibe-coding/](../docs/vibe-coding/) in the playbook repo for the full guide.

## Quick start

```bash
# Install dependencies (pnpm workspace — lockfile at repo root)
pnpm install

# Start emulators + frontend + backend
docker compose up
```

- Frontend: http://localhost:5173
- Firebase Emulator UI: http://localhost:4000
- API health: http://localhost:8081/api/health

## Layout

```
frontend/          React + Vite + TypeScript + shadcn/ui
backend/
  src/routes/      Handlers only
  src/middleware/  Auth + App Check verification
  rules/           Firestore + Storage security rules
terraform/         GCP provisioning (plan before apply)
```
