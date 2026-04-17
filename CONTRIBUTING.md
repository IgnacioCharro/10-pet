# Contribuir a 10_Pet

> Estado: proyecto en fase MVP (pre-launch). Colaboraciones abiertas solo por invitación del founder.

## Requisitos

- Node.js 20 LTS (ver `.nvmrc`)
- pnpm 9+
- Una cuenta de Supabase (PostgreSQL + PostGIS) y Upstash (Redis) — credenciales en `.env`

## Setup

```bash
pnpm install
cp .env.example .env
# completar .env con credenciales propias
pnpm --filter api migrate       # (cuando existan migrations)
pnpm dev                        # api + web en paralelo
```

## Flujo de trabajo

1. **Branch**: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`, `refactor/<slug>`, `test/<slug>`.
   No trabajar directo en `main`.
2. **Commits**: [Conventional Commits](https://www.conventionalcommits.org/).
   Ejemplos:
   - `feat(auth): OAuth Google con Passport`
   - `fix(cases): ST_DWithin no aplicaba el radius en metros`
   - `chore: bump @types/node 20.11`
3. **Antes del push**: `pnpm lint && pnpm typecheck && pnpm test` deben pasar.
4. **Pull Request**: usar el template. Squash-merge.
5. **Code review**: 1 aprobación mínima de un maintainer (para colaboradores externos).

## Alcance

- Todo cambio debe caber en el alcance del MVP (ver `Home/PLAN_ULTRA.md §7`).
- **No tocar `apps/api/src/modules/community/`** — está reservado para v1.5.
- Refactors "por elegancia" sin impacto funcional se rechazan.
- Dependencias nuevas requieren justificación (preferir lo listado en `§12` del plan).

## Convenciones de código

- **TypeScript strict**. Sin `any` implícitos.
- **Archivos**: `kebab-case.ts` para módulos, `PascalCase.tsx` para componentes.
- **DB**: `snake_case` en tablas/columnas; Sequelize mapea a `camelCase` en TS.
- **Validación**: Zod en todos los endpoints (body, query, params).
- **Errores de API**: formato estándar `{ error: { code, message, fields? } }` (ver `§15.3`).
- **Tests**: unit + integration para endpoints nuevos. Vitest para ambos workspaces.
- **Imports**: absolutos desde el root del workspace cuando tengamos paths configurados.
- **Sin emojis** en código, commits ni docs.
- **Sin secrets** en commits. Si expusiste uno, rotarlo inmediatamente.

## Estructura del monorepo

Ver `Home/PLAN_ULTRA.md §16`. Resumen:

```
apps/api/            backend Express + TS
apps/web/            frontend React + Vite
packages/shared/     tipos + schemas Zod compartidos
Home/                docs (PLAN_ULTRA.md es el doc maestro)
```

## Reportar bugs / proponer features

- Bug → issue con template `bug` (`.github/ISSUE_TEMPLATE/bug.yml`).
- Feature → issue con template `feature`; validar que caiga dentro del MVP.
- Tarea de roadmap → template `task`, referenciando la semana.

## Seguridad

Vulnerabilidades: ver `SECURITY.md` — **no** abrir issue público.
