# 🧪 Testing y CI/CD

> Si no tiene tests, no está terminado. Si no tiene CI, no es profesional.

---

## Estrategia de Testing

| Tipo | Herramienta | Qué testea | Cuándo corre |
|---|---|---|---|
| **E2E** | Cypress | Flujos completos contra la app real | CI + local |
| **Policy validation** | `cerbos compile` | Que las policies YAML son válidas | CI + pre-commit |
| **Type checking** | `tsc --noEmit` | Que el código compila sin errores | CI + pre-commit |
| **Linting** | ESLint | Estilo de código consistente | CI + pre-commit |

> **¿Por qué no unit tests?** Los hooks de Refine y los componentes de shadcn ya están testeados upstream. Nuestro valor está en los flujos E2E - que el usuario pueda loguearse, crear una tarea, y verla en la lista.

---

## Cypress E2E

### Login programático (no pases por Google OAuth en tests)

```tsx
// cypress/support/commands.ts
Cypress.Commands.add('loginAs', (role: string) => {
    // 1. Crear usuario efímero con service_role (server-side)
    const email = `${role}.e2e.test@example.com`;
    
    // 2. Obtener session via password grant
    cy.request({
        method: 'POST',
        url: `${Cypress.env('SUPABASE_URL')}/auth/v1/token?grant_type=password`,
        headers: { apikey: Cypress.env('ANON_KEY') },
        body: { email, password: 'test-password' },
    }).then(({ body }) => {
        // 3. Inyectar session en localStorage
        window.localStorage.setItem('abn-suite-auth', JSON.stringify({
            access_token: body.access_token,
            refresh_token: body.refresh_token,
        }));
    });
});

// En un test:
cy.loginAs('admin');
cy.visit('/tasks');
```

> **¿Por qué no pasar por la UI de Google?** OAuth requiere interacción con popups de Google que Cypress no puede controlar de forma confiable. El login programático es instantáneo y determinístico.

### Selectores: `data-cy` (no texto)

```tsx
// ❌ Frágil - el texto cambia con i18n
cy.contains('Crear tarea').click();

// ✅ Estable
cy.get('[data-cy="create-task-btn"]').click();
```

```tsx
// En el componente:
<Button data-cy="create-task-btn">
    {t('tasks.create')}
</Button>
```

### Estructura de specs

```
cypress/
├── e2e/
│   ├── auth.cy.ts           # Login, logout, redirect
│   ├── tasks.cy.ts           # CRUD de tareas
│   ├── rbac.cy.ts            # Permisos por rol
│   └── multi-tenancy.cy.ts   # Aislamiento de datos
├── support/
│   ├── commands.ts           # loginAs, seed, cleanup
│   └── e2e.ts                # Setup global
└── fixtures/
    └── task.json             # Datos de test
```

### Cleanup: usuarios efímeros

```tsx
// Después de cada test suite:
after(() => {
    // Borrar usuarios *.e2e.test con service_role
    cy.request({
        method: 'DELETE',
        url: `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        headers: { 
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
    });
});
```

> **Regla:** Cada test limpia lo que creó. No dejes usuarios/datos de test en la DB.

---

## CI Pipeline (GitHub Actions)

### Pipeline recomendado

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  test-policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          docker run --rm -v $PWD/cerbos/policies:/policies \
            ghcr.io/cerbos/cerbos:latest compile /policies

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test-policies]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build

  deploy:
    if: github.ref == 'refs/heads/master'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          firebaseServiceAccount: ${{ secrets.FIREBASE_SA }}
          channelId: live
```

### Qué corre en cada etapa

```
Push a master/PR:
  ├── lint-and-typecheck   (ESLint + TypeScript)
  ├── test-policies        (cerbos compile)
  └── build                (npm run build)
        └── deploy         (solo en merge a master)
```

---

## Pre-commit Checks (local)

```bash
# Antes de cada commit, corré:
npm run lint          # Estilo de código
npm run build         # Compila sin errores (incluye tsc)
npm run test:policies # Policies de Cerbos válidas
```

> **Tip:** Podés automatizar esto con `husky` + `lint-staged`, pero mantenerlo manual es más simple y menos propenso a problemas con hooks de Git.

---

## Bundle Splitting

Para apps grandes, splitear el vendor bundle mejora tiempos de carga:

```typescript
// vite.config.ts
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-refine': ['@refinedev/core', '@refinedev/supabase'],
                    'vendor-ui': ['@tanstack/react-table', 'recharts'],
                },
            },
        },
    },
});
```

> **Resultado:** El browser cachea los chunks de vendor (que cambian poco) y solo re-descarga tu código (que cambia seguido).
