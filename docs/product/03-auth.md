# 🔐 Autenticación y Autorización

> Auth**N** = quién sos. Auth**Z** = qué podés hacer. Son problemas distintos, resolvelos por separado.

---

## Autenticación (AuthN)

### Recomendación: OAuth SSO + Magic Links

| Método | Cuándo usarlo |
|---|---|
| **Google OAuth SSO** | Apps corporativas - todos usan Google Workspace |
| **Microsoft OAuth** | Empresas con Office 365 |
| **Magic Links** | Usuarios sin cuenta corporativa de Google/Microsoft |
| **Email + Password** | Evitalo - el usuario tiene que inventar y recordar una contraseña |

### Implementación con Supabase GoTrue

```tsx
// Login con Google (1 línea)
await supabase.auth.signInWithOAuth({ provider: 'google' });

// Magic link
await supabase.auth.signInWithOtp({ email: 'user@example.com' });
```

### Reglas de auth

1. **No restringas por dominio en el OAuth** - cualquier email puede autenticarse. El tenant/rol se asigna después por la tabla `tenant_domains`.
2. **Auto-provisioning** - un trigger en `auth.users` crea el perfil automáticamente al registrarse.
3. **El JWT no es source of truth para roles** - Google OAuth sobreescribe `app_metadata`. Leé siempre el rol desde la tabla `profiles`.

---

## Autorización (AuthZ)

### Las 3 Capas (esto es lo más importante de todo el playbook)

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 1: UI GATING (Client-side)                        │
│                                                         │
│  Motor: Cerbos via HTTP desde el browser                │
│  Qué hace: Oculta botones, menús y páginas              │
│  ¿Seguro?: ❌ NO - es bypassable                       │
│  Propósito: UX (no mostrar opciones que no podés usar)  │
├─────────────────────────────────────────────────────────┤
│  CAPA 2: ROW LEVEL SECURITY (Server-side)               │
│                                                         │
│  Motor: PostgreSQL RLS                                  │
│  Qué hace: Filtra datos a nivel de fila                 │
│  ¿Seguro?: ✅ SÍ - no bypassable                      │
│  Propósito: Seguridad REAL de datos                     │
├─────────────────────────────────────────────────────────┤
│  CAPA 3: SERVER GATE (Server-side)                      │
│                                                         │
│  Motor: Cerbos en rutas Hono del backend                │
│  Qué hace: Autoriza requests que NO pasan por Postgres  │
│  ¿Seguro?: ✅ SÍ - server-side                        │
│  Propósito: Proteger llamadas a servicios internos      │
│             (analytics, workers) en la misma VM           │
└─────────────────────────────────────────────────────────┘
```

> **La regla de oro:** Si un check protege **datos**, DEBE ser **server-side** (RLS o edge gate). El frontend es solo cosmético.

---

## Cerbos: Políticas YAML

### Estructura de una política

```yaml
# cerbos/policies/tasks.yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "tasks"
  rules:
    # Admin y Director pueden todo
    - actions: ["*"]
      effect: EFFECT_ALLOW
      roles: ["admin", "director"]
    
    # Team leads pueden CRUD + delete
    - actions: ["read", "create", "update", "delete"]
      effect: EFFECT_ALLOW
      roles: ["tl"]
    
    # Analysts pueden CRUD pero NO delete
    - actions: ["read", "create", "update"]
      effect: EFFECT_ALLOW
      roles: ["analyst", "manager", "martech"]
    
    # Clientes solo leen
    - actions: ["read"]
      effect: EFFECT_ALLOW
      roles: ["client"]
```

### Patrón: Política catch-all (default)

```yaml
# cerbos/policies/default.yaml
# Para módulos que no necesitan permisos especiales
resourcePolicy:
  version: "default"
  resource: "default"
  rules:
    - actions: ["read"]
      effect: EFFECT_ALLOW
      roles: ["admin", "director", "tl", "manager", "analyst", "martech", "client"]
    - actions: ["create", "update"]
      effect: EFFECT_ALLOW
      roles: ["admin", "director", "tl", "manager", "analyst", "martech"]
    - actions: ["delete"]
      effect: EFFECT_ALLOW
      roles: ["admin", "director", "tl"]
```

> **Tip:** Sin un `default.yaml`, cualquier módulo sin política dedicada queda **denegado** silenciosamente (Cerbos default-deny). El sidebar no lo muestra y nadie sabe por qué.

### Integración con Refine

```tsx
// access-control-provider.ts
const accessControlProvider = {
    can: async ({ resource, action }) => {
        const cerbosAction = action === 'list' || action === 'show' ? 'read'
                           : action === 'edit' ? 'update' 
                           : action;
        
        const result = await cerbos.checkResource({
            principal: { id: user.id, roles: [profile.role] },
            resource: { kind: getKind(resource), id: '*' },
            actions: [cerbosAction],
        });
        
        return { can: result.isAllowed(cerbosAction) };
    }
};
```

---

## RLS: Patrones de Seguridad

### Patrón 1: Aislamiento por tenant (el más común)

```sql
CREATE POLICY "tenant_isolation" ON tasks
    FOR ALL TO authenticated
    USING (tenant_id = private.get_my_tenant_id())
    WITH CHECK (tenant_id = private.get_my_tenant_id());
```

### Patrón 2: Solo lectura para ciertos roles

```sql
-- Todos leen, solo admin escribe
CREATE POLICY "alerts_read" ON alerts
    FOR SELECT TO authenticated
    USING (tenant_id = private.get_my_tenant_id());

CREATE POLICY "alerts_write" ON alerts
    FOR ALL TO authenticated
    USING (tenant_id = private.get_my_tenant_id() 
           AND private.get_my_role() = 'admin')
    WITH CHECK (tenant_id = private.get_my_tenant_id() 
                AND private.get_my_role() = 'admin');
```

### Patrón 3: Prevenir self-promotion

```sql
-- Trigger que impide que un usuario cambie su propio rol
CREATE FUNCTION guard_profile_changes() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role 
       OR OLD.tenant_id IS DISTINCT FROM NEW.tenant_id
       OR OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin THEN
        
        IF NOT (private.get_my_role() IN ('admin', 'director')) THEN
            RAISE EXCEPTION 'Solo admin/director pueden cambiar roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guard_profile_changes
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION guard_profile_changes();
```

---

## Server Gate: Proteger rutas que no pasan por Postgres

Cuando tu app llama a un **servicio interno** (analytics container, worker, export job) esa request **no pasa por PostgreSQL**, así que RLS no te protege. Necesitás un gate en el backend Hono:

```typescript
// backend/src/middleware/authorizeAnalytics.ts
export async function authorizeAnalytics(c: Context, next: Next) {
    // 1. JWT ya verificado por middleware upstream
    const userId = c.get("userId");

    // 2. Leer rol desde profiles (NO del JWT)
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, userId),
    });
    if (!profile) return c.json({ error: "No profile" }, 403);

    // 3. Chequear con Cerbos
    const allowed = await cerbos.isAllowed({
        principal: { id: profile.id, roles: [profile.role] },
        resource: { kind: "analytics" },
        action: "read",
    });
    if (!allowed) return c.json({ error: "Forbidden" }, 403);

    await next();
}
```

La ruta Hono proxy-ea al container interno (`http://analytics:4000`) - nunca a un SaaS externo.

---

## Checklist de Seguridad Auth

- [ ] El `service_role` key NUNCA llega al browser (solo server-side)
- [ ] Las SECURITY DEFINER functions viven en un schema `private` (no expuesto por PostgREST)
- [ ] Cada tabla tiene RLS activado (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`)
- [ ] Las policies de UPDATE tienen BOTH `USING` AND `WITH CHECK`
- [ ] No se usa `app_metadata` del JWT para determinar roles (Google lo sobreescribe)
- [ ] Un trigger impide self-promotion (cambiar el propio rol/tenant)
- [ ] El access control provider falla **closed** en producción (si Cerbos cae, se deniega todo)
- [ ] Las credenciales de servicios internos solo viven en el backend (env vars de Docker), nunca en el frontend
