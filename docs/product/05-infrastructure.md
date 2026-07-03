# 🚀 Infraestructura y Deploy

> De localhost a producción sin sorpresas.

---

## Arquitectura de Producción

```
┌─────────────────────────────────────────────────────┐
│  GCP Compute Engine (4+ vCPUs, 16GB+ RAM)           │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Caddy (Reverse Proxy, HTTPS automático)     │   │
│  │  :80 / :443                                  │   │
│  └──────────┬──────────────────────┬────────────┘   │
│             │                      │                │
│  ┌──────────▼──────────┐  ┌───────▼────────────┐   │
│  │  Frontend (SPA)      │  │  Backend (Hono)     │   │
│  │  dist/ servido       │  │  :8081 /api/*       │   │
│  │  como static files   │  │  Drizzle → Postgres │   │
│  └─────────────────────┘  └───────┬─────────────┘   │
│                                    │                 │
│  ┌─────────────┐  ┌───────────────▼──────────────┐  │
│  │ Cerbos      │  │  PostgreSQL + GoTrue +        │  │
│  │ :3593       │  │  Realtime + Storage           │  │
│  │ Permisos    │  │  (Kong para auth/realtime)    │  │
│  └─────────────┘  └──────────────────────────────┘  │
│                                                     │
│  ┌─────────────┐                                    │
│  │ Redis       │                                    │
│  │ Cache       │                                    │
│  └─────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

---

## Docker Compose: Un Comando Para Todo

### Principio: Si no levanta con un comando, está mal

```bash
# Desarrollo
docker compose -f docker/docker-compose.yml up -d

# Ver logs
docker compose -f docker/docker-compose.yml logs -f

# Bajar todo
docker compose -f docker/docker-compose.yml down

# Bajar todo Y borrar datos (fresh start)
docker compose -f docker/docker-compose.yml down -v
```

### Estructura del docker-compose.yml

```yaml
services:
  # Base de datos - Postgres en la VM (no Cloud SQL). SIEMPRE primero, con healthcheck
  supabase-db:
    image: supabase/postgres:15.x
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U supabase_admin"]
      interval: 10s
      retries: 20
    volumes:
      - db-data:/var/lib/postgresql/data    # Persistente
      - ./init:/docker-entrypoint-initdb.d  # Init scripts (solo volumen nuevo)
  
  # Servicios que dependen de la DB
  supabase-auth:
    depends_on:
      supabase-db:
        condition: service_healthy   # ← Espera a que la DB esté lista
  
  # API Gateway - depende de los servicios
  supabase-kong:
    depends_on:
      - supabase-auth
      - supabase-rest
      - supabase-realtime
      - supabase-storage
  
  # Backend API - Hono + Drizzle
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://supabase_admin:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
      PORT: "8081"
    depends_on:
      supabase-db:
        condition: service_healthy

  # Reverse proxy - depende del backend y del gateway Supabase
  caddy:
    depends_on:
      - backend
      - supabase-kong

volumes:
  db-data:     # Datos de PostgreSQL (persistente)
```

### Orden de dependencias:

```
DB → Auth, REST, Realtime, Storage → Kong → Caddy
                                   ↗
Edge Functions (independiente) ──
```

---

## Init Scripts vs Migraciones

| Concepto | Cuándo corre | Para qué |
|---|---|---|
| **Init scripts** (`docker-entrypoint-initdb.d/`) | Solo cuando el volumen es NUEVO | Crear roles, schemas, extensiones |
| **Migraciones Drizzle** (`backend/drizzle/`) | Manualmente después del `up` | DDL de tablas (generado) + RLS policies (SQL custom) |
| **Seed** (`backend/seed.sql` o script) | Manualmente después de migraciones | Datos de prueba para dev |

```bash
# Flujo completo desde cero:
docker compose up -d                    # 1. Levanta todo (init scripts corren)
pnpm --filter backend run db:migrate    # 2. Aplica migraciones Drizzle + RLS
pnpm --filter backend run db:seed       # 3. Seed de datos (si existe)
pnpm run dev                            # 4. Frontend + backend
```

---

## Caddy: HTTPS Automático

### Caddyfile para SPA + API proxy

```
# Producción: dominio con HTTPS automático
app.midominio.com {
    # API requests → Hono backend
    handle /api/* {
        reverse_proxy backend:8081
    }

    # Auth / Realtime / Storage → Kong (Supabase)
    handle /auth/* /realtime/* /storage/* {
        reverse_proxy supabase-kong:8000
    }
    
    # Todo lo demás → SPA
    handle {
        root * /srv
        try_files {path} /index.html
        file_server
    }
}

# Wildcard para portales de clientes
*.portal.midominio.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}  # DNS challenge para wildcard
    }
    
    handle {
        root * /srv
        try_files {path} /index.html
        file_server
    }
}
```

> **¿Por qué Caddy y no Nginx?** Certificados HTTPS automáticos sin configuración. Wildcard certs con DNS challenge nativo. Config de 10 líneas vs 50.

---

## Variables de Entorno

### Estructura de archivos .env

```
proyecto/
├── .env                 # Variables del proyecto (Vite las lee)
├── .env.example         # Template (committed en git)
├── docker/
│   ├── .env             # Variables para Docker Compose
│   └── kong.yml         # Config de Kong con keys hardcodeadas
```

### Reglas

1. **`.env` NUNCA va a git** - está en `.gitignore`
2. **`.env.example` SIEMPRE va a git** - con placeholders
3. **CI auth:** preferí **Workload Identity Federation** (GitHub OIDC → GCP) sobre JSON keys o SSH private keys en secrets. Usá GitHub **vars** para config no sensible (project, zone, instance, WIF provider path).
4. **`VITE_*` prefixed vars** son las únicas que llegan al browser - cuidado con lo que exponés

```bash
# ✅ Seguro en VITE_ (público)
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=eyJ...    # Anon key es safe (RLS protege)

# ❌ NUNCA poner en VITE_ (secreto)
SERVICE_ROLE_KEY=eyJ...           # Bypasea RLS
ANALYTICS_INTERNAL_TOKEN=abc...   # Credenciales de servicio interno en Docker
```

---

## GitHub Actions: CI/CD

Product deploys to **your GCE VM** - not Firebase Hosting, not supabase.com.

### CI auth: Workload Identity Federation (preferido)

Autenticá GitHub Actions a GCP con **OIDC + Workload Identity Federation** - sin JSON keys ni SSH private keys en secrets cuando es viable.

| Enfoque | Cuándo |
|---|---|
| **WIF + `gcloud compute ssh` + OS Login** ✅ | Product deploy a GCE VM (default) |
| **WIF + `google-github-actions/auth`** | Cualquier step que llame APIs de GCP (Artifact Registry, Cloud Run deploy en POC, etc.) |
| **GitHub Secret (JSON key / SSH key)** | Solo si WIF no aplica - documentá el porqué en un MADR |

Provisioná en Terraform: `google_iam_workload_identity_pool`, provider para `token.actions.githubusercontent.com`, service account de deploy con `roles/compute.osAdminLogin` (o más acotado) + binding `workloadIdentityUser`.

GitHub repo settings:

- **Vars:** `GCP_PROJECT`, `GCE_INSTANCE`, `GCE_ZONE`, `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`
- **Secrets:** evitá keys estáticas; `FIREBASE_API_KEY` en POC rules tests es público (web config)

### Deploy automático en merge a main/master

```yaml
name: Deploy on merge
on:
  push:
    branches: [master]

permissions:
  id-token: write   # required for WIF
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install && pnpm run build

      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}
          service_account: ${{ vars.GCP_DEPLOY_SA }}

      - name: Deploy on GCE VM (OS Login - no SSH key secret)
        run: |
          gcloud compute ssh ${{ vars.GCE_INSTANCE }} \
            --zone=${{ vars.GCE_ZONE }} \
            --project=${{ vars.GCP_PROJECT }} \
            --command="cd /opt/app && git pull && docker compose up -d --build && pnpm --filter backend run db:migrate"
```

### Verify en Pull Requests (sin deploy)

```yaml
name: Verify on PR
on: pull_request
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm run typecheck && pnpm run lint && pnpm run build
      - run: pnpm exec cerbos compile cerbos/policies
```

> **Regla:** CI verifica y construye; el deploy corre contra **tu VM self-hosted**. No uses Firebase Hosting ni previews en SaaS para producto.
