# 🛠️ Stack Tecnológico

> Qué tecnologías elegir y por qué. Cada decisión tiene un racional.

---

## Frontend

### Framework: React + Vite + TypeScript

| Decisión | Racional |
|---|---|
| **React** (no Vue, no Svelte) | Ecosistema más grande, más librerías, más gente que lo conoce. Refine y shadcn solo existen para React. |
| **Vite** (no Webpack, no Next.js) | Build instantáneo en dev, configuración mínima. No necesitamos SSR porque la app está detrás de auth. |
| **TypeScript** en modo estricto | Los tipos inferidos desde Drizzle (`tasks.$inferSelect`) dan autocompletado y errores en compile time, no en runtime. |
| **SPA** (no SSR/SSG) | La app requiere auth para todo. No hay contenido público que indexar. No necesitamos SEO. SSR agrega complejidad sin beneficio. |

### Framework CRUD: Refine v5

**¿Por qué no hacer todo a mano?** Porque en una plataforma con 19+ módulos CRUD, el 80% del código es repetitivo: listar datos, paginar, filtrar, crear, editar, borrar. Refine te da:

- `useList()`, `useCreate()`, `useUpdate()`, `useDelete()` - conectados al backend Hono en `/api/*` (custom data provider)
- `authProvider` - login/logout/session refresh
- `accessControlProvider` - integración con Cerbos
- `auditLogProvider` - logging automático de cambios
- `liveProvider` - Realtime via WebSockets

```tsx
// Sin Refine: ~200 líneas de fetch, state, loading, error handling
// Con Refine:
const { query } = useList({ resource: "tasks" });
const tasks = query?.data?.data ?? [];
```

### UI: shadcn/ui + Tailwind CSS v4

| Decisión | Racional |
|---|---|
| **shadcn/ui** (no Material UI, no Ant Design) | Copy-paste, no dependency lock-in. Los componentes son tuyos, los customizás como querés. |
| **Tailwind CSS** (no CSS Modules, no styled-components) | Utility classes = menos archivos, menos context switching. v4 con el plugin de Vite = zero config. |

---

## Backend

### API: Hono + Drizzle

API-owned data vive en **Postgres via [Drizzle](https://orm.drizzle.team)** (`backend/src/db/`) - ver [MADR 0001](../../docs/decisions/0001-drizzle-postgres-for-poc-api-data.md). El mismo layout que el POC: `src/app.ts` monta sub-routers Hono en `/api/*`, handlers tipados con el schema Drizzle.

| Pieza | Rol |
|---|---|
| **`backend/src/db/schema.ts`** | Tablas, tipos inferidos (`$inferSelect`) |
| **`backend/src/routes/`** | Un sub-router Hono por recurso |
| **`drizzle-kit migrate`** | Migraciones versionadas contra Postgres en la VM (`supabase-db`) |
| **`backend/drizzle/*.sql`** | RLS policies y funciones `SECURITY DEFINER` (SQL custom) |

```bash
# Después de editar schema.ts:
pnpm --filter backend run db:generate   # genera migración SQL
pnpm --filter backend run db:migrate    # aplica contra supabase-db en la VM
```

> **Graduación desde POC:** Reutilizá `schema.ts` y los patrones de query. Cambiá `uid` por `tenant_id`, reemplazá `db:push` por `db:migrate`, y agregá RLS en migraciones SQL.

### Supabase (self-hosted, obligatorio)

Supabase corre **en tu VM** via Docker Compose. No uses supabase.com cloud en producto.

| Servicio | Rol en product |
|---|---|
| **PostgreSQL** | `supabase-db` container en la VM - Drizzle se conecta directo (`DATABASE_URL`). Sin Cloud SQL. |
| **GoTrue** (Auth) | Google OAuth, magic links, MFA |
| **Realtime** | WebSockets para cambios en tablas (opcional) |
| **Storage** | Archivos con policies de acceso |
| ~~PostgREST~~ | No usar como API de la app - Hono + Drizzle la reemplaza |

> **Regla:** Toda la stack de app (frontend, backend, DB, auth, storage, Cerbos, proxy) vive en **tu** servidor. OAuth IdP (Google/Microsoft) es la única excepción aceptada para login.

### Lógica server-side fuera de Postgres: Hono

Para features que no viven en Postgres (analytics interno, webhooks entrantes, exports pesados), agregá rutas Hono en `backend/src/routes/` - **no** llames APIs SaaS externas:

```
Browser → Hono /api/* → servicio interno en Docker Compose (misma red)
                ↓
    1. Verifica JWT (GoTrue)
    2. Lee rol desde la DB
    3. Chequea permisos (Cerbos)
    4. Llama al container interno (analytics:4000, worker:3000, etc.)
```

> **Regla:** Credenciales de servicios internos NUNCA van al browser. Si necesitás un servicio nuevo, sumalo como container en `docker-compose.yml`, no como SaaS externo.

---

## Autorización: Cerbos

**¿Por qué no hardcodear permisos en el código?**

```tsx
// ❌ Esto se vuelve inmantenible
if (user.role === 'admin' || user.role === 'director') {
  showDeleteButton();
}
```

```yaml
# ✅ Política declarativa, versionada en Git
resourcePolicy:
  resource: "tasks"
  rules:
    - actions: ["delete"]
      effect: EFFECT_ALLOW
      roles: ["admin", "director", "tl"]
    - actions: ["delete"]
      effect: EFFECT_DENY
      roles: ["analyst", "client"]
```

**Ventajas:**
- Las policies son YAML, no código - un no-programador las puede leer
- Versionadas en Git - historial completo de cambios de permisos
- Hot-reload - cambiar un YAML actualiza los permisos sin redeploy
- Testeable - `cerbos compile` valida las policies antes del deploy

---

## Infraestructura: Docker Compose + Caddy

### Docker Compose

Un solo archivo `docker-compose.yml` define todos los servicios:

```bash
docker compose up -d     # Levanta TODO
docker compose down       # Baja TODO
docker compose logs -f    # Ve logs en tiempo real
```

> **Regla:** Si no podés levantar el stack completo con UN comando, algo está mal.

### Caddy (Reverse Proxy)

| Feature | Nginx | Caddy |
|---|---|---|
| Certificados HTTPS | Configuración manual con Let's Encrypt | **Automático** |
| Config | `nginx.conf` complejo | `Caddyfile` de 10 líneas |
| Wildcard certs | Complejo | DNS challenge nativo |
| Hot reload | `nginx -s reload` | Automático |

```
# Caddyfile completo para una SPA con API proxy:
app.midominio.com {
    handle /api/* {
        reverse_proxy backend:8081
    }
    handle {
        root * /srv
        try_files {path} /index.html
        file_server
    }
}
```

---

## Qué NO usar (y por qué)

| Tecnología | Por qué no |
|---|---|
| **Next.js** (para apps internas) | SSR agrega complejidad innecesaria si todo está detrás de auth. Vite SPA es más simple. |
| **MongoDB** | Sin RLS nativo, sin transacciones ACID confiables, schema-less = bugs en producción. |
| **Firebase Firestore** | Sin relaciones, queries limitadas, security rules con un DSL raro. |
| **JWT para roles** (en `app_metadata`) | Los JWTs son inmutables hasta que expiran. Un cambio de rol no toma efecto hasta el refresh. Leé el rol de la DB en cada request. |
| **Roles hardcodeados en el código** | Cada cambio de permisos requiere un deploy. Usá un motor de policies (Cerbos). |
| **PostgREST como API de la app** | El playbook usa Hono + Drizzle en `/api/*`. PostgREST queda en el stack de Supabase self-hosted pero no es el acceso CRUD de la app. |
| **APIs SaaS para lógica de app** | Analytics, chat, webhooks: containers en tu VM o rutas Hono. No Cube Cloud, Slack API para features de producto, etc. |
| **Cloud SQL** | Managed Postgres fuera de tu control de deploy; el playbook usa Postgres en Docker en la VM con volumen persistente (`db-data`). |
| **Optimistic mutations** | Rompen el audit log (el "antes" se sobreescribe antes de que el server responda). Usá pessimistic mode. |
