# Agent instructions

This is a **vibe-coding POC** scaffolded from the vibe-coding playbook - a disposable experiment built for speed and learning. The hard rules below are non-negotiable.

**Graduation** to the product stage is a one-way rebuild, triggered when any one is true: multi-tenant isolation needed, audit logs / RBAC beyond Firestore rules needed, users depend on the data with no rollback story, or a Firebase guardrail blocks progress (document which one).

## Skills (always re-read before codegen and commit)

Project skill lives in `.agents/skills/vibe-coding-playbook/` (mirrored in `.claude/skills/`). Install the external skills once:

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
| **grill-with-docs** | Before significant features; writes MADR to `docs/decisions/` |
| **improve** | Sparingly - mid-POC audit, pre-graduation only |

## Project layout

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

## Hard rules

### Secrets

- Use **Varlock** with `@varlock/google-secret-manager-plugin` and `.env.schema`.
- **Never** create, edit, or commit `.env` files. Exception: the human copies `.env.example` → `.env` (Docker substitution, only `GCLOUD_ADC_DIR`) and `compose.env.example` → `compose.env` - agents never write either.
- **Never** put secrets in `VITE_*` variables.

### Firebase

- Auth: **Google + Anonymous only**.
- Rules must use `hasVerifiedEmail()` - never assume `request.auth.token.email` exists.
- Cloud Run: `minScale: 0`, `maxScale: 1`, cold starts accepted.
- Firestore: client-direct, user-scoped docs only - `limit(25)`, no collection-group queries.

### API data

- API-owned data: **Postgres via Drizzle**.
- Schema lives in `backend/src/db/schema.ts`; sync with `pnpm --filter backend run db:push` - no migration files in POC.
- Queries are user-scoped (`where uid = <Firebase uid>`) with `limit(25)`.
- New resource = table in `schema.ts` + sub-router in `src/routes/` + mount in `src/app.ts`. Never register handlers directly in `index.ts`.

### Terraform

- **All** GCP resources via Terraform - monitoring, alerts, compute.
- **Always `terraform plan` before `terraform apply`** - review drift.

### Verification

Before commit: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm --filter backend run test:rules`, Docker smoke (`/api/health`). No Cypress E2E in POC.

**Never** use Firebase emulators - `test:rules` runs against the real project's deployed rules (needs `FIREBASE_API_KEY`, the public web key from `compose.env`; skips when unset).

### Local dev

```bash
gcloud auth application-default login
gcloud config set project hike-agentic-playground
cp compose.env.example compose.env      # human fills in Firebase web config
docker compose up -d db
pnpm --filter backend run db:push       # rerun after editing src/db/schema.ts
docker compose up                       # frontend + backend → hike-agentic-playground GCP
```

## Decisions

Deviations from playbook defaults get a [MADR](https://adr.github.io/madr/) in `docs/decisions/` - run **grill-with-docs** first.
