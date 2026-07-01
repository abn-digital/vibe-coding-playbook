# Vibe-Coding Playbook (shared)

Two lifecycle stages for building web apps: fast disposable experiments, then production-grade products. This glossary covers terms that span both stages.

## Language

**Lifecycle stage**:
A phase of a project's life with fixed constraints, tooling, and exit criteria. Only two stages exist in this playbook.
_Avoid_: Track, path, mode

**Vibe-coding POC**:
The first lifecycle stage — a disposable experiment built for speed and learning, using the Firebase stack under strict resource limits.
_Avoid_: Prototype, spike, hackathon app

**Product**:
The second lifecycle stage — a production-grade app operated under the product playbook (Supabase, VM, multi-tenancy, audit).
_Avoid_: Production app, prod build

**Graduation**:
The one-way transition from vibe-coding POC to product. Triggered when any one checklist item is true — not by codebase size or team preference. The POC is rebuilt on the product stack; Firestore data is not migrated.
_Avoid_: Migration, rewrite, upgrade

### Graduation checklist

Any **one** of these is sufficient to graduate:

1. **Multi-tenant isolation** is required (more than one org/customer).
2. **Audit logs** or policy-driven RBAC (beyond Firestore security rules) is required.
3. **Users depend on the data** and there is no rollback story.
4. A **Firebase guardrail** blocks progress and cannot be fixed within vibe-coding limits (document which one).

## Agent conventions

- **AGENTS.md** at repo root is the single source of agent instructions. **CLAUDE.md** contains only `@AGENTS.md`.
- Skills live in `.agents/skills/` and are symlinked to `.claude/skills/`.
- **Always-on skills:** ponytail, modern-web-guidance — agents re-read them before generating code and before committing.
- **Sparse skill:** improve — mid-POC audit and pre-graduation only.
- **Design skill:** grill-with-docs — before significant work; produces MADR records for project-specific deviations.
