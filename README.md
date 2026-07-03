# Vibe-Coding & Production Playbooks

Two lifecycle stages for building web apps - fast disposable POCs, then production-grade products.

## Pick your stage

| Stage | Start here | Stack |
|---|---|---|
| **Vibe-coding POC** | [docs/vibe-coding/](docs/vibe-coding/) + [template/](template/) | Firebase, Cloud Run, hike-agentic-playground GCP |
| **Product** | [docs/product/](docs/product/) | Supabase Postgres + Hono/Drizzle API, GCE VM, Cerbos |

## Quick start (new POC)

```bash
cp -r template/ ../my-poc && cd ../my-poc
gcloud auth application-default login
cp compose.env.example compose.env
pnpm install
docker compose up --build
```

- Frontend: http://localhost:5173
- Health: http://localhost:8081/api/health

## Agents

See [AGENTS.md](AGENTS.md). Run `/grill-with-docs` before significant work.

## Domain model

- [CONTEXT.md](CONTEXT.md) - shared glossary and graduation checklist
- [CONTEXT-MAP.md](CONTEXT-MAP.md) - conventions and context index

## License

MIT
