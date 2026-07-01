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
docker compose up --build
```

- Frontend: http://localhost:5173
- API health: http://localhost:8081/api/health

## Layout

```
frontend/          React + Vite + TypeScript + shadcn/ui
backend/
  src/routes/      Handlers only
  src/middleware/  Auth verification (ADC)
  rules/           Firestore + Storage security rules
compose.env        Local ADC path + Firebase web config
terraform/         GCP provisioning (plan before apply)
```
