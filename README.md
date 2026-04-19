# 10_Pet

Plataforma de rescate animal colaborativa para Argentina. Un mapa en vivo donde cualquier persona reporta animales en situación de calle, los voluntarios cercanos reciben aviso al instante, y cada caso tiene historial hasta resolverse.

> Estado: **Semana 1 completa** — Auth backend funcionando (register, login, refresh, logout, email verification, OAuth Google). Ver [PLAN_ULTRA.md](Home/PLAN_ULTRA.md) para el plan completo.

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

## API — Endpoints disponibles

La API corre en `http://localhost:3000`. Importar [Home/postman_collection.json](Home/postman_collection.json) en Postman para probar todo el flujo.

### Auth (`/api/v1/auth`)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Registrar usuario. Envía email de verificación. |
| POST | `/auth/login` | — | Login con email + password. |
| POST | `/auth/refresh` | — | Rotar refresh token. |
| POST | `/auth/logout` | — | Revocar refresh token. |
| GET | `/auth/verify-email?token=` | — | Verificar email desde link del correo. |
| GET | `/auth/google` | — | Iniciar OAuth Google (abrir en navegador). |
| GET | `/auth/google/callback` | — | Callback de Google (manejado automáticamente). |

### Users (`/api/v1/users`)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/users/me` | Bearer token | Perfil del usuario autenticado. |

### Sistema

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/health` | Estado de la API y la base de datos. |

### Formato de error estándar

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Credenciales invalidas",
    "fields": {}
  }
}
```

## Roadmap

Ver [PLAN_ULTRA.md §19](Home/PLAN_ULTRA.md) — roadmap semana a semana. Resumen:

- Semanas 1-3: Backend (auth, cases, geo, contacts, moderation)
- Semanas 4-8: Frontend (web + mapa + PWA) + outreach
- Semanas 9-10: Iteración + QA
- Semana 11: Launch

## Licencia

Privado — sin licencia pública por ahora.
