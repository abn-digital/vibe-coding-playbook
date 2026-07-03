# 🏢 Arquitectura Multi-Tenant

> Cómo servir múltiples organizaciones desde una sola app sin que se vean los datos entre sí.

---

## ¿Qué es Multi-Tenancy?

Un **tenant** = una organización/empresa/cliente. Multi-tenancy = una sola instancia de tu app sirve a muchos tenants, cada uno aislado de los demás.

## Modelos de Aislamiento

| Modelo | Cómo funciona | Pros | Contras |
|---|---|---|---|
| **DB por tenant** | Cada tenant tiene su propia base de datos | Aislamiento total | Caro, difícil de mantener (N migraciones) |
| **Schema por tenant** | Una DB, un schema por tenant | Buen aislamiento | Migraciones complicadas |
| **Fila por tenant** ✅ | Una DB, un schema, columna `tenant_id` en cada tabla | Simple, una sola migración | Necesitás RLS robusto |

> **Recomendación:** Usá **fila por tenant** con RLS. Es el modelo más simple y escala bien hasta cientos de tenants.

---

## Implementación

### 1. Columna `tenant_id` en cada tabla

Drizzle schema (`backend/src/db/schema.ts`):

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

SQL equivalente (generado por `drizzle-kit migrate`):

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

> **Regla:** NUNCA crees una tabla sin `tenant_id` (salvo tablas de lookup globales).

### 2. RLS que filtra por tenant automáticamente

```sql
-- Función helper (SECURITY DEFINER = corre como superuser)
CREATE FUNCTION private.get_my_tenant_id() 
RETURNS UUID AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policy: solo ves filas de tu tenant
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_tenant_isolation" ON tasks
    FOR ALL
    TO authenticated
    USING (tenant_id = private.get_my_tenant_id())
    WITH CHECK (tenant_id = private.get_my_tenant_id());
```

### 3. Resolución de tenant por dominio

```
app.abndigital.com.ar    → tenant "abn"
app.calmessimple.com.ar  → tenant "calm"
slug.portal.miapp.com    → tenant por slug
localhost                → fallback a tenant default (dev)
```

```tsx
// TenantProvider resuelve el tenant al cargar la app
const hostname = window.location.hostname;
const tenant = tenants.find(t => t.domain === hostname);
```

### 4. Mapeo email → tenant (auto-provisioning)

```sql
-- Tabla de mapeo
CREATE TABLE tenant_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_domain TEXT NOT NULL UNIQUE,     -- "abndigital.com.ar"
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    default_role TEXT NOT NULL DEFAULT 'analyst'
);

-- Trigger en auth.users que auto-asigna tenant al registrarse
CREATE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE
    domain TEXT;
    mapping RECORD;
BEGIN
    domain := split_part(NEW.email, '@', 2);
    SELECT * INTO mapping FROM tenant_domains WHERE email_domain = domain;
    
    IF mapping IS NOT NULL THEN
        INSERT INTO profiles (id, tenant_id, role, email)
        VALUES (NEW.id, mapping.tenant_id, mapping.default_role, NEW.email);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> **Ventaja:** Agregar un nuevo cliente = insertar 2 filas (`tenants` + `tenant_domains`). No hay que tocar código ni hacer deploy.

---

## Errores comunes

| Error | Consecuencia | Solución |
|---|---|---|
| Olvidar `tenant_id` en una tabla | Datos visibles para todos | **Checklist pre-merge**: cada tabla nueva tiene `tenant_id` + RLS |
| Usar `USING (true)` en RLS | Cross-tenant data leak | Siempre filtrar por `get_my_tenant_id()` |
| Resolver tenant desde el JWT | Stale data después de cambio de tenant | Resolver desde la DB (`profiles`) en cada request |
| Hardcodear tenants en env vars | Deploy por cada cliente nuevo | Tabla `tenant_domains` en la DB |

---

## Theming per-tenant

```sql
CREATE TABLE tenant_themes (
    tenant_id UUID REFERENCES tenants(id),
    mode TEXT CHECK (mode IN ('light', 'dark')),
    accent_color TEXT DEFAULT '#E53528',
    sidebar_bg TEXT DEFAULT '#0d0d0d',
    logo_url TEXT,
    UNIQUE (tenant_id, mode)
);
```

El `TenantProvider` aplica los CSS custom properties del tenant al cargar:

```tsx
document.documentElement.style.setProperty('--abn-accent', theme.accent_color);
document.documentElement.style.setProperty('--abn-sidebar-bg', theme.sidebar_bg);
```

> **Resultado:** Cada cliente ve la app con sus colores y logo, sin código custom.
