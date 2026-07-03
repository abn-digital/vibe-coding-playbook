# 🛡️ Seguridad de Base de Datos

> PostgreSQL + RLS es tu última línea de defensa. Si esto falla, todo falla.

---

## Reglas fundamentales

### 1. RLS en TODAS las tablas

```sql
-- SIEMPRE después de CREATE TABLE:
ALTER TABLE mi_tabla ENABLE ROW LEVEL SECURITY;
```

Sin esto, cualquier usuario autenticado ve todas las filas. **No hay excepción.**

### 2. USING + WITH CHECK en policies de escritura

```sql
-- ❌ MAL - solo USING
CREATE POLICY "tasks_write" ON tasks FOR ALL TO authenticated
    USING (tenant_id = private.get_my_tenant_id());
-- Un usuario podría insertar filas en OTRO tenant

-- ✅ BIEN - USING + WITH CHECK
CREATE POLICY "tasks_write" ON tasks FOR ALL TO authenticated
    USING (tenant_id = private.get_my_tenant_id())
    WITH CHECK (tenant_id = private.get_my_tenant_id());
-- INSERT y UPDATE también validan el tenant
```

### 3. SECURITY DEFINER functions en schema privado

```sql
-- Las funciones que bypassean RLS (como get_my_tenant_id)
-- deben vivir en un schema que PostgREST NO exponga

CREATE SCHEMA IF NOT EXISTS private;

CREATE FUNCTION private.get_my_tenant_id() RETURNS UUID AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PostgREST solo expone schemas en PGRST_DB_SCHEMAS
-- private NO está ahí → no es callable via /rest/v1/rpc/
```

> **¿Por qué?** Una función SECURITY DEFINER en el schema `public` es callable via `POST /rest/v1/rpc/get_my_tenant_id`. Si tiene lógica sensible, un atacante puede llamarla directamente.

### 4. Nunca confíes en `app_metadata` del JWT

```sql
-- ❌ MAL - Google OAuth sobreescribe app_metadata
CREATE POLICY "by_role" ON tasks FOR ALL TO authenticated
    USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- ✅ BIEN - lee de la tabla profiles
CREATE POLICY "by_role" ON tasks FOR ALL TO authenticated
    USING (private.get_my_role() = 'admin');
```

---

## Checklist de Seguridad de la DB (Supabase)

Basado en el security checklist oficial de Supabase:

| # | Check | Estado esperado |
|---|---|---|
| 1 | Cada tabla tiene `ENABLE ROW LEVEL SECURITY` | ✅ |
| 2 | Policies de UPDATE tienen `USING` + `WITH CHECK` | ✅ |
| 3 | No hay policies con `USING (true)` en tablas con datos sensibles | ✅ |
| 4 | `service_role` key no está en el frontend | ✅ |
| 5 | No se usa `app_metadata` / `user_metadata` para authz | ✅ |
| 6 | No hay views en `public` (bypassean RLS) | ✅ |
| 7 | SECURITY DEFINER functions no están en schemas expuestos | ✅ |
| 8 | Un trigger previene self-promotion en `profiles` | ✅ |
| 9 | Storage buckets tienen policies de SELECT, INSERT, UPDATE, DELETE | ✅ |
| 10 | Las policies usan `TO authenticated` (no `auth.role()` deprecado) | ✅ |
| 11 | El lockfile de dependencias está committed | ✅ |
| 12 | Las migraciones usan `ON_ERROR_STOP=1` | ✅ |

---

## Migraciones: Buenas prácticas

### Naming convention

```
supabase/migrations/
├── 20260621000001_tenants_and_profiles.sql
├── 20260621000002_core_tables.sql
├── 20260621000003_secondary_tables.sql
└── ...
```

Formato: `YYYYMMDD_NNNNNN_descripcion.sql`

### Aplicar migraciones al container

```bash
# Copiar el archivo AL container (no pipe, que rompe encoding en Windows)
docker cp migration.sql container:/tmp/apply.sql

# Ejecutar con ON_ERROR_STOP
docker exec -e PGPASSWORD="$PW" -e PGCLIENTENCODING=UTF8 \
    container psql -U supabase_admin -d supabase \
    -v ON_ERROR_STOP=1 -f /tmp/apply.sql
```

> **¿Por qué `docker cp` en vez de pipe?** En Windows, piping (`< file.sql`) re-encoda UTF-8 al codepage de la consola, lo que corrompe texto con acentos (María → Mar??a).

### Idempotencia

```sql
-- ✅ Idempotente (se puede correr muchas veces)
CREATE TABLE IF NOT EXISTS ...;
CREATE INDEX IF NOT EXISTS ...;
DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP POLICY IF EXISTS "old_policy" ON table;
CREATE POLICY "new_policy" ON table ...;

-- ❌ No idempotente (falla si se corre 2 veces)
CREATE TABLE ...;  -- ERROR: already exists
ALTER TABLE ADD COLUMN ...;  -- ERROR: column already exists
```

---

## Audit Logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    resource TEXT NOT NULL,        -- "tasks"
    action TEXT NOT NULL,          -- "create", "update", "delete"
    record_id TEXT,                -- ID del registro afectado
    user_id UUID,                  -- Quién hizo el cambio
    data JSONB,                    -- { before: {...}, after: {...} }
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Pessimistic mutations (para audit logs correctos)

```tsx
// El problema con optimistic mutations:
// 1. Usuario clickea "Guardar"
// 2. Refine INMEDIATAMENTE actualiza el cache local (optimistic)
// 3. Refine envía la request al server
// 4. El audit log lee el cache para "before" → pero ya fue sobreescrito
// Resultado: before === after → el log es inútil

// Solución: pessimistic mode (default en Refine v5)
// 1. Usuario clickea "Guardar"
// 2. Refine envía la request al server
// 3. Server responde OK
// 4. Refine actualiza el cache
// Resultado: before se lee ANTES de que el cache cambie ✅
```

> **Regla:** Nunca uses `mutationMode: "optimistic"`. El default pessimistic es correcto.
