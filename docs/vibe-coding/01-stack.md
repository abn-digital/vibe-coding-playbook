# Stack

> Firebase POC stack with strict resource limits. Local dev uses **hike-agentic-playground** GCP.

Copy [template/](../../template/) before starting.

## Frontend

| Choice | Rationale |
|---|---|
| React + Vite + TypeScript | Same foundation as product stage; strong typing |
| shadcn/ui + Tailwind v4 | Accessible components, copy-paste ownership |
| Direct Firebase SDK | No Refine in POC - ponytail says skip CRUD frameworks |

## Backend (Cloud Run)

| Setting | POC value |
|---|---|
| `minScale` | 0 (cold start always) |
| `maxScale` | 1 |
| `memory` | 256Mi |
| `concurrency` | 1 |
| `timeout` | 30s |

Use Cloud Run only when Firestore rules cannot express the logic (external APIs, privileged writes).

## API data

API-owned data lives in **Postgres via [Drizzle](https://orm.drizzle.team)** (`backend/src/db/`) - see [MADR 0001](../../docs/decisions/0001-drizzle-postgres-for-poc-api-data.md). Local dev runs Postgres in Docker Compose; schema syncs with `pnpm --filter backend run db:push` (no migration files in POC). The same ORM and schema carry into the product stage (Supabase Postgres), shrinking the graduation rebuild. Deployed POCs pick a Postgres home (smallest Cloud SQL tier or free-tier Supabase) at first deploy.

## Firebase services

| Service | Role |
|---|---|
| **Hosting** | SPA + `/api/**` rewrite to Cloud Run |
| **Firestore** | Client-direct, user-scoped docs under rules-first security |
| **Auth** | Google + Anonymous only |
| **Storage** | User-scoped files, 5MB limit in rules |
| **App Check** | Abuse protection before real users |

## Local development

Docker Compose runs **frontend + backend** against the **hike-agentic-playground** GCP project. Authenticate with ADC (`gcloud auth application-default login`). No Firebase emulators.

## Out of scope for POC

Multi-tenancy, Cerbos, Refine, Cypress E2E, Cloud Functions (use Cloud Run only), Realtime Database.

## Secrets

[Varlock](https://varlock.dev) + `@varlock/google-secret-manager-plugin`. Schema in `.env.schema` - never manual `.env`.
