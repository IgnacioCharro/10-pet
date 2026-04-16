# CLAUDE.md

Instrucciones para Claude Code cuando trabajes en este repo.

## Sobre el proyecto

**10_Pet** — plataforma de rescate animal para Argentina. Ver `Home/PLAN_ULTRA.md` como documento maestro (estrategia, producto, arquitectura, roadmap). Es la fuente de verdad; si algo en este CLAUDE.md contradice al PLAN, gana el PLAN y avisá al usuario.

- Fase actual: **Semana 0 — setup inicial**
- MVP target: 11 semanas, solo **Concepto A (Rescate)**. Concepto B (Comunidad) entra en v1.5 y **no** debe implementarse antes.
- Alcance geográfico inicial: ciudad piloto del interior BsAs (~20k hab). La arquitectura es nacional-ready, la decisión es de go-to-market.

## Stack (no improvisar, seguir el plan §12)

- Runtime: Node.js 20 LTS + TypeScript (strict mode)
- API: Express + Sequelize + PostgreSQL 15 + PostGIS
- Queues: Bull + Redis (Upstash en dev y prod)
- DB: Supabase (Postgres + PostGIS en dev y prod)
- Frontend: React 18 + Vite + Tailwind + Zustand + Leaflet
- Validación: Zod (schemas compartidos en `packages/shared`)
- Auth: JWT (access 15min + refresh 7d) + OAuth Google
- Imágenes: Cloudinary signed uploads (upload directo cliente, el API solo firma)
- Email: SendGrid. Push: Firebase FCM. Errores: Sentry.

## Convenciones

### Estructura

Monorepo pnpm workspaces:
- `apps/api/` — backend Express
- `apps/web/` — frontend React
- `packages/shared/` — tipos + schemas Zod compartidos entre api y web
- `Home/` — docs, NO código

Dentro de `apps/api/src/`: estructura modular por dominio (ver plan §13.3, §16.1):
- `modules/auth/`, `modules/users/`, `modules/rescue/{cases,contacts,updates}/`, `modules/moderation/{reports,admin}/`
- `modules/community/` existe **vacío** desde día 1 (se activa en v1.5, no tocar hasta entonces)
- `services/` para integraciones externas (email, push, image, geocoding)
- `jobs/` para Bull processors
- Cada módulo: `X.routes.ts`, `X.controller.ts`, `X.service.ts`, `X.validators.ts`

### Naming

- Archivos TS: `kebab-case.ts`
- Componentes React: `PascalCase.tsx`
- DB: `snake_case`; Sequelize mapea automático a `camelCase` en TS
- Código en inglés, comentarios y commits en español (OK mezclar)

### Git

- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
- Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
- Squash merge; mensajes claros; no force push a `main`

### API

- Base URL: `/api/v1/...`
- Errores: formato estándar `{ error: { code, message, fields? } }` (ver plan §15.3)
- Validación con Zod en **todos** los endpoints (body, query, params)
- Rate limiting: 60 req/min por IP, 10 req/min en mutations

### Seguridad (plan §18.3, no saltear)

- bcrypt cost 12 para passwords
- JWT HS256, secret 256 bits
- Refresh tokens en DB (tabla `refresh_tokens`) para revocación
- helmet + cors whitelist + rate limit
- Sequelize parameterized queries (nunca raw SQL con concat)
- Teléfono **no expuesto** en `GET /cases/:id`; solo tras `POST /contacts`
- Email verificado obligatorio antes de publicar casos

## Reglas de trabajo

### Qué hacer

- Seguir el plan. Si hay duda, citar la sección (`§X.Y`) y preguntar.
- Preferir edits pequeños y atómicos con tests.
- Escribir tests (unit + integration) para cualquier endpoint nuevo.
- Usar `packages/shared` para schemas que cruzan api↔web.
- Variables de entorno: agregar siempre al `.env.example` con comentario.

### Qué NO hacer

- **No tocar** `modules/community/` hasta v1.5.
- No instalar dependencias sin justificar. Preferir lo del plan §12.
- No añadir features, refactors o "mejoras" fuera del alcance pedido.
- No crear documentación nueva (`*.md`) salvo pedido explícito.
- No usar emojis en código ni en commits.
- No commitear `.env` ni archivos con secrets.
- No asumir que existe Docker local — se usa Supabase/Upstash remoto.

## Comandos comunes (una vez scaffoldeado)

```bash
pnpm install                       # instalar deps del workspace
pnpm dev                           # api + web en paralelo
pnpm --filter api dev              # solo api
pnpm --filter web dev              # solo web
pnpm --filter api migrate          # correr migrations Sequelize
pnpm --filter api migrate:undo     # rollback última migration
pnpm --filter api test             # tests api
pnpm lint                          # lint todo
pnpm typecheck                     # typecheck todo
```

## Servicios externos (credenciales en `.env`)

| Servicio | Uso | Var principal |
|----------|-----|---------------|
| Supabase | Postgres + PostGIS | `DATABASE_URL` |
| Upstash | Redis (Bull) | `REDIS_URL` |
| Cloudinary | Imágenes | `CLOUDINARY_*` |
| SendGrid | Emails | `SENDGRID_API_KEY` |
| Firebase | Push FCM | `FIREBASE_*` |
| Sentry | Errores | `SENTRY_DSN` |

## Al iniciar una sesión

1. Leer `Home/PLAN_ULTRA.md` solo si la tarea lo requiere (es largo — 2275 líneas).
2. Preferir `git log --oneline -20` para ver actividad reciente antes de cambiar archivos.
3. Si algo del plan parece obsoleto vs el estado real del código, **avisar** — no actuar por iniciativa.

## Contacto estratégico

Founder: solo-dev. Red personal de testers en ciudad del interior BsAs (~20k hab). Presupuesto MVP: <$500 USD (diseñador UI único gasto fijo).
