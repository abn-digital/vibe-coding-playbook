# Playbooks de Vibe-Coding y Producción

Dos etapas del ciclo de vida para construir aplicaciones web: POCs desechables rápidos y productos listos para producción.

## Elegí tu etapa

| Etapa | Empezá acá | Stack |
|---|---|---|
| **POC vibe-coding** | [docs/vibe-coding/](docs/vibe-coding/) + [template/](template/) | Firebase, Cloud Run, hike-agentic-playground GCP |
| **Producto** | [docs/product/](docs/product/) | Supabase Postgres + API Hono/Drizzle, VM GCE, Cerbos |

## Inicio rápido (POC nuevo)

```bash
cp -r template/ ../mi-poc && cd ../mi-poc
pnpm install
docker compose up --build
```

- Frontend: http://localhost:5173
- UI de emuladores: http://localhost:4000
- Health: http://localhost:8081/api/health

## Agentes

Ver [AGENTS.md](AGENTS.md). Ejecutá `/grill-with-docs` antes de trabajo significativo.

## Modelo de dominio

- [CONTEXT.md](CONTEXT.md) - glosario y checklist de graduación
- [CONTEXT-MAP.md](CONTEXT-MAP.md) - convenciones
