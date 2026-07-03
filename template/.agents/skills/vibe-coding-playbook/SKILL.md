---
name: vibe-coding-playbook
description: Conventions for vibe-coding POC projects scaffolded from this playbook. Use when working in a POC repo copied from template/.
---

# Vibe-Coding Playbook (project skill)

Read `AGENTS.md` at the project root.

## Before writing code

1. Re-read **ponytail** and **modern-web-guidance** skills.
2. Check `docs/decisions/` for MADR records that override defaults.

## Before committing

1. Re-read **ponytail** and **modern-web-guidance**.
2. Run: `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm --filter backend run test:rules`.
3. Run Docker smoke if infrastructure changed.

## Deviations from playbook

If you must deviate (e.g. extra auth provider, multi-tenant POC), run **grill-with-docs** and write a MADR to `docs/decisions/` before implementing.
