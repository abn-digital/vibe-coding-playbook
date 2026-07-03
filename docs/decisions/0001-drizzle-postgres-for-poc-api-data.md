# Use Drizzle + Postgres for API-owned data in POCs

## Context and Problem Statement

The POC backend needs a typed data-access layer ("introduce an ORM"). The playbook default was Firestore-only, but Firestore has no ORM support: Prisma and Drizzle don't target it, and fireorm is unmaintained. Graduation rebuilds on Supabase (Postgres), so every Firestore-shaped backend is 100% throwaway at graduation.

## Considered Options

* Firestore only, typed via native `withConverter` (no dependency)
* Drizzle ORM + Postgres for API-owned data, Firestore kept for client-direct docs
* Prisma + Postgres

## Decision Outcome

Chosen: **Drizzle + Postgres for API-owned data**, because the same schema and queries carry into the product stage (Supabase is Postgres), shrinking the graduation rebuild to infra + auth. Drizzle over Prisma: no codegen step, no query engine binary, SQL-shaped API — lighter fit for a disposable POC.

### Consequences

* Local dev adds a `postgres:17-alpine` service to Docker Compose; schema syncs via `drizzle-kit push` (no migration files at POC stage).
* Firestore remains only for client-direct, user-scoped docs under security rules; its hard rules (`limit(25)`, user-scoped paths) now apply to that surface only.
* Deployed POCs need a Postgres instance (smallest Cloud SQL tier or a free-tier Supabase project) — decide per project at first deploy and record a MADR.
