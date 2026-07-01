# Agent Skills

> How AI agents should work in vibe-coding POCs.

## Install once

```bash
npx skills@latest add DietrichGebert/ponytail
npx skills@latest add shadcn/improve
npx skills@latest add GoogleChrome/modern-web-guidance
npx skills@latest add mattpocock/skills
```

Project skill: `.agents/skills/vibe-coding-playbook/` (symlinked to `.claude/skills/`).

## Always-on (re-read before codegen and commit)

| Skill | Role |
|---|---|
| [ponytail](https://github.com/DietrichGebert/ponytail) | Simplest solution that works |
| [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) | Current web platform best practices |

## Before significant work

| Skill | Role |
|---|---|
| [grill-with-docs](https://github.com/mattpocock/skills) | Align on design; write [MADR](../decisions/) for deviations |

## Sparingly

| Skill | Role |
|---|---|
| [improve](https://github.com/shadcn/improve) | Mid-POC audit, pre-graduation — writes plans to `plans/`, never implements |

## MADR for deviations

When a project choice **deviates** from this playbook (extra auth provider, different stack piece), write a MADR to `docs/decisions/`:

```
docs/decisions/
└── 0001-use-email-auth.md
```

Use [MADR format](https://adr.github.io/madr/). Playbook defaults do not need ADRs.

## Agent entry point

[AGENTS.md](../../AGENTS.md) is canonical. [CLAUDE.md](../../CLAUDE.md) references it.
