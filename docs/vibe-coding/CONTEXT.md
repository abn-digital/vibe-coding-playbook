# Vibe-coding POC

Disposable experiments built for speed and learning. Firebase stack under strict resource limits. AI agents are first-class builders.

## Language

**Guardrail**:
A hard resource or platform limit enforced in the vibe-coding playbook to keep POCs cheap and predictable.
_Avoid_: Budget cap, throttle, quota

**Cold-start Cloud Run**:
The default Cloud Run configuration for vibe-coding: min instances 0, max instances 1, accepting latency on first request.
_Avoid_: Always-on, warm pool

**Rules-first security**:
Firestore Security Rules and Storage Rules are the only client-facing authorization layer in vibe-coding. No Cerbos, no server-side RBAC framework.
_Avoid_: App-level auth checks only

**Emulator-first**:
Local development runs against the Firebase Emulator Suite via Docker Compose (emulators + frontend + backend) before any deploy to production Firebase resources.
_Avoid_: Dev against prod, live debugging, host-only npm dev

**Anonymous user**:
A Firebase Auth session with no email claim (`request.auth.token.email == null`). Rules that require email must explicitly exclude or upgrade anonymous users.
_Avoid_: Guest user, unauthenticated user

**Varlock**:
Schema-driven configuration (`.env.schema`) with secrets resolved from Google Secret Manager via the `gsm()` resolver. Agents never create or edit `.env` files manually.
_Avoid_: dotenv, env files, secrets in VITE_ vars

**Middleware**:
Server-side cross-cutting gates inside `backend/src/middleware/` (auth + App Check verification). Not business logic.
_Avoid_: Route handlers in middleware, middleware folder in frontend

**Security rules**:
Firestore and Storage rules in `backend/rules/`. Deployed via Firebase CLI; never contain business logic.
_Avoid_: Rules in frontend, client-side authorization only

**Template**:
The minimal runnable POC scaffold in `template/` at the playbook repo root. Copied into a new project before vibe-coding begins.
_Avoid_: Boilerplate, starter kit, example app

**Verification gate**:
A machine-checkable command that must pass before a change is considered done. POC gates: typecheck, lint, unit tests (rules + middleware), Docker health smoke. No E2E.
_Avoid_: Manual testing only, Cypress, playwright

**Health endpoint**:
`GET /api/health` returns 200 with service identity. Used by Docker healthchecks, Cloud Run probes, and GCP uptime checks.
_Avoid_: Ping, status, readiness (unless qualified)

**Alert**:
A Tier 1 Cloud Monitoring policy provisioned via Terraform. Notifications go to Slack only. POC and product share the same alert types where applicable.
_Avoid_: PagerDuty, email, Tier 2/3 noise
