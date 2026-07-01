# 🛠️ Stack Tecnológico

> Qué tecnologías elegir y por qué. Cada decisión tiene un racional.

---

## Frontend

### Framework: React + Vite + TypeScript

| Decisión | Racional |
|---|---|
| **React** (no Vue, no Svelte) | Ecosistema más grande, más librerías, más gente que lo conoce. Refine y shadcn solo existen para React. |
| **Vite** (no Webpack, no Next.js) | Build instantáneo en dev, configuración mínima. No necesitamos SSR porque la app está detrás de auth. |
| **TypeScript** en modo estricto | Los tipos generados desde la DB (`Tables<"tasks">`) te dan autocompletado y te avisan errores en compile time, no en runtime. |
| **SPA** (no SSR/SSG) | La app requiere auth para todo. No hay contenido público que indexar. No necesitamos SEO. SSR agrega complejidad sin beneficio. |

### Framework CRUD: Refine v5

**¿Por qué no hacer todo a mano?** Porque en una plataforma con 19+ módulos CRUD, el 80% del código es repetitivo: listar datos, paginar, filtrar, crear, editar, borrar. Refine te da:

- `useList()`, `useCreate()`, `useUpdate()`, `useDelete()` — conectados a Supabase
- `authProvider` — login/logout/session refresh
- `accessControlProvider` — integración con Cerbos
- `auditLogProvider` — logging automático de cambios
- `liveProvider` — Realtime via WebSockets

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

### Supabase (self-hosted)

Supabase te da **5 servicios en 1**:

| Servicio | Reemplaza a... | Ventaja |
|---|---|---|
| **PostgreSQL** | Firebase Firestore / MongoDB | SQL real, relaciones, transacciones, RLS |
| **GoTrue** (Auth) | Firebase Auth / Auth0 | Google OAuth, magic links, MFA |
| **PostgREST** (API) | Express/Fastify custom API | API REST automática desde tus tablas, zero código |
| **Realtime** | Socket.io / Pusher | WebSockets nativos conectados a Postgres |
| **Storage** | Firebase Storage / S3 | Archivos con policies de acceso |

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
- Las policies son YAML, no código — un no-programador las puede leer
- Versionadas en Git — historial completo de cambios de permisos
- Hot-reload — cambiar un YAML actualiza los permisos sin redeploy
- Testeable — `cerbos compile` valida las policies antes del deploy

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
        reverse_proxy supabase-kong:8000
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
| **Optimistic mutations** | Rompen el audit log (el "antes" se sobreescribe antes de que el server responda). Usá pessimistic mode. |
