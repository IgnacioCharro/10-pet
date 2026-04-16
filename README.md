# 10_Pet

Plataforma de rescate animal colaborativa para Argentina. Un mapa en vivo donde cualquier persona reporta animales en situación de calle, los voluntarios cercanos reciben aviso al instante, y cada caso tiene historial hasta resolverse.

> Estado: **pre-desarrollo** — Semana 0 (setup). Ver [PLAN_ULTRA.md](Home/PLAN_ULTRA.md) para el plan completo (estrategia, producto, arquitectura, roadmap 11 semanas).

---

## Stack

- **Backend**: Node.js 20 + TypeScript + Express + Sequelize
- **Base de datos**: PostgreSQL 15 + PostGIS (via Supabase)
- **Cache / queues**: Redis (via Upstash) + Bull
- **Frontend web**: React 18 + Vite + TypeScript + Tailwind + Leaflet/OSM
- **Mobile**: PWA en MVP; React Native en v1.1
- **Imágenes**: Cloudinary (signed uploads)
- **Email**: SendGrid
- **Push**: Firebase FCM
- **Hosting**: Railway (API) + Vercel (web)
- **Monorepo**: pnpm workspaces

## Estructura

```
10_Pet/
├── Home/                   docs del proyecto (PLAN_ULTRA.md)
├── apps/
│   ├── api/                backend Express + TS
│   └── web/                frontend React + Vite
├── packages/
│   └── shared/             tipos + schemas Zod compartidos
├── CLAUDE.md               instrucciones para el asistente Claude
├── package.json            workspace root
└── pnpm-workspace.yaml
```

## Requisitos

- Node.js >= 20
- pnpm >= 9
- Cuentas gratuitas: [Supabase](https://supabase.com), [Upstash](https://upstash.com), [Cloudinary](https://cloudinary.com), [SendGrid](https://sendgrid.com), [Firebase](https://firebase.google.com)

## Setup local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env
# editar .env con las credenciales reales de Supabase, Upstash, etc.

# 3. Correr migrations (cuando exista apps/api)
pnpm --filter api migrate

# 4. Dev mode (api + web en paralelo)
pnpm dev
```

## Scripts raíz

| Comando | Acción |
|---------|--------|
| `pnpm dev` | Corre todos los workspaces en modo dev |
| `pnpm build` | Build de todos los workspaces |
| `pnpm test` | Tests de todos los workspaces |
| `pnpm lint` | Lint de todos los workspaces |
| `pnpm typecheck` | Typecheck de todos los workspaces |

## Convenciones

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
- **Branches**: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
- **Archivos TS**: `kebab-case.ts` para módulos, `PascalCase.tsx` para componentes React
- **DB**: `snake_case` (Sequelize mapea a `camelCase` en TS)
- **Idioma**: código en inglés, comentarios/docs en español

## Roadmap

Ver [PLAN_ULTRA.md §19](Home/PLAN_ULTRA.md) — roadmap semana a semana. Resumen:

- Semanas 1-3: Backend (auth, cases, geo, contacts, moderation)
- Semanas 4-8: Frontend (web + mapa + PWA) + outreach
- Semanas 9-10: Iteración + QA
- Semana 11: Launch

## Licencia

Privado — sin licencia pública por ahora.
