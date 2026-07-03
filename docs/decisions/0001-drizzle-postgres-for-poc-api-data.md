# Use Drizzle + Postgres for API-owned data

## Context and Problem Statement

Both lifecycle stages need a typed data-access layer for API-owned data. The POC default was Firestore-only, but Firestore has no ORM support: Prisma and Drizzle don't target it, and fireorm is unmaintained. Graduation rebuilds on Supabase (Postgres), so every Firestore-shaped backend is 100% throwaway at graduation. The product stage previously leaned on PostgREST for CRUD, which couples schema to an auto-generated API and makes graduation from POC a full backend rewrite.

## Considered Options

* Firestore only, typed via native `withConverter` (no dependency) - POC client-direct only
* PostgREST / Supabase client for all CRUD - product only
* Drizzle ORM + Postgres for API-owned data, Hono handlers in `backend/src/routes/`
* Prisma + Postgres

## Decision Outcome

Chosen: **Drizzle + Postgres for API-owned data in both stages**, because the same schema and queries carry from POC into product (Supabase is Postgres), shrinking graduation to infra + auth. Drizzle over Prisma: no codegen step, no query engine binary, SQL-shaped API. Hono replaces PostgREST as the app API - Refine talks to `/api/*`, not `/rest/v1/*`.

### Consequences

**POC**

* Local dev adds a `postgres:17-alpine` service to Docker Compose; schema syncs via `drizzle-kit push` (no migration files).
* Firestore remains only for client-direct, user-scoped docs under security rules.
* Deployed POCs run Postgres in Docker on a **GCE VM** (same `postgres:17-alpine` image as local compose, persistent volume). Cloud Run connects via VPC/private IP. No Cloud SQL, no supabase.com cloud.

**Product**

* Schema lives in `backend/src/db/schema.ts` (same layout as POC); migrations via `drizzle-kit generate` + `drizzle-kit migrate` against **self-hosted** Supabase Postgres (`supabase-db` container) on the product VM.
* RLS policies ship as SQL in `backend/drizzle/` custom migration files (alongside Drizzle-generated DDL) - defense in depth even though the Hono API is the primary access path.
* Queries are tenant-scoped (`where tenant_id = ...`) with `limit(25)`; new resource = table in `schema.ts` + sub-router in `src/routes/` + mount in `src/app.ts`.
* Self-hosted Supabase keeps GoTrue (auth), Realtime, and Storage on the same VM; PostgREST is not the app CRUD layer. No external SaaS APIs for app features.
