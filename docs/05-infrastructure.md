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
│  │  Frontend (SPA)      │  │  Kong (:8000)       │   │
│  │  dist/ servido       │  │  API Gateway        │   │
│  │  como static files   │  │  → Auth, REST,      │   │
│  └─────────────────────┘  │    Realtime, Storage │   │
│                            └───────┬─────────────┘   │
│                                    │                 │
│  ┌─────────────┐  ┌───────────────▼──────────────┐  │
│  │ Cerbos      │  │  PostgreSQL + GoTrue +        │  │
│  │ :3593       │  │  PostgREST + Realtime +       │  │
│  │ Permisos    │  │  Storage + Edge Functions     │  │
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
  # Base de datos — SIEMPRE primero, con healthcheck
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
  
  # API Gateway — depende de los servicios
  supabase-kong:
    depends_on:
      - supabase-auth
      - supabase-rest
      - supabase-realtime
      - supabase-storage
  
  # Reverse proxy — depende del gateway
  caddy:
    depends_on:
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
| **Migraciones** (`supabase/migrations/`) | Manualmente después del `up` | Crear tablas, policies, triggers |
| **Seed** (`supabase/seed.sql`) | Manualmente después de migraciones | Datos de prueba para dev |

```bash
# Flujo completo desde cero:
docker compose up -d                    # 1. Levanta todo (init scripts corren)
./apply-migrations.sh                   # 2. Aplica migraciones
psql < supabase/seed.sql               # 3. Seed de datos
npm run dev                             # 4. Frontend
```

---

## Caddy: HTTPS Automático

### Caddyfile para SPA + API proxy

```
# Producción: dominio con HTTPS automático
app.midominio.com {
    # API requests → Kong
    handle /api/* {
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

1. **`.env` NUNCA va a git** — está en `.gitignore`
2. **`.env.example` SIEMPRE va a git** — con placeholders
3. **Secrets van en el server**, no en CI — usa GitHub Secrets para Actions
4. **`VITE_*` prefixed vars** son las únicas que llegan al browser — cuidado con lo que exponés

```bash
# ✅ Seguro en VITE_ (público)
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=eyJ...    # Anon key es safe (RLS protege)

# ❌ NUNCA poner en VITE_ (secreto)
SERVICE_ROLE_KEY=eyJ...           # Bypasea RLS
CUBE_API_SECRET=abc...            # Credenciales de API externa
```

---

## GitHub Actions: CI/CD

### Deploy automático en merge a main/master

```yaml
name: Deploy on merge
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          firebaseServiceAccount: ${{ secrets.FIREBASE_SA }}
          channelId: live
```

### Preview en Pull Requests

```yaml
name: Deploy Preview on PR
on: pull_request
jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          firebaseServiceAccount: ${{ secrets.FIREBASE_SA }}
          # Sin channelId = preview channel temporal
```

> **Resultado:** Cada PR tiene su propia URL de preview. Los reviewers pueden ver los cambios en vivo antes de aprobar.
