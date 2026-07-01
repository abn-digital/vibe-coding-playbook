---
name: vibe-coding-playbook
description: Conventions for vibe-coding POC projects scaffolded from this playbook. Use when working in a POC repo copied from template/.
---

# Vibe-Coding Playbook (project skill)

Read `AGENTS.md` at the playbook repo root (or the copied project's root after you add these rules).

## Before writing code

1. Re-read **ponytail** and **modern-web-guidance** skills.
2. Check `docs/decisions/` for MADR records that override defaults.

## Before committing

1. Re-read **ponytail** and **modern-web-guidance**.
2. Run: `npm run typecheck && npm run lint && npm run test`.
3. Run Docker smoke if infrastructure changed.

## Deviations from playbook

If you must deviate (e.g. extra auth provider, multi-tenant POC), run **grill-with-docs** and write a MADR to `docs/decisions/` before implementing.
