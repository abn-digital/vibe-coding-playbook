# 🏗️ Production Web App Playbook

> Guía opinionada para construir aplicaciones web **production-grade** — basada en las lecciones aprendidas construyendo plataformas internas reales.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ¿Para qué sirve esto?

Cuando querés pasar de un **prototipo** a una **app productiva**, hay un salto enorme. Este playbook documenta las decisiones arquitectónicas, patrones de seguridad y buenas prácticas que aprendimos haciéndolo.

**No es un tutorial paso a paso.** Es un checklist de decisiones que tenés que tomar y las respuestas que nos funcionaron.

---

## 📋 Índice

| Documento | Cuándo leerlo |
|---|---|
| [**Stack Tecnológico**](docs/01-stack.md) | Al arrancar un proyecto nuevo |
| [**Arquitectura Multi-Tenant**](docs/02-multi-tenancy.md) | Si tu app va a servir múltiples organizaciones |
| [**Autenticación y Autorización**](docs/03-auth.md) | Siempre — es lo primero que tenés que definir |
| [**Seguridad de Base de Datos**](docs/04-database-security.md) | Antes de escribir la primera migración |
| [**Infraestructura y Deploy**](docs/05-infrastructure.md) | Cuando estés listo para ir a producción |
| [**Componentes Reutilizables**](docs/06-reusable-components.md) | Cuando vayas a construir módulos CRUD |
| [**Testing y CI/CD**](docs/07-testing-cicd.md) | Antes del primer deploy a producción |
| [**Checklist Pre-Producción**](docs/08-pre-production-checklist.md) | 🚨 Antes de salir a producción |

---

## 🎯 Principios

### 1. La seguridad se impone en el servidor, nunca en el cliente
El frontend puede ocultar botones, pero la protección real de datos vive en **Row Level Security** (Postgres) y en el **edge** (funciones serverless). Si alguien bypassea tu UI, igual no puede tocar datos que no le corresponden.

### 2. Una sola base de código, múltiples clientes
Multi-tenancy con aislamiento por `tenant_id` + RLS. Un solo deploy sirve a todos los clientes. Agregar un cliente nuevo es insertar una fila en la base de datos, no hacer un deploy nuevo.

### 3. Componentes reutilizables > código custom
Dos componentes bien hechos (`<DataTable>` + `<CrudForm>`) reemplazan miles de líneas de código repetido. Un módulo nuevo debería ser configuración, no código.

### 4. Todo lo que se pueda romper, se testea
Cypress E2E para los flujos críticos. CI que corre en cada push. Si no tiene tests, no está terminado.

### 5. Todo queda registrado
Audit logs para cada cambio. Quién cambió qué, cuándo, y el estado anterior. Con capacidad de revertir.

---

## 🛠️ Stack Recomendado (Resumen)

| Capa | Tecnología | Por qué |
|---|---|---|
| **Frontend** | React + Vite + TypeScript | Ecosistema maduro, tipado fuerte, builds rápidos |
| **Framework CRUD** | Refine v5 | Hooks para data, auth y permisos out of the box |
| **UI Components** | shadcn/ui + Tailwind CSS | Componentes accesibles, customizables, copy-paste |
| **Backend/DB** | Supabase (PostgreSQL + Auth + API + Realtime + Storage) | Todo-en-uno, open source, self-hosteable |
| **Autorización** | Cerbos | RBAC con policies YAML versionadas en Git |
| **Infraestructura** | Docker Compose + Caddy | Un comando levanta todo, HTTPS automático |
| **Testing** | Cypress E2E | Tests reales contra la app real |
| **CI/CD** | GitHub Actions | Integración nativa con el repo |

---

## 🚀 Quick Start

```bash
# Cloná este repo
git clone https://github.com/DARTSTEAM/production-playbook.git

# Leé los docs en orden
open docs/01-stack.md
```

---

## 🤝 Contribuir

Este es un documento vivo. Si encontraste un patrón que funciona o una lección que aprendiste por las malas, abrí un PR.

---

## 📝 Licencia

MIT — usalo como quieras.
