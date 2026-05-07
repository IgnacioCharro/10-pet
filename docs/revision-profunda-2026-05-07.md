# Revisión profunda 10_Pet — 2026-05-07

> Documento de pausa y validación. **No es plan de features.**
> Estado: Fase 1, 2, 3 y 5 completas. Fase 4 queda como scaffold para
> llenar después del research.

## Por qué este documento

Estamos a mitad del MVP. Hay backend + frontend + DB + jobs corriendo,
pero todavía cero usuarios reales. Antes de seguir agregando código
queremos:

1. **Cerrar la brecha entre el `PLAN_ULTRA.md` y lo que hay en disco**:
   describir qué hace la app *hoy*, no qué planeamos que hiciera.
2. **Identificar qué nos bloquea para abrir a usuarios reales**: deuda
   técnica que importa, en orden.
3. **Diseñar el research cualitativo** que valida (o invalida) la
   hipótesis del producto antes de seguir construyendo a ciegas.
4. **Dejar listas las decisiones grandes** que el founder va a tener
   que tomar cuando haya datos.

Si después de este documento queda claro que algunas features hay que
recortarlas o pivotar el arquetipo objetivo, mejor saberlo ahora que
después de invitar a 30 ONGs.

---

## Fase 1 — Estado actual (con evidencia)

### 1.1 Qué hace 10_Pet hoy

- **Plataforma de rescate animal** con feed geolocalizado, mapa,
  detalle de caso y contacto vía WhatsApp. Backend Express + TypeScript
  + Sequelize sobre PostgreSQL + PostGIS, infra Supabase + Upstash
  (Redis) + Cloudinary + SendGrid + FCM (`apps/api/src/db/index.ts:12-18`,
  `apps/api/src/app.ts:1-17`).
- **Frontend** React 18 + Vite + Leaflet, montado como PWA con
  service worker FCM (`apps/web/package.json`,
  `apps/web/public/firebase-messaging-sw.js`).
- **Auth**: register, login, refresh, logout JWT (access 15 min,
  refresh 7 días), email verification (token 24h) y Google OAuth opcional
  (`apps/api/src/modules/auth/auth.routes.ts:14-58`,
  `apps/api/src/modules/auth/auth.service.ts:55-175`).
- **Casos** con foto hero (Cloudinary signed upload), ubicación PostGIS
  (`GEOMETRY(Point, 4326)`), urgencia 1-5, atributos del animal
  (`animal_sex`, `animal_size`, `animal_color`), `listing_type` lost/found,
  filtros geo + atributos, paginación y orden por urgencia / distancia /
  recencia (`apps/api/src/modules/rescue/cases/cases.service.ts:170-250`,
  `apps/api/src/modules/rescue/cases/cases.validators.ts:27-43`).
- **Contactos** con estados `pending → active → completed | rejected` y
  link `wa.me` autoarmado con código país +54 hardcodeado para Argentina
  (`apps/api/src/modules/rescue/contacts/contacts.service.ts:22-30`,
  `apps/api/src/modules/rescue/contacts/contacts.service.ts:223-238`).
  Constraint `UNIQUE(case_id, initiator_id)` evita doble pedido del
  mismo voluntario (`apps/api/src/db/migrations/20260422000000-create-contacts.js:68-72`).
- **Reportes** con threshold automático: 5 reports `pending` →
  status del caso pasa a `spam`
  (`apps/api/src/modules/moderation/reports/reports.service.ts:68-79`).
- **Admin** protegido por env var `ADMIN_EMAILS` separada por coma; sin
  rol en DB ni log de auditoría
  (`apps/api/src/middleware/require-admin.ts:9-20`).
- **Vet assistances**: registro de procedimiento / medicación / fecha
  por caso, con flag `is_vet` en usuarios
  (`apps/api/src/models/vet-assistance.model.ts`,
  `apps/api/src/db/migrations/20260430000000-add-vet-fields-to-users.js`).
- **Jobs Bull + Redis**: `notify-new-case` (email a usuarios verificados
  cuando se publica un caso) y `contact-request` (email al dueño del
  caso cuando alguien quiere ayudar). Ambos vía SendGrid; **ningún job
  manda push real** pese a que se guardan los `push_token`
  (`apps/api/src/jobs/notify-new-case.job.ts`,
  `apps/api/src/jobs/contact-request.job.ts`).
- **Wizard de publicar caso** de 4 pasos (fotos → ubicación →
  descripción → contacto), con autocompletado de localidad y reverse
  geocoding al mover el pin (`apps/web/src/pages/PublishCasePage.tsx`,
  922 líneas; commits `dcef9c3`, `f4b93b6`).
- **Operaciones admin**: stats globales, ban/unban de usuario, archivar
  o eliminar caso, queue de reports
  (`apps/api/src/modules/moderation/admin/admin.service.ts`).

### 1.2 Modelo de datos

8 tablas, 16 migrations en `apps/api/src/db/migrations/`:

| Tabla | Rol | Migrations relevantes |
|-------|-----|-----------------------|
| `users` | Cuenta + email verify + Google ID + `push_token` + `is_vet` + `vet_license` + `banned_at` + `name` | 20260418, 20260420, 20260422 (name), 20260424 (push), 20260430 (vet) |
| `refresh_tokens` | Tokens hasheados con `revoked` + `expires_at` | 20260419 |
| `cases` | Caso de rescate. PK UUID, `location GEOMETRY(Point, 4326)`, índice GiST, CHECK constraints en `animal_type`, `status`, `resolution_type`, `urgency_level`. Después se le suman `listing_type`, `archived` status, `animal_sex/size/color` | 20260421000001 + 20260430 + 20260501 + 20260503 |
| `case_images` | Fotos Cloudinary, posición ordenable | 20260421000002 |
| `case_updates` | Historial: `status_change`, `comment`, `avistamiento`, `medicacion`, `veterinario`, `comentario` | 20260421000003 + 20260426 |
| `contacts` | Pedido de contacto entre voluntario y dueño del caso, `UNIQUE(case_id, initiator_id)` | 20260422000000 |
| `reports` | Reporte de caso (no hay reporte de usuario en MVP, aunque el modelo tiene `target_user_id`) | 20260422000001 |
| `vet_assistances` | Procedimiento / medicación / fecha atención por caso | 20260430000001 |

**Observaciones importantes sobre el modelo**:

- **No hay RLS en Supabase**. El backend conecta como rol con permisos
  completos (`apps/api/src/db/index.ts:12-18`); toda la autorización vive
  en código (controllers/services). Si un controller olvida un check,
  no hay defensa en profundidad.
- **`users` no tiene `location` ni `coverage_radius_km`**. El plan
  (`Home/PLAN_ULTRA.md:1122-1133`) los necesita para segmentar
  notificaciones por zona del voluntario; hoy no existen y por eso el
  job de notificación manda email a *todos* los usuarios verificados
  (`apps/api/src/jobs/notify-new-case.job.ts:28-33`).
- **Admin no es un rol en DB**, es un email en env var
  (`require-admin.ts:9-14`). No hay tabla `admins` ni log de acciones.
- **`phone_contact` no se expone** en `GET /cases/:id` ni en listados
  (`BASE_CASE_SELECT` en `cases.service.ts:57-76` lo omite). Solo
  llega al voluntario cuando crea un `Contact` y el backend devuelve
  el link `wa.me` (`contacts.service.ts:106-110`). Bien.
- El comentario `// Never expose phone_contact in GET /cases/:id` en
  `cases.controller.ts:126` describe la intención correcta, pero el
  `const { ...safeCase } = caseDetail` de la línea siguiente es un
  no-op: la protección real está en el SELECT. Vale aclarar el
  comentario.

### 1.3 Flujos end-to-end vs. esqueletos

| Flujo | Estado |
|-------|--------|
| Auth (register / login / refresh / OAuth / verify email) | ✅ End-to-end. Tests integration: `auth.integration.test.ts`. |
| Publicar caso + fotos + atributos animal | ✅ End-to-end. Wizard de 4 pasos. |
| Listar / buscar / feed / nearby con filtros geo + atributos | ✅ End-to-end. |
| Detalle de caso + updates + imágenes | ✅ End-to-end (`/cases/:id`, página dedicada desde commit `76a5214`). |
| Editar caso (autor o admin) | ✅ End-to-end (`PATCH /cases/:id`). |
| Contactos + WhatsApp link | ✅ End-to-end. |
| Reports + auto-spam | ✅ Funciona; threshold = 5. |
| Vet assistances | ✅ End-to-end. |
| Push tokens | ⚠️ Se **guardan** en `users.push_token` pero ningún job los **lee**. FCM no se llama desde el backend. |
| Notificación geo-segmentada | ⚠️ TODO explícito en `notify-new-case.job.ts:27`. Hoy es broadcast a todos. |
| Recuperación de password | ❌ **No existe**. El plan la lista como must-have (`Home/PLAN_ULTRA.md:7.2`). No hay endpoint ni email template. |
| Email verificado **obligatorio** para publicar | ❌ No se aplica. `cases.routes.ts:22-24` solo pide `requireAuth`; `require-auth.ts:28-32` no lee `email_verified`. CLAUDE.md y el plan (`§18.3`) lo asumen, pero el código no lo hace cumplir. **Cualquier registro sin confirmar email puede crear casos.** |
| Comunidad (módulo `community/`) | ❌ Esperado: solo `.gitkeep`. Roadmap v1.5 según plan. |
| Filtro por urgencia "min" en frontend | ✅ (`FilterBar.tsx`). |
| Cluster en mapa | ✅ (`leaflet.markercluster` en `apps/web/package.json`). |
| Paginación / sort | ✅ Backend, frontend tiene scroll en lista. |

### 1.4 Deuda técnica visible

- **Sin tests de frontend**. `apps/web/package.json` no tiene script
  `test` ni runner instalado. Hay tests integration en backend, no en
  web.
- **Componentes monstruo**:
  - `apps/web/src/pages/PublishCasePage.tsx` — 922 líneas.
  - `apps/web/src/components/cases/CaseDetailSheet.tsx` — 945 líneas.
  - `apps/web/src/pages/AdminPage.tsx` — 540 líneas.
  Cualquier cambio acá tiene riesgo alto de regresión sin tests.
- **Mezcla raw SQL + Sequelize ORM** en el mismo archivo:
  `cases.service.ts` usa `sequelize.query<T>` con strings SQL crudos
  (líneas 89-156, 235-250, 370-393) y al mismo tiempo `CaseImage.bulkCreate`
  (línea 165), `Case.findByPk` (311), `CaseUpdate.create` (471). Convivencia
  válida pero hace difícil razonar sobre transacciones.
- **`cloud_name` con fallback `'placeholder'`**: si la env var falta,
  las URLs salen como `https://res.cloudinary.com/placeholder/image/upload/...`
  (`cases.controller.ts:59`). En prod = imágenes rotas silenciosas.
- **Email "fantasma" sin API key**: si `SENDGRID_API_KEY` no está,
  `email.service.ts:17` hace `console.log` y devuelve OK. La verificación
  de email "funciona" desde el lado del usuario hasta que descubre que
  nunca le llegó nada. Mismo problema en `sendVerificationEmail` líneas
  35-38.
- **Loop de envío secuencial**: `notify-new-case.job.ts:42-58` recorre
  todos los users con `for...of await sendEmail(...)`. Para 1000 users
  son ~1000 round-trips a SendGrid en serie por cada caso publicado.
  Sin batch / sin paralelismo. SendGrid free tier = 100 mails/día,
  pega muy rápido.
- **Sin idempotencia en jobs**: Bull retry con `attempts: 3` reintenta
  el job entero (`cases.service.ts:153`). Si `notify-new-case` falla a
  mitad de loop, el reintento manda emails duplicados a los primeros N
  destinatarios.
- **OAuth Google montado condicionalmente sin log**: si las creds están
  vacías, `auth.routes.ts:22-58` simplemente no monta esas rutas. Sin
  log, sin healthcheck — silencioso.
- **`require-admin.ts` recalcula el set de admins por request**: lee
  `process.env.ADMIN_EMAILS` y lo splittea en cada llamada
  (líneas 9-14). Cosmético, pero también muestra que el modelo de
  permisos no está cacheado/centralizado.
- **Sin connection pool tuning explícito** en Sequelize ni timeouts
  (`db/index.ts:12-18`). Usar defaults con Supabase pooler suele andar,
  pero queda sin documentar.
- **No hay tracking de eventos**: ni server-side ni cliente. Imposible
  saber "cuántos usuarios abrieron el wizard y abandonaron en el paso
  2" sin instrumentar nada.
- **Health check parcial** (`routes/health.routes.ts`): no expone estado
  de Redis ni Cloudinary ni SendGrid; sólo DB.

### 1.5 Hipótesis implícita del producto

Leyendo el código (no el plan), 10_Pet asume que:

1. **Quien encuentra un animal** quiere publicar **rápido** (wizard
   de 4 pasos, geolocalización con un click, tope de 5 fotos).
2. **Voluntarios cercanos** quieren **descubrir casos por feed/mapa**
   y **contactar por WhatsApp** con un texto pre-armado.
3. **La identidad** se construye con email (verificado si todo
   funciona) y, opcionalmente, número de teléfono. No con red social,
   no con verificación documental.
4. **La coordinación es 1-a-1** entre el reportador y un voluntario.
   No hay chat grupal, ni varios voluntarios visibles en el mismo
   caso al mismo tiempo, ni asignación formal.
5. **La autoridad sobre el caso es del autor**: solo él agrega
   updates (`cases.service.ts:464-469`). Esto es una decisión fuerte
   con implicancia de UX (¿qué pasa si quien rescató no es quien
   reportó?).
6. **El mercado es Argentina**: textos en español rioplatense
   hardcoded, código país +54 hardcoded
   (`contacts.service.ts:25`).
7. **El reportador casual confía en publicar la ubicación
   exacta del animal** en una plataforma pública. (Esta hipótesis
   merece verificarse en research; ver Fase 2 ítem C7 y Fase 5 D1.)

---

## Fase 2 — Auditoría técnica accionable

### 2.1 Riesgos críticos (bloquean tener usuarios reales)

| # | Item | Archivo | Severidad | Esfuerzo |
|---|------|---------|-----------|----------|
| C1 | Cualquier usuario sin email verificado puede publicar casos | `cases.routes.ts:22`, `require-auth.ts` | Alta | S |
| C2 | Sin recuperación de password | falta endpoint | Alta | M |
| C3 | Notificación broadcast a todos los users verificados (no geo) | `notify-new-case.job.ts:28-33` | Alta | M |
| C4 | Sin RLS en Supabase: cualquier bug en backend = leak total | `db/index.ts:12-18` | Alta | L |
| C5 | Auto-spam por 5 reports = vector de brigading entre rescatistas | `reports.service.ts:68-79` | Media-Alta | S |
| C6 | Email service "silencioso" sin API key | `email.service.ts:16-19` | Alta | S |
| C7 | Ubicación exacta del animal expuesta públicamente — riesgo bienestar | `cases.service.ts:64-67`, `cases.controller.ts:116-133` | Alta | M |
| C8 | `ADMIN_EMAILS` por env var: difícil rotar, sin auditoría | `require-admin.ts:9` | Media | M |
| C9 | Cloudinary signed upload sin validación de tamaño/tipo en backend | `image.service.ts:18-31` | Media | M |
| C10 | `cloud_name` fallback `'placeholder'` puede llegar a prod | `cases.controller.ts:59` | Media | S |
| C11 | Loop secuencial de emails — limite SendGrid free + duplicados al reintentar | `notify-new-case.job.ts:42-58` | Alta | M |

**Por qué cada uno importa para usuarios reales**:

- **C1** — un troll registra `troll@mailinator.com`, no confirma, y empieza
  a crear casos falsos. Todo el sistema de notificaciones se dispara y
  los voluntarios reales se queman. Muy fácil de explotar.
- **C2** — la primera ONG que pierde su password no puede entrar.
  Bloqueo total para un usuario real, sin workaround.
- **C3** — un voluntario en Mendoza recibe email de un caso en La
  Plata. La gente desactiva notificaciones el día 2; pierde la utilidad
  central del producto.
- **C4** — sin RLS, un bug de autorización (un controller que olvida
  un check) deja a cualquiera leer/modificar todo. Es defensa en
  profundidad estándar.
- **C5** — 5 cuentas coordinadas mandan a un caso a `spam`. Un
  voluntario al que le caen mal otros puede sacarle el caso. Sucede
  en grupos reales de rescate.
- **C6** — el peor caso silencioso: el usuario cree que el sistema
  funciona porque el endpoint devolvió 200, pero el email nunca salió.
- **C7** — si publicás "perro lastimado en Pueyrredón 1234" + foto +
  georreferencia, alguien con malas intenciones puede ir a buscarlo
  *antes* que un voluntario. ONGs argentinas reportan robos y
  envenenamientos cuando publican demasiada precisión. Esto hay que
  validar en research (es una hipótesis de severidad).
- **C8** — un admin se va del proyecto y queda con acceso hasta que
  alguien edita el `.env` de Railway. Sin log: no sabés quién banneó
  qué.
- **C9** — alguien con la firma sube 300MB de fotos sin formato.
  Cloudinary cobra por uso.
- **C10** — un día se cae el feed sin error en logs porque las URLs
  apuntan a `placeholder`.
- **C11** — el job de notificación es el camino crítico del producto
  ("publico un caso → otros se enteran"). Si revienta el quota o
  duplica, mata la confianza.

### 2.2 Deuda media (frena velocidad, no es bloqueante)

| # | Item | Archivo | Severidad | Esfuerzo |
|---|------|---------|-----------|----------|
| M1 | Componentes monstruo sin tests | `PublishCasePage.tsx`, `CaseDetailSheet.tsx`, `AdminPage.tsx` | Media | M |
| M2 | Cero tests de frontend | `apps/web/package.json` | Media | M |
| M3 | Mezcla raw SQL + ORM en el mismo módulo | `cases.service.ts` | Baja-Media | L |
| M4 | Push tokens guardados pero nunca usados (FCM no llamado) | `users` model + `firebase.service.ts` | Media | M |
| M5 | Sin idempotencia en jobs Bull | `jobs/*.ts` | Media | M |
| M6 | Health check no cubre Redis / Cloudinary / SendGrid | `health.routes.ts` | Baja | S |
| M7 | Sin tracking de eventos (analytics) | global | Media | M |
| M8 | OAuth condicional silencioso | `auth.routes.ts:22-58` | Baja | S |
| M9 | Comentario engañoso en `getCase` | `cases.controller.ts:126-128` | Baja | S |

### 2.3 Cosas que funcionan — preservar

- **Estructura modular por dominio**: `apps/api/src/modules/{auth,rescue,
  moderation,images,users,community}` está limpia y respeta CLAUDE.md.
- **Validación Zod** en todos los endpoints de entrada
  (`cases.validators.ts`, `auth.validators.ts`, etc.).
- **Rate limiting** global + extra en mutations (`app.ts:20-21`).
- **Refresh tokens hasheados** en DB con `revoked` + `expires_at`
  (`auth.service.ts:38-43`, `auth.service.ts:131-133`).
- **bcrypt cost 12** (`auth.service.ts:20`).
- **Helmet + CORS whitelist + Sentry** integrados en el bootstrap
  (`app.ts:23-24, 41`).
- **Migrations versionadas y reversibles**, índice GiST en
  `cases.location` desde día 1.
- **Tests de integración de backend** para auth, cases, contacts,
  admin, reports, users.
- **Postman collection** y SQL de truncate pre-launch
  (`Home/postman_collection.json`, `Home/truncate_before_launch.sql`).
- **WhatsApp deep link bien armado** (incluye texto pre-formado con
  ID del caso, `contacts.service.ts:22-30`).
- **`phone_contact` jamás aparece en SELECTs públicos**: queda
  protegido por construcción.
- **Constraint `UNIQUE(case_id, initiator_id)`** evita doble pedido
  del mismo voluntario al mismo caso (`migrations/20260422000000`).

### 2.4 Decisiones de arquitectura pendientes (hoy implícitas)

D-A1. **Ubicación de voluntarios**: ¿se guarda? ¿con qué precisión?
¿se usa para segmentar notificaciones? Hoy `users` no tiene
`location` / `coverage_radius_km` — bloqueante para el comportamiento
"voluntarios cerca tuyo" que vende la landing.

D-A2. **Privacidad de la ubicación del animal**: ¿coordenadas
exactas o radio difuso (300m)? Trade-off entre utilidad para
voluntarios y exposición del animal. Ver C7.

D-A3. **Quién puede agregar updates**: hoy solo el autor
(`cases.service.ts:464-469`). En la práctica el voluntario que está
físicamente con el animal querría poder reportar "lo llevé a la
veterinaria". O sumamos un rol "voluntario asignado", o seguimos así
y aceptamos esa fricción.

D-A4. **RLS sí o no**: si seguimos sin RLS, hay que documentar el
modelo de amenaza explícito y compensar con cobertura de tests
sobre cada controller.

D-A5. **Push real vs solo email**: hay tokens y servicio FCM listos,
falta el job. ¿Lo armamos antes de invitar a 100 ONGs (alto valor
percibido) o lo dejamos para v1.1?

D-A6. **Admin como rol en DB vs env var**: para escalar moderación a
ONGs (PLAN_ULTRA propone "moderador por zona") no alcanza el modelo
actual.

---

## Fase 3 — Plan de research de usuarios

**Objetivo**: pasar de "creemos que esto resuelve X" a "leímos 250+
piezas de evidencia y sintetizamos los dolores recurrentes". Foco
LATAM (Argentina prioridad), inglés como benchmark.

Arquetipos a indagar (alineados con `PLAN_ULTRA.md §6.1`): Reportador
casual, Voluntario activo, ONG / Refugio. Adoptante queda fuera del
research por estar fuera de MVP.

### 3.1 Mapa de comunidades

#### Reddit (inglés — benchmark global)

| Sub | URL | Tamaño aprox. | Por qué nos importa |
|-----|-----|---------------|---------------------|
| r/rescuecats | https://reddit.com/r/rescuecats | ~270k | Voluntario activo, foco gato, mucho rant operativo |
| r/AnimalRescue | https://reddit.com/r/AnimalRescue | ~120k | Voluntario + ONG, pain de coordinación |
| r/dogrescue | https://reddit.com/r/dogrescue | ~30k | Caso perro específico |
| r/AskVet | https://reddit.com/r/AskVet | ~280k | Pov vet — útil para C7 (privacidad/abuso) |
| r/lostpets | https://reddit.com/r/lostpets | ~30k | Foco lost/found — relevante para `listing_type` |
| r/Pets | https://reddit.com/r/Pets | ~600k | Más amplio, filtrar |
| r/Volunteer | https://reddit.com/r/Volunteer | ~120k | Pain de voluntariado en general (burnout) |

#### Reddit (español)

| Sub | URL | Tamaño aprox. | Por qué nos importa |
|-----|-----|---------------|---------------------|
| r/perros | https://reddit.com/r/perros | ~80k | Hispano, mix de dueños + voluntarios |
| r/Argentina | https://reddit.com/r/Argentina | ~700k | Buscar hilos con flair "Pregunta" o "Serio" sobre rescate |
| r/Mascotas | https://reddit.com/r/Mascotas | ~6k | Chico pero hispano específico |
| r/AskArgentina | https://reddit.com/r/AskArgentina | ~30k | Buscar hilos "qué hago si encuentro un perro" |
| r/ArgentinaBenderStyle | (verificar existencia) | — | A veces aparecen rants de voluntariado |

#### Facebook Groups (donde están los voluntarios reales en AR)

La búsqueda Facebook desde fuera es opaca; estrategia híbrida:

1. **Pedirle al founder los nombres exactos de 5 grupos a los que
   ya pertenece**. La red personal acelera 10×.
2. Buscar manualmente con queries:
   - "rescate animal [Buenos Aires|CABA|GBA|interior|provincia X]"
   - "perros perdidos [ciudad]"
   - "proteccionistas [provincia]"
   - "transitos [ciudad]"
   - "adopciones responsables [ciudad]"

Listar al menos 8 grupos identificables. Ejemplos esperados (verificar
nombres exactos al ejecutar):

- "Rescate Animal CABA"
- "Proteccionistas Argentina Unidos"
- "Mascotas Perdidas y Encontradas Argentina"
- "Adopciones Responsables AMBA"
- "Rescate Animal La Plata"
- "Patitas en Acción [zona]"
- "Voluntarios Rescate Buenos Aires"
- Grupo de la ciudad piloto del founder (pedir).

#### Twitter / X

Hashtags: `#AdoptaNoCompres`, `#RescateAnimal`, `#PerrosPerdidos`,
`#GatosPerdidos`, `#AnimalesEnRiesgo`, `#Proteccionismo`,
`#AnimalesArgentina`, `#AdoptaUnPerro`.

Cuentas referencia (verificar handles vigentes en mayo 2026):
@Sin_Estribos, @ZooFugi, @rescatistasargentinos, @FundacionPatitas,
veterinarios influyentes y zoonosis municipales. Pedirle al founder
3-5 handles que ya siga.

#### Foros / otros

- **Telegram**: canales locales tipo "Rescate [ciudad]". Pedir links
  al founder.
- **Instagram**: comentarios en posts virales de ONGs (Meztli, Patitas
  Verdes, etc.). El sentimiento crudo está en los comentarios, no en
  los posts.
- **Comentarios de Google Maps en refugios y veterinarias**: señal
  débil pero real (gente quejándose porque "no me atendieron" o
  "no se hicieron cargo").
- **Reviews de Patitas Callejeras** (Play Store + App Store): leer
  todas las 1-2 estrellas de los últimos 12 meses. Validan
  directamente la oportunidad descrita en `PLAN_ULTRA.md §5.1`.
- **Reviews de PetAlert AR / Finding Rover**: mismo método.

### 3.2 Preguntas de investigación (priorizadas)

| # | Pregunta | Prioridad | Qué valida/invalida |
|---|----------|-----------|---------------------|
| P1 | ¿Qué hace una persona AHORA cuando encuentra un animal en la calle? | Alta | Hipótesis 1 |
| P2 | ¿Cuál es su frustración #1 con esos canales? | Alta | Diferenciación vs. Facebook/WhatsApp |
| P5 | ¿Cómo coordinan entre voluntarios hoy? | Alta | Hipótesis 2, 4 |
| P6 | ¿Qué los haría desconfiar de una plataforma nueva? | Alta | C7, D-A2, D1 |
| P9 | ¿Cómo verifican si un caso ya está en manos de alguien? | Alta | Diferenciación: estado del caso |
| P3 | ¿Cuándo abandonan / dejan de intentar? | Media | Retención |
| P4 | ¿Qué herramientas digitales usaron y por qué fallaron? | Media | Diferenciación |
| P11 | ¿Qué hacen con casos lejanos que no pueden tomar? | Media | UX feed |
| P12 | ¿Qué tan local es local? (radio real) | Media | D-A1 |
| P7 | ¿Pagarían por una versión Pro? ¿Cuánto? | Media | Monetización |
| P8 | ¿Cómo financian veterinaria / comida en rescates difíciles? | Media | Dolor económico explícito |
| P10 | ¿Qué les pasa con casos sin novedad / fallecidos / adopciones que se caen? | Baja | Cierre emocional |

### 3.3 Metodología de extracción

**Búsquedas concretas** (no "buscar problemas de rescatistas"):

Reddit (vía site:reddit.com en Google + búsqueda nativa):

```
"rescue group" frustrated coordinate
"too many" rescue dogs Facebook group
volunteer burnout animal rescue
"animal rescue" app review
lost cat poster works
rescate perro grupo whatsapp problema
"rescaté un perro" Argentina dificultad
proteccionista CABA queja
app rescate animales sirve
encontré un perro Argentina qué hago
```

Facebook Groups: ingresar y leer los **últimos 30 días de posts en
orden cronológico**. No buscar — el algoritmo entierra lo que importa.
Lo valioso son los **rants** y los **pedidos desesperados**, no los
avisos limpios.

Twitter / X: búsqueda avanzada con
`proteccionista lang:es -filter:retweets min_faves:5` para filtrar
ruido. Threads largos de rescatistas conocidos suelen ser etnografía
pura.

Reviews de apps existentes: leer **todas** las reviews 1-2 estrellas
de los últimos 12 meses de Patitas Callejeras, PetAlert AR y Finding
Rover. Anotar palabra-por-palabra los pain points.

**Tipo de hilos que importan**:

- ✅ Rants ("estoy harta de…")
- ✅ Pedidos desesperados ("ayuda urgente, no sé qué hacer con…")
- ✅ Reviews negativas de apps existentes
- ✅ Hilos de "cómo coordinan ustedes…"
- ✅ Críticas a ONGs y a otros voluntarios (revela los conflictos
  internos, que son señal fuerte de mercado)
- ❌ Posts de "miren qué linda esta adopción" (solo señal de marca)
- ❌ Memes / chistes (skip)

**Volumen mínimo por comunidad para representatividad**:

- Reddit: 30-50 posts/comments por subreddit relevante.
- Facebook: 20-30 posts del último mes por grupo, 3-5 grupos.
- Twitter: 30-50 tweets/threads largos.
- Reviews de apps: TODAS las 1-2 estrellas (probablemente <100).
- **Total target**: ~250-400 piezas. Saturación cuando la pieza N+1
  no aporta dolor nuevo.

**Registro**: planilla Google Sheets con columnas:

```
fuente | url | fecha | idioma | arquetipo | cita textual | dolor (P1-P12) | sentimiento (1-5) | nota
```

Una fila por pieza de evidencia. La planilla es el insumo de Fase 4 —
queda linkeada desde acá:

> **TODO**: pegar link a la planilla cuando se cree.

**Firecrawl / scraping**: solo para hilos largos de Reddit que querramos
leer offline (`reddit.com/r/X/top.json?t=year` da JSON sin auth).
Facebook bloquea, no rinde scrapeo. Para Reddit, scrape manual + copy-
paste a Sheets es más rápido que infraestructura, y mantiene al founder
leyendo cada cita (clave para no perder el sentido).

### 3.4 Síntesis: de evidencia a insights

**Framework**: Pains / Gains / Jobs-to-be-Done abreviado.

Para cada arquetipo (Reportador casual, Voluntario activo, ONG):

- **Job**: "cuando [situación], quiero [acción], para [resultado]".
- **Pains** (top 3): dolores recurrentes ordenados por frecuencia.
- **Gains** (top 3): cosas que valoran cuando algo funciona.
- **Workarounds actuales**: qué usan hoy y por qué les sirve a medias.
- **Trust killers**: qué los hace desconfiar de una plataforma.

**Reglas de síntesis**:

- Un dolor entra al top si aparece en **≥5 piezas** de evidencia
  distintas y de fuentes distintas (no 5 comentarios del mismo hilo).
- Citar literal: cada insight debe tener al menos 2 quotes textuales
  en la planilla.
- Separar "queja" de "deseo": una persona puede quejarse de WhatsApp
  y *no* querer reemplazarlo por una app — eso importa y no se puede
  asumir.

---

## Fase 4 — Cruce técnico ↔ usuarios (TBD)

> Sección scaffold. Llenar después de ejecutar Fase 3 y consolidar la
> planilla de evidencia.

### 4.1 Lo que construimos que sí resuelve dolores reales

| Feature actual | Dolor que resuelve | Frecuencia en research | ¿Bien implementado hoy? |
|----------------|--------------------|-----------------------|--------------------------|
| (TBD) | (TBD) | (TBD) | (TBD) |

### 4.2 Lo que construimos que NO aparece en el research

> Candidato a recortar / de-prioritizar.

| Feature actual | Por qué no aparece | Acción sugerida |
|----------------|---------------------|------------------|
| (TBD) | (TBD) | (TBD) |

### 4.3 Dolores reales que NO atacamos hoy

> Candidato a entrar en roadmap.

| Dolor | Arquetipo | Frecuencia | Encaja en MVP / v1.1 / v2 |
|-------|-----------|-----------|----------------------------|
| (TBD) | (TBD) | (TBD) | (TBD) |

### 4.4 ¿La hipótesis original se sostiene?

Hipótesis: *"voluntarios y reportadores prefieren esta app sobre los
grupos de Facebook/WhatsApp para casos de rescate reales, y la usan
recurrentemente"* (`PLAN_ULTRA.md §7.1`).

| Sub-hipótesis | Veredicto (sostiene / parcial / pivot) | Evidencia |
|---------------|----------------------------------------|-----------|
| (TBD) | (TBD) | (TBD) |

---

## Fase 5 — Decisiones y próximos pasos

### 5.1 Decisiones que el founder va a tener que tomar

D1. **Privacidad de ubicación de casos** (relacionado con C7, D-A2)

- A. Coordenadas exactas (estado actual).
- B. Ofuscar a radio 300m en feed público; exacto solo a usuario
  logueado y verificado.
- C. Exacto siempre, pero opt-in del reportador.

Trade-off: utilidad para voluntarios vs. riesgo de exposición del
animal. **Recomendación pendiente de research**: P6 valida o invalida
esto.

D2. **Email verificado como gate para publicar** (C1)

- A. Bloquear creación de caso hasta verificar (rompe onboarding
  rápido pero alinea con `PLAN_ULTRA.md §18.3`).
- B. Permitir y moderar post-hoc.
- **Recomendación inicial**: A. El plan ya lo asume; no implementarlo
  es deuda muda.

D3. **Notificación geo-segmentada** (C3, D-A1)

- A. Mantener "broadcast a todos verificados" (estado actual). No
  escala; rompe deliverability.
- B. Exigir `users.location` + `coverage_radius_km` antes de invitar
  a 100 ONGs.

**Recomendación inicial**: B. Sin esto el producto promete algo que
no cumple.

D4. **Push real (FCM) en MVP o no** (M4)

- A. Armar el job antes de invitar — alto valor percibido, ya está
  el setup técnico.
- B. Diferir a v1.1 — email cubre.
- **Recomendación inicial**: A si Fase 3 confirma que voluntarios
  activos están "siempre con el celu en la mano"; B si el dolor real
  es coordinación, no inmediatez.

D5. **Pivot de arquetipo** (depende 100% de Fase 3)

- A. Mantener el plan: voluntario activo + ONG como tier 1-2,
  reportador casual tier 3.
- B. Pivotar a ONG-first: ONGs piden la app, son menos pero más
  recurrentes.
- C. Pivotar a reportador casual: si en Fase 3 el dolor mayor es
  "no sé a quién avisar" y los voluntarios ya tienen sus circuitos.

D6. **Activar RLS en Supabase** (C4)

- A. Activar — defensa en profundidad.
- B. Mantener sin RLS — más simple, compensar con tests por
  controller.

**Recomendación inicial**: A si llegamos a 100+ usuarios; B si en
los próximos 2 meses se mantiene piloto cerrado.

### 5.2 Timeline estimado

| Fase | Esfuerzo | Cuándo |
|------|----------|--------|
| Fase 1 (estado actual) | 4-6h | hecho en este doc |
| Fase 2 (auditoría) | 4-6h | hecho en este doc |
| Fase 3 (plan research) | 3-4h | hecho en este doc |
| **Fase 3 (ejecución research)** | **20-30h** repartidas en 1-2 semanas | post-aprobación |
| Fase 4 (síntesis + cruce) | 6-8h | tras research |
| Fase 5 (decisiones definitivas) | 2-3h con el founder | tras Fase 4 |

**Total para tener decisiones tomadas**: ~3 semanas (con días de
descanso, no full-time).

### 5.3 Qué se necesita del founder para arrancar Fase 3

- Confirmar el path/nombre de archivo del doc (este).
- Lista de **5 grupos de Facebook** y **5 cuentas IG/X** a las que ya
  pertenece o sigue (acelera 10×).
- Acceso de lectura a la planilla Google Sheets (para revisar evidencia
  mientras se construye, no al final).
- Confirmar la **ciudad piloto** (no figura en el repo y `PLAN_ULTRA.md
  §3` la menciona sin nombre).
- Decisión: ¿Fase 3 incluye **entrevistas cualitativas de 30 min** con
  3-5 ONGs? Más caro, mucho más rico que solo lectura pasiva.
- ¿Hay presupuesto chico (USD 30-100) para incentivos de entrevistas?

### 5.4 Preguntas abiertas para el founder

1. ¿La ciudad piloto se nombra en este doc o se mantiene anónima?
2. ¿Este `docs/revision-profunda-*.md` va a ser público (parte del
   repo abierto algún día)? Si sí, cuidar de no citar credenciales ni
   emails de ONGs por nombre.
3. ¿El research lo ejecuta solo el founder o se delega parcialmente
   (asistente que lea y cargue planilla)?
4. ¿Sumamos como output secundario un reporte de seguridad de C1-C11
   priorizado para arreglar antes del launch público, o eso queda
   fuera de scope?
