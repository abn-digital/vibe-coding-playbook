# Product

Production-grade apps operated under the product playbook: Supabase self-hosted, VM deploy, multi-tenancy, Cerbos, audit logs.

## Language

**Tenant**:
An organization or customer served by a single app instance, isolated from other tenants by `tenant_id` and Row Level Security.
_Avoid_: Client, account, org (in code)

**Row Level Security (RLS)**:
Postgres-enforced data isolation - the server rejects cross-tenant reads and writes regardless of what the client sends.
_Avoid_: Client-side filtering, app-level checks only

**Drizzle**:
The typed ORM for API-owned data in `backend/src/db/`. Same schema and query patterns as the POC stage; product uses versioned migrations instead of `db:push`.
_Avoid_: PostgREST as the app CRUD layer, Prisma

**gcplogs**:
The Docker logging driver that ships container stdout/stderr to Google Cloud Logging. Used on deployed product stacks (GCE VM), not in local dev.
_Avoid_: json-file (in production), fluentd

**Terraform**:
The only approved tool for provisioning GCP resources - compute, networking, monitoring, and alert policies. Slack channels are discovered from existing GCP state before creating new ones.
_Avoid_: gcloud one-offs, click-ops, manual console setup

**Environment**:
An isolated Terraform workspace with its own GCS state prefix (`poc/`, `product/`) and variable set. Provisioning is run per environment, never combined.
_Avoid_: Stage, workspace (unless referring to Terraform Cloud)
