# Agent instructions

Read `CONTEXT.md` and `CONTEXT-MAP.md` before any work. This repo documents two **lifecycle stages**: vibe-coding POC and product.

## Lifecycle

| Stage | Docs | When |
|---|---|---|
| **Vibe-coding POC** | `docs/vibe-coding/` | Disposable experiments, Firebase stack |
| **Product** | `docs/product/` | Production-grade, Supabase on VM |

Graduation is one-way rebuild - see graduation checklist in `CONTEXT.md`.

## New POC project

1. Copy `template/` to a new repo - it ships its own `AGENTS.md`, `CLAUDE.md`, `.claude/` (settings, hooks, project skill), and `docs/decisions/`.
2. Install external skills in the new repo (commands in the template's `AGENTS.md`).
3. Run `/grill-with-docs` before significant features.
4. Record project-specific deviations as [MADR](https://adr.github.io/madr/) in `docs/decisions/`.

## Project layout (from `template/`)

```
frontend/                 React + Vite + TypeScript + shadcn/ui
backend/
  src/app.ts              Route wiring - health public, /api/* behind auth
  src/routes/             One Hono sub-router per resource, handlers only
  src/middleware/         Auth verification
  src/db/                 Drizzle schema + client (Postgres)
  src/lib/                firebase-admin init
  rules/                  Firestore + Storage rules + unit tests
terraform/environments/   Per-environment provisioning
```

## Skills (always re-read before codegen and commit)

Install once from the playbook repo root:

```bash
./scripts/setup-skills.sh      # macOS/Linux
# or
./scripts/setup-skills.ps1     # Windows
```

Or manually:

```bash
npx skills@latest add DietrichGebert/ponytail -y
npx skills@latest add shadcn/improve -y
npx skills@latest add GoogleChrome/modern-web-guidance -y
npx skills@latest add mattpocock/skills -y --skill grill-me grilling grill-with-docs
```

| Skill | When |
|---|---|
| **ponytail** | Every session - default `full` intensity |
| **modern-web-guidance** | Before any UI, layout, form, or frontend perf work |
| **grilling** | Core interview primitive - one question at a time |
| **grill-me** | Stateless grill when there is no codebase yet |
| **grill-with-docs** | Before significant features; writes MADR to `docs/decisions/` |
| **improve** | Sparingly - mid-POC audit, pre-graduation only |

Project-local skills live in `.agents/skills/` (symlinked to `.claude/skills/`).

## Hard rules

### Secrets

- Use **Varlock** with `@varlock/google-secret-manager-plugin` and `.env.schema`.
- **Never** create, edit, or commit `.env` files. Exception: the human copies `.env.example` → `.env` (Docker substitution, only `GCLOUD_ADC_DIR`) and `compose.env.example` → `compose.env` - agents never write either.
- **Never** put secrets in `VITE_*` variables.

### Firebase (POC)

- Auth: **Google + Anonymous only**.
- Rules must use `hasVerifiedEmail()` - never assume `request.auth.token.email` exists.
- Cloud Run: `minScale: 0`, `maxScale: 1`, cold starts accepted.
- Firestore: client-direct, user-scoped docs only - `limit(25)`, no collection-group queries.

### API data (POC)

- API-owned data: **Postgres via Drizzle** ([MADR 0001](docs/decisions/0001-drizzle-postgres-for-poc-api-data.md)).
- Schema lives in `backend/src/db/schema.ts`; sync with `pnpm --filter backend run db:push` - no migration files in POC.
- Queries are user-scoped (`where uid = <Firebase uid>`) with `limit(25)`.
- New resource = table in `schema.ts` + sub-router in `src/routes/` + mount in `src/app.ts`. Never register handlers directly in `index.ts`.

### Terraform

- **All** GCP resources via Terraform - monitoring, alerts, compute.
- **Always `terraform plan` before `terraform apply`** - review drift.
- GCS backend: one org bucket, prefix per environment (`poc/`, `product/`).
- Slack notification channels: **lookup existing via data source first**; create only when missing.

### Observability

- Local Docker: `json-file` logs.
- Deployed product VM: `gcplogs` → Cloud Logging.
- POC Cloud Run: native Cloud Logging.
- Ops Agent on product VMs: `collection_interval: 1200s` (20 minutes).
- Tier 1 alerts → Slack only: uptime, Cloud Run 5xx (POC), VM down, disk > 85%, memory > 90%.
- Health endpoint: `GET /api/health`.

### Verification (POC)

Before commit: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm --filter backend run test:rules`, Docker smoke (`/api/health`).
No Cypress E2E in POC. Rules tests hit the **real** project's deployed rules (no emulators - too heavy locally); they need `FIREBASE_API_KEY` and skip when it is unset.

### Local dev

```bash
gcloud auth application-default login
gcloud config set project hike-agentic-playground
cp compose.env.example compose.env   # fill in ADC path + Firebase web config
docker compose up                    # frontend + backend → hike-agentic-playground GCP
```

Never use Firebase emulators for local development.

## Language

Playbook docs are **English**. `README.es.md` is the Spanish entry point for humans.
