# Agent instructions

Read `CONTEXT.md` and `CONTEXT-MAP.md` before any work. This repo documents two **lifecycle stages**: vibe-coding POC and product.

## Lifecycle

| Stage | Docs | When |
|---|---|---|
| **Vibe-coding POC** | `docs/vibe-coding/` | Disposable experiments, Firebase stack |
| **Product** | `docs/product/` | Self-hosted Supabase stack on GCE VM |

Graduation is one-way rebuild - see graduation checklist in `CONTEXT.md`.

## New POC project

1. Copy `template/` to a new repo - it ships its own `AGENTS.md`, `CLAUDE.md`, `.claude/` (settings, hooks, project skill), and `docs/decisions/`.
2. Install external skills in the new repo (commands in the template's `AGENTS.md`).
3. Run `/grill-with-docs` before significant features.
4. Record project-specific deviations as [MADR](https://adr.github.io/madr/) in `docs/decisions/`.

## Project layout

POC projects copy `template/`. Product projects use the same split:

```
frontend/                 React + Vite + TypeScript + shadcn/ui + Refine
backend/
  src/app.ts              Route wiring - health public, /api/* behind auth
  src/routes/             One Hono sub-router per resource, handlers only
  src/middleware/         Auth verification (Firebase in POC, Supabase JWT in product)
  src/db/                 Drizzle schema + client (Postgres)
  drizzle/                Versioned migrations + RLS SQL (product only)
terraform/environments/   Per-environment provisioning
```

POC template also includes `src/lib/` (firebase-admin), `rules/` (Firestore + Storage).

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

### API data (both stages)

- API-owned data: **Postgres via Drizzle** ([MADR 0001](docs/decisions/0001-drizzle-postgres-for-poc-api-data.md)).
- Schema lives in `backend/src/db/schema.ts`; Hono handlers in `src/routes/`, mounted from `src/app.ts`. Never register handlers directly in `index.ts`.
- **POC:** sync with `pnpm --filter backend run db:push` - no migration files. Queries are user-scoped (`where uid = <Firebase uid>`) with `limit(25)`. Deployed POCs: Postgres in Docker on a GCE VM (not Cloud SQL).
- **Product:** migrations via `drizzle-kit generate` + `pnpm --filter backend run db:migrate` against the `supabase-db` container on the product VM. RLS policies in SQL migration files under `backend/drizzle/`. Queries are tenant-scoped (`where tenant_id = ...`) with `limit(25)`. See `docs/product/`.
- **Never Cloud SQL** or other managed Postgres SaaS - database always runs in Docker on a VM you operate, with a persistent volume.

### Self-hosted (product)

- **All runtime services** on the product VM via Docker Compose: frontend static files, Hono backend, self-hosted Supabase (Postgres, GoTrue, Realtime, Storage), Cerbos, Caddy, Redis.
- **No supabase.com cloud**, no SaaS CRUD APIs, no third-party app backends (analytics, chat, webhooks). Integrations run as containers on the same stack or as Hono routes.
- **OAuth IdP** (Google, Microsoft) is allowed for login only - identity is external, the app stack is not.
- **Tier 1 ops alerts** to Slack are the only approved external notification channel.

### Terraform

- **All** GCP resources via Terraform - monitoring, alerts, compute.
- **Always `terraform plan` before `terraform apply`** - review drift.
- GCS backend: one org bucket, prefix per environment (`poc/`, `product/`).
- Slack notification channels: **lookup existing via data source first**; create only when missing.

### CI/CD (GitHub Actions)

- Prefer **Workload Identity Federation** (GitHub OIDC → GCP) over long-lived service account JSON keys or SSH private keys in GitHub Secrets.
- Provision the WIF pool, provider, and deploy service account in Terraform. Authenticate with `google-github-actions/auth` + `permissions: id-token: write`.
- Deploy to the product VM via `gcloud compute ssh` with **OS Login** - no static SSH key in secrets when OS Login is enabled.
- Use GitHub **vars** for non-secret config (`GCP_PROJECT`, `GCE_INSTANCE`, `GCE_ZONE`, `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`). Reserve **secrets** for integrations WIF cannot cover.

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
