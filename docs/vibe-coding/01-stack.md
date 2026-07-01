# Stack

> Firebase POC stack with strict resource limits.

Copy [template/](../../template/) before starting.

## Frontend

| Choice | Rationale |
|---|---|
| React + Vite + TypeScript | Same foundation as product stage; strong typing |
| shadcn/ui + Tailwind v4 | Accessible components, copy-paste ownership |
| Direct Firebase SDK | No Refine in POC — ponytail says skip CRUD frameworks |

## Backend (Cloud Run)

| Setting | POC value |
|---|---|
| `minScale` | 0 (cold start always) |
| `maxScale` | 1 |
| `memory` | 256Mi |
| `concurrency` | 1 |
| `timeout` | 30s |

Use Cloud Run only when Firestore rules cannot express the logic (external APIs, privileged writes).

## Firebase services

| Service | Role |
|---|---|
| **Hosting** | SPA + `/api/**` rewrite to Cloud Run |
| **Firestore** | Primary data store, rules-first security |
| **Auth** | Google + Anonymous only |
| **Storage** | User-scoped files, 5MB limit in rules |
| **App Check** | Abuse protection before real users |
| **Emulators** | Local dev via Docker (never prod) |

## Out of scope for POC

Multi-tenancy, Cerbos, Refine, Cypress E2E, Cloud Functions (use Cloud Run only), Realtime Database.

## Secrets

[Varlock](https://varlock.dev) + `@varlock/google-secret-manager-plugin`. Schema in `.env.schema` — never manual `.env`.
