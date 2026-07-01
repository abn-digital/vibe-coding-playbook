# Use MADR for project-specific decisions

When a choice **deviates** from playbook defaults, add a MADR here using [MADR format](https://adr.github.io/madr/).

Playbook-standard choices (Firebase for POC, Supabase for product, two top-level dirs) do **not** need ADRs.

## Template

```markdown
# {short title}

## Context and Problem Statement

{Why this deviation is needed}

## Considered Options

- {option 1}
- {option 2}

## Decision Outcome

Chosen option: "{option}", because {justification}.
```

Filename: `NNNN-title-with-dashes.md`
