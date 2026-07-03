# 🚨 Checklist Pre-Producción

> Antes de que un usuario real toque tu app, pasá por cada uno de estos puntos.

---

## Seguridad

### Base de datos
- [ ] **RLS activado** en TODAS las tablas (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`)
- [ ] **Policies de escritura** tienen `USING` + `WITH CHECK`
- [ ] **No hay `USING (true)`** en tablas con datos sensibles
- [ ] **SECURITY DEFINER functions** están en schema `private` (no expuesto por PostgREST)
- [ ] **Trigger anti self-promotion** en la tabla `profiles` (previene cambio de rol/tenant propio)
- [ ] **Storage buckets** tienen policies de SELECT, INSERT, UPDATE, DELETE

### Autenticación
- [ ] **`service_role` key** solo existe en el servidor (env vars de Docker/edge functions)
- [ ] **`service_role` key** NO está en ninguna variable `VITE_*`
- [ ] **Roles se leen de `profiles`** (DB), no de `app_metadata` (JWT)
- [ ] **Deep-links no autenticados** redirigen a `/login` (no pantalla blanca)
- [ ] **Session refresh** funciona (el token se renueva antes de expirar)

### Autorización
- [ ] **Cerbos PDP** falla **closed** en producción (si cae, se deniega todo)
- [ ] **Catch-all policy** (`default.yaml`) existe para módulos sin policy dedicada
- [ ] **Edge functions** verifican JWT + rol + Cerbos antes de proxy-ar a APIs externas
- [ ] **Credenciales de APIs externas** (Cube, Slack, etc.) solo en edge functions, nunca en el frontend

### Infraestructura
- [ ] **HTTPS** habilitado en todos los dominios (Caddy lo hace automático)
- [ ] **CORS** configurado correctamente en Kong/Caddy
- [ ] **Lockfile** (`pnpm-lock.yaml` / `package-lock.json`) committed en git
- [ ] **`.env`** está en `.gitignore` (NUNCA committed)
- [ ] **`.env.example`** committed con placeholders

---

## Funcionalidad

### Datos
- [ ] **Migraciones Drizzle** aplicadas (`pnpm --filter backend run db:migrate`)
- [ ] **RLS policies** en migraciones SQL custom bajo `backend/drizzle/`
- [ ] **Seed data** cargado (tenants, domains, themes)
- [ ] **Tipos TypeScript** al día con el schema Drizzle (`export type Task = typeof tasks.$inferSelect`)
- [ ] **Realtime** funciona (WebSocket se conecta, cambios se propagan)

### UI
- [ ] **Login** funciona (Google OAuth redirige y vuelve correctamente)
- [ ] **Sidebar** muestra solo los módulos autorizados para el rol
- [ ] **CRUD completo** funciona en al menos un módulo (crear, editar, listar, borrar)
- [ ] **i18n** - no hay keys raw visibles (`common.title` en vez de "Título")
- [ ] **Empty states** - las listas vacías muestran un placeholder, no blanco
- [ ] **Error states** - las requests fallidas muestran un toast, no fallan silenciosamente

### Multi-tenancy
- [ ] **Aislamiento** - un usuario de tenant A NO ve datos de tenant B
- [ ] **Theming** - cada tenant ve sus colores y logo
- [ ] **Resolución de dominio** - `localhost` resuelve al tenant default

---

## Performance

- [ ] **Bundle splitting** configurado (vendor chunks separados)
- [ ] **`npm run build`** termina sin errores ni warnings
- [ ] **Imágenes** optimizadas (no se sirven PNGs de 5MB)
- [ ] **Lazy loading** en rutas (cada feature se carga on-demand)

---

## Operaciones

### Monitoring
- [ ] **Docker healthchecks** configurados en los servicios críticos (DB, Kong)
- [ ] **Logs** accesibles (`docker compose logs -f`)
- [ ] **Restart policy** configurada (`restart: unless-stopped`)

### Backup
- [ ] **Volúmenes de DB** tienen backup periódico
- [ ] **Storage (GCS/S3)** tiene versionado habilitado
- [ ] **Secrets** documentados en un lugar seguro (no en un .txt en el Desktop)

### CI/CD
- [ ] **GitHub Actions** configurado (lint + build + deploy en merge a master)
- [ ] **Preview deploys** en PRs (cada PR tiene su URL)
- [ ] **Secrets de CI** configurados en GitHub (Firebase SA, etc.)

---

## Testing

- [ ] **Cypress E2E** - flujo de login funciona
- [ ] **Cypress E2E** - CRUD completo en al menos un módulo
- [ ] **Cypress E2E** - usuario con rol `client` no ve opciones de admin
- [ ] **`cerbos compile`** - policies sin errores de sintaxis
- [ ] **`tsc --noEmit`** - sin errores de tipos
- [ ] **`npm run lint`** - sin errores de linting

---

## Documentación

- [ ] **README.md** con instrucciones de setup (Quick Start)
- [ ] **`.env.example`** con todas las variables documentadas
- [ ] **AGENTS.md** (si usás AI agents para desarrollo)
- [ ] **Docs de arquitectura** (DB schema, access control, etc.)

---

## Después del deploy

- [ ] **Smoke test** - abrí la URL de producción, logueate, navegá los módulos
- [ ] **Verificar HTTPS** - el candado verde está en el browser
- [ ] **Verificar healthchecks** - `docker compose ps` muestra todos los servicios healthy
- [ ] **Verificar logs** - no hay errores rojos en `docker compose logs`
- [ ] **Probar desde otro browser/incógnito** - para descartar cache local

---

> **La regla final:** Si no podés marcar todos estos ✅, no estás listo para producción. Volvé a este checklist cada vez que hagas un cambio significativo.
