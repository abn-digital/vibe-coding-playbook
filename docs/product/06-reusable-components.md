# 🧩 Componentes Reutilizables

> Dos componentes bien hechos reemplazan miles de líneas de código repetido.

---

## La filosofía: Configuración > Código

En una plataforma con 19+ módulos CRUD, el 80% del código es igual: listar datos en tabla, crear con formulario, editar, borrar. Si escribís cada uno a mano, tenés 19 implementaciones distintas que mantener.

**Solución:** Dos meta-componentes que aceptan configuración:

| Componente | Qué hace | Input |
|---|---|---|
| `<DataTable>` | Lista con paginación, filtros, búsqueda, acciones | Columnas + resource name |
| `<CrudForm>` | Formulario de creación/edición | Schema de campos + resource name |

---

## `<DataTable>`: Lista universal

### Uso mínimo

```tsx
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { Task } from "@/types";  // re-export de tasks.$inferSelect en schema.ts

const columns: ColumnDef<Task>[] = [
    { accessorKey: "title", header: "Título" },
    { accessorKey: "status", header: "Estado",
      cell: ({ row }) => <StatusBadge domain="genericStatus" value={row.original.status} /> },
    { accessorKey: "assigned_to", header: "Asignado",
      cell: ({ row }) => <UserAvatar userId={row.original.assigned_to} /> },
];

export function TaskList() {
    return (
        <DataTable<Task>
            resource="tasks"
            title="Tareas"
            columns={columns}
            initialSorter={[{ field: "created_at", order: "desc" }]}
            searchable
            searchField="title"
            createButton
            rowActions={{ show: true, edit: true, delete: true }}
        />
    );
}
```

### Features incluidas automáticamente

- ✅ Paginación server-side
- ✅ Sorting por columna
- ✅ Búsqueda por texto
- ✅ Filtros por columna (select, text)
- ✅ Acciones por fila (ver, editar, borrar)
- ✅ Botón de crear
- ✅ Confirmación de borrado
- ✅ Loading states
- ✅ Empty state
- ✅ Responsive

---

## `<CrudForm>`: Formulario universal

### Schema de campos

```tsx
// features/tasks/fields.ts
import type { CrudField } from "@/components/crud-form";

export const taskFields: CrudField[] = [
    { name: "title", label: "Título", type: "text", required: true },
    { name: "description", label: "Descripción", type: "textarea" },
    { name: "status", label: "Estado", type: "select",
      options: [
          { value: "pending", label: "Pendiente" },
          { value: "in_progress", label: "En progreso" },
          { value: "done", label: "Completada" },
      ]},
    { name: "priority", label: "Prioridad", type: "select",
      options: [
          { value: "low", label: "Baja" },
          { value: "medium", label: "Media" },
          { value: "high", label: "Alta" },
      ]},
    { name: "assigned_to", label: "Asignado a", type: "user" },
    { name: "due_date", label: "Fecha límite", type: "date" },
    { name: "tags", label: "Etiquetas", type: "tags" },
    { name: "is_urgent", label: "Urgente", type: "switch" },
];
```

### Create page

```tsx
// features/tasks/create.tsx
import { CrudForm } from "@/components/crud-form";
import { taskFields } from "./fields";

export function TaskCreate() {
    return <CrudForm resource="tasks" action="create" fields={taskFields} />;
}
```

### Edit page

```tsx
// features/tasks/edit.tsx
import { CrudForm } from "@/components/crud-form";
import { taskFields } from "./fields";

export function TaskEdit() {
    return <CrudForm resource="tasks" action="edit" fields={taskFields} />;
}
```

### Features incluidas automáticamente

- ✅ Validación
- ✅ Loading states
- ✅ Error handling
- ✅ Auto-inject `tenant_id` y `created_by` en create
- ✅ Audit log (before/after values)
- ✅ Redirect a lista después de guardar
- ✅ Soporte para i18n

---

## Tipos de campo disponibles

| Type | Renderiza | Valor |
|---|---|---|
| `text` | Input de texto | `string` |
| `textarea` | Textarea | `string` |
| `number` | Input numérico | `number` |
| `date` | Date picker | `string` (ISO) |
| `datetime` | DateTime picker | `string` (ISO) |
| `select` | Dropdown | `string` |
| `tags` | Tag input | `string[]` |
| `switch` | Toggle | `boolean` |
| `user` | User picker (UUID) | `string` (UUID) |
| `account` | Account picker | `string` (UUID) |
| `hidden` | No visible | cualquiera |

---

## Componentes de soporte

| Componente | Qué hace |
|---|---|
| `<StatusBadge>` | Chip coloreado por estado/prioridad/severidad |
| `<UserAvatar>` | Resuelve UUID → nombre + avatar (batched) |
| `<ConfirmDialog>` | Modal de confirmación para acciones destructivas |
| `<EmptyState>` | Placeholder cuando no hay datos |
| `<TagsInput>` | Input de tags (`string[]`) |

---

## Agregar un módulo nuevo (checklist)

1. **DB:** Tabla en `backend/src/db/schema.ts` + migración Drizzle + RLS SQL en `backend/drizzle/`
2. **API:** Sub-router Hono en `backend/src/routes/{module}.ts`, montar en `src/app.ts`
3. **Types:** exportar `$inferSelect` / `$inferInsert` desde schema (o re-export en `src/types/`)
4. **Fields:** `src/features/{module}/fields.ts` (schema de campos)
5. **List:** `src/features/{module}/list.tsx` (DataTable + columnas)
6. **Create:** `src/features/{module}/create.tsx` (CrudForm)
7. **Edit:** `src/features/{module}/edit.tsx` (CrudForm)
8. **Resource:** Agregar a `src/config/resources.ts`
9. **Routes:** Agregar a `src/App.tsx`
10. **Icon:** Agregar a `ICON_MAP` en sidebar

> **Tiempo estimado:** 30 minutos para un módulo CRUD completo.
