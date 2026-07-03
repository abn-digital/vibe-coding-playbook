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
| **`drizzle-kit migrate`** | Migraciones versionadas contra Supabase Postgres |
| **`backend/drizzle/*.sql`** | RLS policies y funciones `SECURITY DEFINER` (SQL custom) |

```bash
# Después de editar schema.ts:
pnpm --filter backend run db:generate   # genera migración SQL
pnpm --filter backend run db:migrate    # aplica contra Supabase Postgres
```

> **Graduación desde POC:** Reutilizá `schema.ts` y los patrones de query. Cambiá `uid` por `tenant_id`, reemplazá `db:push` por `db:migrate`, y agregá RLS en migraciones SQL.

### Supabase (self-hosted)

Supabase provee la infra de datos y servicios auxiliares - **no** es la capa CRUD de la app:

| Servicio | Rol en product |
|---|---|
| **PostgreSQL** | Host de la DB - Drizzle se conecta directo (`DATABASE_URL`) |
| **GoTrue** (Auth) | Google OAuth, magic links, MFA |
| **Realtime** | WebSockets para cambios en tablas (opcional) |
| **Storage** | Archivos con policies de acceso |
| ~~PostgREST~~ | No usar como API de la app - Hono + Drizzle la reemplaza |

#### ¿Por qué self-hosted?

| Cloud (supabase.com) | Self-hosted |
|---|---|
| ✅ Setup en 2 minutos | ❌ Setup más complejo |
| ❌ Datos en servers de Supabase | ✅ Datos en TU servidor |
| ❌ Límites del plan | ✅ Sin límites |
| ❌ Latencia a US | ✅ Cerca de tus usuarios |
| ❌ Vendor lock-in en pricing | ✅ Solo pagás el compute |

> **Cuándo usar Cloud:** Prototipos, apps pequeñas, cuando no tenés ops team.
> **Cuándo usar self-hosted:** Datos sensibles, compliance, apps de producción a escala.

### Edge Functions: Deno

Para lógica server-side que no vive en Postgres (proxies a APIs externas, webhooks):

```
Browser → Edge Function → API externa (Cube, Slack, etc.)
                ↓
    1. Verifica JWT
    2. Lee rol desde la DB
    3. Chequea permisos (Cerbos)
    4. Proxy con credenciales del servidor
```

> **Regla:** Las credenciales de servicios externos NUNCA van al browser. Siempre pasan por un proxy server-side.

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
| **PostgREST como API de la app** | El playbook usa Hono + Drizzle en `/api/*`. PostgREST queda disponible en el stack de Supabase pero no es el acceso CRUD de la app. |
| **Optimistic mutations** | Rompen el audit log (el "antes" se sobreescribe antes de que el server responda). Usá pessimistic mode. |
