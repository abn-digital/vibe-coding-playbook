# Context Map

## Contexts

- [Vibe-coding POC](./docs/vibe-coding/CONTEXT.md) — Firebase stack, strict limits, AI-assisted fast iteration _(docs pending)_
- [Product](./docs/product/CONTEXT.md) — Supabase self-hosted, VM deploy, multi-tenancy, Cerbos

## Relationships

- **Vibe-coding POC → Product**: Graduation is one-way. The POC is discarded or used as reference; the product is rebuilt on the product stack — not incrementally migrated table-by-table.

## Conventions

- **Playbook language**: English only (`docs/product/`, `docs/vibe-coding/`).
- **README**: `README.md` (English) + `README.es.md` (Spanish summary / entry point).
- **Project-specific decisions**: [MADR](https://adr.github.io/madr/) records in `docs/decisions/` when a choice deviates from playbook defaults.
- **Scaffolded POC layout**: `frontend/` and `backend/` at repo root. Security boundary (rules, `firebase.json`, server middleware) lives inside `backend/`.
- **Secrets**: [Varlock](https://varlock.dev) with `@varlock/google-secret-manager-plugin` — no manual `.env` manipulation; schema-driven config only.
- **Local dev**: Docker Compose with three services — Firebase emulators, frontend (Vite), backend (Cloud Run equivalent). Single entry point: `docker compose up`.
- **Starter scaffold**: `template/` directory (copy to start a new POC). Documented and referenced from `docs/vibe-coding/`.
- **POC verification**: typecheck, lint, unit tests (Firestore rules + server middleware), Docker health smoke. No Cypress E2E — E2E belongs to the product stage.
- **POC CI**: PR = verify + Docker smoke (emulators only, no prod access). `main` = verify + Firebase Hosting preview. Production deploy = manual workflow dispatch or tag.
- **Observability**: Local Docker uses `json-file` logs. **Deployed** product stack uses `gcplogs` driver → Cloud Logging. POC Cloud Run uses native Cloud Logging. GCP uptime checks + alert policies on both stages.
- **Ops Agent**: Host metrics on product GCE VMs; collection interval **20 minutes** (`collection_interval: 1200s`).
- **Infrastructure as code**: All GCP resources provisioned with **Terraform** — compute, monitoring, uptime checks, alert policies. **Slack notification channels: look up existing channels via Terraform data sources first**; create only when none exists.
- **Terraform state**: GCS backend — one org bucket, **separate prefix per environment** (e.g. `poc/my-app`, `product/my-app`). Each `terraform/environments/*/` directory owns its own backend config and provisioning.
- **Terraform workflow**: Always `terraform plan` before `terraform apply` — review drift and unexpected changes; never apply without a reviewed plan.
- **Alerting**: Tier 1 only — uptime failure, Cloud Run 5xx (POC), VM down (product), disk > 85%, memory > 90%. All notifications to a **Slack channel** (no paging/SMS).
