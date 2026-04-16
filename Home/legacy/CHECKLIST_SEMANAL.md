# CHECKLIST SEMANAL: MVP 3-4 MESES (SOLO)

**Filosofía**: 
- No perfectionism. Shipped > perfect.
- 6h/día max (burnout = fracaso).
- Sábados y domingos: NO trabajo (salud mental).
- Review progress viernes 5pm.

---

## SEMANA 1: Backend setup + Auth

**Meta**: JWT auth completo, poder testear con Postman

### Lunes
- [ ] Crear repo GitHub (README minimal)
- [ ] Setup Node + Express + TypeScript
  - [ ] `npm init`
  - [ ] Instalar: express, dotenv, cors, helmet
  - [ ] Instalar dev: ts-node, typescript, nodemon
- [ ] Crear `.env.example` con variables
- [ ] Server "Hello World" en localhost:3000
- [ ] Commit: "Initial setup"
- **Horas**: 1-2h

### Martes
- [ ] Setup PostgreSQL (Render.com account)
  - [ ] Crear DB, copiar connection string
  - [ ] Instalar: sequelize, pg, sequelize-cli
- [ ] Crear config/database.ts (connection)
- [ ] Primeiro modelo: User
  ```
  id, email, password_hash, phone, name, 
  created_at, updated_at
  ```
- [ ] Migration: `npx sequelize migration:create --name create_users`
- [ ] DB connects ✓
- [ ] Commit: "Database setup + User model"
- **Horas**: 2-3h

### Miércoles
- [ ] Instalar bcrypt + jsonwebtoken
- [ ] Routes/auth.ts:
  - [ ] POST /auth/register (validar email unique, hash pass)
  - [ ] POST /auth/login (verify pass, return token + refresh)
  - [ ] POST /auth/refresh (validate refresh_token, return new token)
- [ ] Middleware JWT (verify token en protected routes)
- [ ] Error handling middleware
- [ ] Commit: "Auth routes + JWT"
- **Horas**: 2-3h

### Jueves
- [ ] Instalar Sendgrid SDK
- [ ] Services/emailService.ts
  - [ ] Function: sendVerificationEmail(email, token)
- [ ] Routes: GET /auth/verify-email/:token
- [ ] Update User model: email_verified_at (nullable)
- [ ] Test email flow manually
- [ ] Commit: "Email verification"
- **Horas**: 1-2h

### Viernes
- [ ] Crear Postman collection (Auth endpoints)
  - [ ] register + login + refresh + verify-email
- [ ] Test todos los endpoints (success + error cases)
- [ ] Document en README: "Cómo testear auth"
- [ ] Code review personal (lint, cleanup)
- [ ] Commit: "Postman collection + documentation"
- **REVIEW**: ¿Puedo loginear sin UI? SÍ? ✅ Semana 1 completa
- **Horas**: 1-2h

**SEMANA 1 TOTAL**: 9-15h (normal)  
**Síntoma éxito**: Tienes token JWT en Postman que expira y se refresca.

---

## SEMANA 2: Data model + Geolocalización

**Meta**: API de casos funcional, búsqueda por ubicación (aunque lenta)

### Lunes
- [ ] Estudiar 1h PostGIS en PostgreSQL
- [ ] Update Sequelize config para extensión GIS
  - [ ] `CREATE EXTENSION IF NOT EXISTS postgis;`
- [ ] Modelos nuevos:
  - [ ] Case (id, user_id, animal_type, description, location GEOMETRY, status, created_at)
  - [ ] CaseUpdate (id, case_id, user_id, update_type, content, created_at)
- [ ] Migrations para ambos
- [ ] Test que geolocalización funciona
- [ ] Commit: "Case model + PostGIS"
- **Horas**: 2-3h

### Martes
- [ ] Routes/cases.ts:
  - [ ] POST /cases (create, validar datos, guardar location)
  - [ ] GET /cases (listar con pagination)
  - [ ] GET /cases/:id
  - [ ] PATCH /cases/:id (solo owner, cambiar status)
- [ ] Validación con Joi: animal_type, description, location
- [ ] Commit: "CRUD cases"
- **Horas**: 2h

### Miércoles
- [ ] Geospatial queries:
  - [ ] GET /cases/nearby?lat=X&lng=Y&radius=5 (ST_DWithin)
  - [ ] Order by distance (ST_Distance)
- [ ] Test con Postman (usa coords reales CABA)
- [ ] Optimize query (add index)
  ```sql
  CREATE INDEX idx_cases_location ON cases USING GIST(location);
  ```
- [ ] Commit: "Geolocation queries + index"
- **Horas**: 2-3h

### Jueves
- [ ] Filtros adicionales:
  - [ ] GET /cases?status=abierto&animal_type=perro&created_after=2024-01-01
  - [ ] Implement query builder (Sequelize where conditions)
- [ ] Paginación: ?page=1&limit=20
- [ ] Test todos los filters en Postman
- [ ] Commit: "Filtering + pagination"
- **Horas**: 1-2h

### Viernes
- [ ] CaseUpdate routes (historial):
  - [ ] GET /cases/:id/history
  - [ ] POST /cases/:id/updates (agregar update)
- [ ] Testing completo (todas combinaciones)
- [ ] Performance check: query sin índice vs con índice (debe notar diferencia)
- [ ] Code cleanup
- [ ] Commit: "Case history + performance"
- **REVIEW**: ¿Puedo ver casos cercanos a cualquier coord? SÍ? ✅ Semana 2 completa
- **Horas**: 1-2h

**SEMANA 2 TOTAL**: 10-14h  
**Síntoma éxito**: Query `SELECT * FROM cases WHERE ST_DWithin(location, ..., 5000)` retorna en < 100ms.

---

## SEMANA 3: Contacto + Admin

**Meta**: Sistema de mensajes + moderación básica funcional

### Lunes
- [ ] Modelo Contact:
  ```
  id, case_id, initiator_id, responder_id, 
  status (pending/active/completed), 
  contact_method (whatsapp/chat/email), 
  created_at
  ```
- [ ] Routes:
  - [ ] POST /contacts (crear contacto entre 2 usuarios)
  - [ ] GET /contacts/:id (detail)
  - [ ] GET /users/:id/contacts (mis contactos)
- [ ] Commit: "Contact model + routes"
- **Horas**: 1-2h

### Martes
- [ ] Decidir: Chat in-app o botón WhatsApp directo?
  - **Opción A (RÁPIDO)**: Generar link WhatsApp automático
    ```
    POST /contacts → return whatsapp_link = 
    "https://wa.me/54NUMERO?text=Encontré%20un%20perro..."
    ```
  - **Opción B (COMPLETO)**: Room chat simple (postpone a semana 8)
- [ ] Implementar Opción A (más rápido para MVP)
- [ ] Test link en teléfono real
- [ ] Commit: "WhatsApp contact flow"
- **Horas**: 1h

### Miércoles
- [ ] Modelo Admin (User.is_admin = boolean)
- [ ] Routes /admin/:
  - [ ] GET /admin/stats (total_cases, active_cases, users_count)
  - [ ] DELETE /admin/cases/:id (delete + reason)
  - [ ] PATCH /admin/users/:id (is_banned: true)
- [ ] Middleware: verificar is_admin en protected routes
- [ ] Commit: "Admin endpoints + authorization"
- **Horas**: 1-2h

### Jueves
- [ ] Notificaciones básicas:
  - [ ] POST /notifications/email (SendGrid direct)
  - [ ] Firebase setup (crear proyecto)
  - [ ] POST /notifications/push (Firebase FCM direct)
- [ ] Trigger emails: nuevo caso en zona, alguien contacta
- [ ] Commit: "Notifications infrastructure"
- **Horas**: 2-3h

### Viernes
- [ ] Rate limiting:
  - [ ] npm install express-rate-limit
  - [ ] 10 req/sec por IP en /cases/new (prevent spam)
  - [ ] 3 casos/hora por usuario autenticado
- [ ] Test con ApacheBench o similar
- [ ] Postman collection completada (todos endpoints)
- [ ] README actualizado con flow completo
- [ ] Commit: "Rate limiting + final API docs"
- **REVIEW**: ¿Backend es 100% funcional sin UI? SÍ? ✅ Fase 1 completa
- **Horas**: 1-2h

**SEMANA 3 TOTAL**: 8-12h  
**Síntoma éxito**: Tienes 50+ endpoints testeados en Postman, backend es "black box" útil.

---

## SEMANA 4: Frontend setup + Auth UI

**Meta**: App React funcional, puedo registrarme y loguearme

### Lunes
- [ ] Crear vite project: `npm create vite@latest -- --template react-ts`
- [ ] Instalar:
  - [ ] tailwindcss, zustand, axios, react-router-dom, leaflet, react-leaflet
- [ ] Setup tailwind + tsconfig
- [ ] Crear carpeta structure (pages, components, hooks, store, api)
- [ ] Commit: "Vite + React setup"
- **Horas**: 1-2h

### Martes
- [ ] Crear API client (axios instance):
  ```ts
  // api/client.ts
  const client = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Interceptor para agregar token
  client.interceptors.request.use(...)
  ```
- [ ] Auth store (Zustand):
  ```ts
  const useAuthStore = create((set) => ({
    token: null,
    user: null,
    login: async (email, pass) => { ... },
    register: async (data) => { ... },
    logout: () => { ... }
  }))
  ```
- [ ] Commit: "API client + auth store"
- **Horas**: 1-2h

### Miércoles
- [ ] Pages:
  - [ ] `/auth/register` → form (email, pass, phone, name)
  - [ ] `/auth/login` → form (email, pass)
  - [ ] `/auth/verify-email` → check token, redirect dashboard
- [ ] Protected route component
- [ ] Test: register + check email → verify → redirect dashboard
- [ ] Commit: "Auth pages"
- **Horas**: 2-3h

### Jueves
- [ ] Componentes reusables:
  - [ ] Button, Input, Card, Modal
  - [ ] Loader, ErrorBoundary
- [ ] App router setup (React Router)
  - [ ] Public: landing, login, register
  - [ ] Protected: dashboard, map, profile, cases
- [ ] Navbar + footer (minimal)
- [ ] Commit: "Routing + shared components"
- **Horas**: 2h

### Viernes
- [ ] Landing page (/:)
  - [ ] Hero section
  - [ ] Quick stats ("100+ animales abandonados", etc)
  - [ ] CTA "Acceder"
- [ ] 404 page
- [ ] Test flujo completo: landing → register → verify → dashboard
- [ ] Code cleanup
- [ ] Commit: "Landing + error pages"
- **REVIEW**: ¿Puedo registrarme en UI y recibir email? SÍ? ✅ Semana 4 completa
- **Horas**: 1-2h

**SEMANA 4 TOTAL**: 9-14h  
**Síntoma éxito**: Auth flow end-to-end funciona (UI + backend).

---

## SEMANA 5: Mapa + Búsqueda

**Meta**: Mapa visible con casos, filtros funcionan

### Lunes
- [ ] LeafletMap component:
  ```tsx
  <MapContainer center={[-34.6, -58.4]} zoom={11} style={{height: '100vh'}}>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {cases.map(c => <Marker position={[c.lat, c.lng]} />)}
  </MapContainer>
  ```
- [ ] Geolocation hook (get user location)
- [ ] Fit bounds al cargar
- [ ] Commit: "Basic map"
- **Horas**: 1-2h

### Martes
- [ ] Fetch nearby cases:
  ```ts
  const [cases, setCases] = useState([]);
  useEffect(() => {
    const lat = userLocation.lat;
    const lng = userLocation.lng;
    client.get(`/cases/nearby?lat=${lat}&lng=${lng}&radius=10`)
      .then(r => setCases(r.data));
  }, [userLocation])
  ```
- [ ] Marker click → modal con detalles
- [ ] Detail modal component (foto, descripción, botón contacto)
- [ ] Commit: "Map + detail modal"
- **Horas**: 2h

### Miércoles
- [ ] FilterBar component:
  ```tsx
  <select onChange={e => setAnimalType(e.target.value)}>
    <option value="">Todos</option>
    <option value="perro">Perro</option>
    <option value="gato">Gato</option>
  </select>
  <input type="range" min="1" max="50" onChange={e => setRadius(e.target.value)} />
  <button onClick={applyFilters}>Buscar</button>
  ```
- [ ] Pass filters a request: `?animal_type=perro&radius=20`
- [ ] Actualizar markers en mapa
- [ ] Commit: "Filters"
- **Horas**: 1-2h

### Jueves
- [ ] Búsqueda avanzada (página separada /cases):
  - [ ] Tabla/cards con casos
  - [ ] Sort por distancia, fecha, urgencia
  - [ ] Paginación (siguiente página)
- [ ] Test búsquedas complejas (múltiples filtros)
- [ ] Commit: "Advanced search page"
- **Horas**: 2-3h

### Viernes
- [ ] Geocoding (buscar por dirección/localidad):
  - [ ] Input "Buscar por dirección"
  - [ ] Usar Nominatim API (free, open):
    ```ts
    const geoCode = async (query) => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json`
      );
      return res.json()[0]; // {lat, lng, display_name}
    }
    ```
  - [ ] Zoom mapa a resultado
- [ ] Performance: debounce búsqueda (500ms)
- [ ] Code cleanup
- [ ] Commit: "Geocoding + debounce"
- **REVIEW**: ¿Veo casos en mapa y puedo filtrar? SÍ? ✅ Semana 5 completa
- **Horas**: 1-2h

**SEMANA 5 TOTAL**: 9-14h  
**Síntoma éxito**: Mapa muestra 20+ casos, filtros actualizan en tiempo real, no lag.

---

## SEMANA 6: Publicar caso

**Meta**: Usuario encuentra animal → puede publicarlo con fotos

### Lunes
- [ ] Cloudinary setup:
  - [ ] Crear account free tier
  - [ ] Copiar API key + secret
  - [ ] NPM: `npm install cloudinary next-cloudinary`
- [ ] Upload widget component:
  ```tsx
  <CldUploadWidget onSuccess={setImages} />
  ```
- [ ] Commit: "Cloudinary integration"
- **Horas**: 1h

### Martes-Miércoles
- [ ] Página `/cases/new`:
  - [ ] Form fields:
    - [ ] Animal type (select: perro, gato, otro)
    - [ ] Descripción (textarea)
    - [ ] Condición (select: herido, asustado, ok)
    - [ ] Ubicación (mapa click o geolocalización)
    - [ ] Imágenes (upload widget)
    - [ ] Contacto (teléfono)
  - [ ] Validación client-side (Zod o similar)
  - [ ] Submit: POST /cases (enviar al backend)
  - [ ] Success message + redirect a caso
- [ ] Commit: "Publish case form"
- **Horas**: 3-4h

### Jueves
- [ ] Dashboard page (`/dashboard`):
  - [ ] Listar mis casos (GET /users/:id/cases)
  - [ ] Card por caso: foto, estado, fecha
  - [ ] Click → detail
  - [ ] Botón "cambiar estado" → modal
- [ ] Commit: "Dashboard + my cases"
- **Horas**: 2h

### Viernes
- [ ] Testing completo:
  - [ ] Publicar caso ficticio
  - [ ] Ver en mapa
  - [ ] Editar estado
  - [ ] Ver en dashboard
- [ ] Image optimization (Cloudinary transforms)
- [ ] Code cleanup
- [ ] Commit: "Complete publish flow + testing"
- **REVIEW**: ¿Puedo publicar animal con fotos y verlo en mapa? SÍ? ✅ Semana 6 completa + puedes hacer outreach
- **Horas**: 1-2h

**SEMANA 6 TOTAL**: 10-13h  
**Síntoma éxito**: User journey end-to-end: register → publish case → see on map.

---

## SEMANA 7: Contacto + Profile

**Meta**: Voluntario puede ofrecer ayuda, sistema de reputación básico

### Lunes-Martes
- [ ] Página de perfil (`/profile/:id` o `/profile`):
  - [ ] Info usuario: nombre, foto, bio
  - [ ] Stats: # casos reportados, # casos ayudados, reputation
  - [ ] Botones: edit profile, view cases
  - [ ] Edit form: nombre, bio, zona cobertura
- [ ] Commit: "Profile page"
- **Horas**: 2-3h

### Miércoles
- [ ] Página de caso detail mejorada (`/cases/:id`):
  - [ ] Foto grande, descripción, historial
  - [ ] Botón "Yo ayudo" → crea Contact
  - [ ] POST /contacts (initiator = current user, responder = case owner)
  - [ ] Muestra link WhatsApp auto-generado
- [ ] Commit: "Offer help flow"
- **Horas**: 1-2h

### Jueves
- [ ] Mis contactos (`/contacts`):
  - [ ] Listar todos mis contactos (como initiator o responder)
  - [ ] Card por contacto: nombre, caso, estado, link WhatsApp
  - [ ] Click → detalles
- [ ] Commit: "Contacts page"
- **Horas**: 1h

### Viernes
- [ ] Notificaciones bell:
  - [ ] Simple counter (# nuevos contactos no leídos)
  - [ ] Dropdown con últimas notificaciones
  - [ ] Click → mark as read
  - [ ] (Frontend solo, backend le dirá datos)
- [ ] Code cleanup
- [ ] Commit: "Notifications UI (frontend)"
- **REVIEW**: ¿Puedo ser voluntario y contactar a reportador? SÍ? ✅ Semana 7 completa
- **Horas**: 1-2h

**SEMANA 7 TOTAL**: 7-10h  
**Síntoma éxito**: Flujo completo: encontré animal → voluntario lo ve → ofrece ayuda → contactan.

---

## SEMANA 8-9: App móvil (React Native)

**Meta**: App funcional en Expo, mismo flujo que web

### Semana 8: Setup + Auth

Lunes-Martes:
- [ ] Expo setup: `npx create-expo-app rescue-app`
- [ ] Install: expo-router, axios, zustand, react-native-geolocation-service
- [ ] Project structure (app/, src/)
- [ ] Auth store (copiar de web)
- [ ] Commit: "Expo setup"
- **Horas**: 2h

Miércoles-Jueves:
- [ ] Screens:
  - [ ] /auth/login.tsx
  - [ ] /auth/register.tsx
  - [ ] Shared login flow
- [ ] Commit: "Auth screens"
- **Horas**: 2-3h

Viernes:
- [ ] Bottom tab navigator:
  - [ ] Map tab (placeholder)
  - [ ] Cases tab (placeholder)
  - [ ] Profile tab (placeholder)
  - [ ] Contacts tab (placeholder)
- [ ] Navigation working
- [ ] Commit: "Navigation setup"
- **Horas**: 1h

### Semana 9: Core features

Lunes-Martes:
- [ ] Map screen (usando react-native-maps):
  - [ ] Fetch nearby cases
  - [ ] Render markers
  - [ ] Tap marker → modal
- [ ] Commit: "Map screen"
- **Horas**: 2-3h

Miércoles-Jueves:
- [ ] Cases screen:
  - [ ] List nearby cases
  - [ ] Filtros básicos
  - [ ] Tap → detail
- [ ] Profile screen:
  - [ ] GET /users/:id
  - [ ] Edit form
- [ ] Commit: "Cases + Profile screens"
- **Horas**: 2-3h

Viernes:
- [ ] Contacts screen
- [ ] Publish case modal (camera + upload)
- [ ] Push notifications setup (Firebase)
- [ ] Test en device físico (o emulator)
- [ ] Commit: "Mobile MVP complete"
- **REVIEW**: ¿App es 80% funcional? SÍ? ✅ Fase 3 completa
- **Horas**: 2h

**SEMANA 8-9 TOTAL**: 12-16h

---

## SEMANA 10: Testing + Performance

**Meta**: Cero bugs críticos, app no lag

### Lunes-Martes: QA Manual
- [ ] Flujo completo (register → publish → contact → resolve)
- [ ] Mobile + web (todos devices)
- [ ] Casos edge: email taken, permisos denied, network error
- [ ] Crear bug spreadsheet (Severity 1-3)

### Miércoles: Performance
- [ ] Frontend bundle size (Vite build → analyze)
- [ ] Image optimization (Cloudinary)
- [ ] API response times (test con 1000 casos)
- [ ] Mobile app size

### Jueves: Security
- [ ] Rate limiting test
- [ ] Input validation (SQL injection, XSS)
- [ ] CORS test
- [ ] JWT expiration

### Viernes
- [ ] Todos bugs Severity 1 fixed
- [ ] Code review
- [ ] Docs actualizado
- [ ] Final commit

**SEMANA 10 TOTAL**: 12h

---

## SEMANA 11: Deploy + Launch

### Lunes
- [ ] Deploy backend: Railway o DigitalOcean
- [ ] Deploy web: Vercel (automático)
- [ ] Setup PostgreSQL Render

### Martes
- [ ] Setup Sentry (error tracking)
- [ ] Setup monitoring (uptime)
- [ ] Logs centralizados

### Miércoles-Jueves
- [ ] Expo build (TestFlight + Google Play internal)
- [ ] App Store Connect setup
- [ ] Android keystore

### Viernes
- [ ] Beta testing link público
- [ ] Outreach masivo email
- [ ] WhatsApp grupo beta test
- [ ] Monitoreo en tiempo real (primeras 24h)

---

## PLANTILLA CHECKLIST DIARIO

```
# [SEMANA N - DÍA X] [FECHA]

## Qué hice ayer
- [ ] Lista de commits

## Plan hoy (máx 3 tareas)
- [ ] Tarea A (est 2h)
- [ ] Tarea B (est 1.5h)
- [ ] Tarea C (est 1h)

## Bloqueadores
- Ninguno / El problema X

## Commits
- [ ] Commit 1
- [ ] Commit 2

## Notas
- Insight, decisión, o cosa para recordar

---

**FIN DEL DÍA CHECKLIST**:
- [ ] Commits pusheados a GitHub
- [ ] README actualizado
- [ ] 0 console.logs de debug
- [ ] Ningún código comentado (o hay razón)
```

---

## MÉTRICAS GLOBALES (Track semanal)

```
| Semana | Features | Bugs | Horas | Status |
|--------|----------|------|-------|--------|
| 1 | Auth | 2 | 12h | ✅ |
| 2 | Cases DB | 1 | 11h | ✅ |
| 3 | Contact | 3 | 10h | ✅ |
| 4 | Auth UI | 4 | 12h | ✅ |
| 5 | Map | 2 | 11h | ✅ |
| 6 | Publish | 5 | 12h | ✅ |
| 7 | Profile | 2 | 8h | ✅ |
| 8-9 | Mobile | 8 | 14h | ✅ |
| 10 | Testing | - | 12h | ✅ |
| 11 | Deploy | - | 12h | ✅ |
| TOTAL | - | ~30 | 114h | ✅ |
```

---

## SIGNAL DE ALERTA

🚨 Si pasa esto, replantea:

| Señal | Acción |
|-------|--------|
| Llevás 3 semanas en semana 2 | Reduce scope (ej: saltate geolocation avanzada) |
| Más de 10 bugs por semana | Pause features, fix bugs primero |
| Working > 8h diarios | Burnout incoming. Descansa, prioriza crítico |
| Feature toma 2x tiempo estimado | Lo entiendes mal. Pedir ayuda o postpone |
| Cero feedback externo (semana 6+) | Outreach no está funcionando. Pivota strategy |

---

## TEMPLATE PARA GITHUB

Crear en /docs/DEVELOPMENT.md:

```markdown
# Development Timeline

## Current Week: Week N

**Objective**: [Main goal]
**Status**: [On track / At risk / Behind]

### Completed
- ✅ Feature A
- ✅ Feature B

### In Progress
- 🔄 Feature C (75%)

### Blockers
- None

### Metrics
- Lines of code: X
- Test coverage: Y%
- Open bugs: Z

---
```

Actualizar cada viernes 5pm.

---

**¡Éxito! Vamos a hacerlo 🚀**
