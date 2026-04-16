# Plan MVP: Aplicación de Rescate de Animales - Argentina

**Restricciones**: 1 full-stack developer, <$5k presupuesto, 3-4 meses, sin usuarios iniciales  
**Scope nacional**: Todo Argentina (pero densidad inicial CABA + GBA)

---

## I. ARQUITECTURA FINAL (en 3-4 meses)

### Stack elegido (optimizado para 1 developer + presupuesto bajo)

```
BACKEND
├── Node.js + Express (TypeScript)
├── PostgreSQL (Render: free tier → $7/mes full tier)
├── Sequelize ORM
├── JWT auth
└── Redis (Bull queues para emails/images)

FRONTEND WEB
├── React 18 + Vite
├── TypeScript
├── Zustand (state)
├── Leaflet + OpenStreetMap
├── Tailwind CSS
└── Vercel (FREE deploy)

APP MÓVIL
├── React Native + Expo
├── Share 70% código con React
└── Expo EAS Build (free tier basic)

INFRAESTRUCTURA (presupuesto <$5k/3 meses)
├── Vercel: $0 (web frontend)
├── Render.com: $7/mes (PostgreSQL managed)
├── Railway.app: $5/mes (Node.js backend, free tier starter)
├── Cloudinary: $0 (free 25GB, images)
├── Firebase: $0 (FCM push notifications)
├── SendGrid: $0 (12k emails/mes free)
├── Cloudflare: $0 (DNS, DDoS protection)
└── TOTAL MENSUAL: ~$12/mes = $36/3 meses (deja $4,964 para urgencias/upgrades)
```

---

## II. PLAN DE EJECUCIÓN POR FASE

### FASE 1: Core Backend (Semanas 1-3) = ~120 horas

**Objetivo**: API funcional sin UI, lista para testing manual

#### Semana 1: Setup + Auth
- Inicializar proyecto Node + TypeScript
- Setup PostgreSQL (Render free tier)
- Migrations iniciales (users, cases, contacts)
- JWT auth (register, login, refresh)
- Email verification (SendGrid)
- Postman collection para testing

**Deliverables**:
```
POST /auth/register
POST /auth/login
POST /auth/refresh
GET /auth/verify-email/:token
```

#### Semana 2: Data Model + Geolocalización
- Tablas: users, cases, case_updates, contacts, ratings
- PostGIS setup (geo queries)
- CRUD para casos (create, read, update, delete)
- Búsqueda geoespacial (casos en radio X km)
- Filtros: tipo animal, estado, fecha

**Deliverables**:
```
POST /cases (publicar caso)
GET /cases (listar con filtros)
GET /cases/nearby?lat=X&lng=Y&radius=5
GET /cases/:id
PATCH /cases/:id (cambiar estado)
GET /cases/:id/history (actualizaciones)
```

#### Semana 3: Contacto + Notificaciones
- Sistema de mensajes (chat simple o botón WhatsApp)
- Notificaciones por email (SendGrid)
- Setup Firebase para push notifications
- Rate limiting (no spam)
- Admin endpoints (ban user, delete case)

**Deliverables**:
```
POST /contacts (reportador + voluntario se contactan)
GET /contacts/:userId (historial)
POST /notifications/send-email
POST /notifications/send-push
POST /admin/users/:id/ban
DELETE /admin/cases/:id
```

---

### FASE 2: Frontend Web (Semanas 4-6) = ~100 horas

**Objetivo**: UI funcional, mapa visible, primeros usuarios pueden reportar

#### Semana 4: Setup + Auth UI
- Vite + React setup
- Tailwind CSS setup
- Auth flow (register, login, email verify)
- Protected routes
- Zustand state management

**Pantallas**:
- `/` - Landing
- `/auth/register` - Registro
- `/auth/login` - Login
- `/auth/verify-email` - Verificación
- `/dashboard` - Redirect to map o profile

#### Semana 5: Mapa + Listado
- Leaflet integration
- Mapa de Argentina con markers
- Filtros (radio, tipo, estado)
- Listado de casos (tabla / cards)
- Detail modal (click marker → detalles)
- Búsqueda por dirección (Nominatim geocoding, free)

**Pantallas**:
- `/map` - Mapa principal
- `/cases` - Listado avanzado
- `/cases/:id` - Detalles caso
- `/profile` - Perfil usuario

#### Semana 6: Publicar + Contacto
- Formulario "Publicar caso" (fotos + datos)
- Upload de imágenes (Cloudinary API)
- Botón contacto (WhatsApp o chat)
- Historial de casos del usuario
- Notificaciones bell (UI placeholder)

**Pantallas**:
- `/cases/new` - Publicar caso
- `/dashboard` - Mis casos
- `/contacts` - Mis contactos

---

### FASE 3: App Móvil (Semanas 7-8) = ~80 horas

**Objetivo**: App funcional en iOS + Android, mismo flujo que web

#### Semana 7: Setup + Core screens
- Expo setup
- Auth (login/register, reutilizar API backend)
- Stack navigation
- Bottom tab navigator (Map, Cases, Profile, Contacts)
- Leaflet map en React Native (react-native-maps)

#### Semana 8: Features
- Publicar caso (camera roll + cámara)
- Listar casos cercanos (geolocalización)
- Contactar voluntario (WhatsApp intent)
- Push notifications (Firebase)
- Deep linking (link a caso específico)

---

### FASE 4: Polish + Launch (Semanas 9-11) = ~80 horas

#### Semana 9: Testing + Bug fixes
- Manual QA (probar flujos end-to-end)
- Load testing (casos, búsqueda)
- Mobile testing (iOS/Android)
- Cross-browser testing (web)

#### Semana 10: Performance + Security
- Imagen optimization (Cloudinary)
- Caché estratégico (5min casos, 1h usuarios)
- CORS config correcto
- Rate limiting: 10 req/sec por IP, 3 casos/hora por usuario
- Input sanitization (XSS prevention)
- SQL injection prevention (Sequelize parameterized queries)

#### Semana 11: Deploy + Monitoring
- Deploy web (Vercel - automático con git)
- Deploy backend (Railway o DigitalOcean App Platform)
- Deploy app (Expo EAS Build - TestFlight + Google Play internal testing)
- Setup Sentry (error tracking, free tier)
- Setup uptime monitoring (Betteruptime free)
- Documentation (README, API docs con Swagger)

---

## III. ESTRUCTURA DE CARPETAS

```
rescue-app/
├── backend/                          # Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts              # POST /auth/register, login, refresh
│   │   │   ├── cases.ts             # CRUD cases, geolocalización
│   │   │   ├── contacts.ts          # POST contacto, historial
│   │   │   ├── users.ts             # GET/PATCH profile
│   │   │   └── admin.ts             # Ban, delete, stats
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Case.ts
│   │   │   ├── Contact.ts
│   │   │   └── CaseUpdate.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verify
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimit.ts
│   │   ├── services/
│   │   │   ├── emailService.ts      # SendGrid
│   │   │   ├── notificationService.ts # Firebase
│   │   │   ├── geoService.ts        # PostGIS queries
│   │   │   └── imageService.ts      # Cloudinary
│   │   ├── utils/
│   │   │   ├── validators.ts
│   │   │   └── helpers.ts
│   │   ├── migrations/              # Sequelize migrations
│   │   └── app.ts                   # Express setup
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── web/                              # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth.tsx
│   │   │   ├── Map.tsx
│   │   │   ├── Cases.tsx
│   │   │   ├── CaseDetail.tsx
│   │   │   ├── PublishCase.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Profile.tsx
│   │   ├── components/
│   │   │   ├── MapComponent.tsx
│   │   │   ├── CaseCard.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── NavBar.tsx
│   │   │   └── Modal.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useCases.ts
│   │   │   └── useLocation.ts
│   │   ├── store/                   # Zustand
│   │   │   ├── authStore.ts
│   │   │   ├── caseStore.ts
│   │   │   └── uiStore.ts
│   │   ├── api/
│   │   │   └── client.ts            # Axios instance + endpoints
│   │   ├── styles/
│   │   │   └── globals.css          # Tailwind
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── mobile/                           # React Native + Expo
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── map.tsx
│   │   │   ├── cases.tsx
│   │   │   ├── profile.tsx
│   │   │   └── contacts.tsx
│   │   ├── case/
│   │   │   ├── [id].tsx             # Detail
│   │   │   └── new.tsx              # Publish
│   │   ├── _layout.tsx              # Root layout
│   │   └── index.tsx                # Entry
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useLocation.ts
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── store/
│   │       └── authStore.ts
│   ├── app.json (Expo config)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── docs/
    ├── API.md                       # Swagger / OpenAPI
    ├── DATABASE.md                  # ER diagram
    ├── SETUP.md                     # Dev environment
    └── DEPLOYMENT.md                # Step-by-step deploy
```

---

## IV. SCHEMA DE BASE DE DATOS

```sql
-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  name VARCHAR(100),
  avatar_url VARCHAR(500),
  bio TEXT,
  location GEOMETRY(Point, 4326),  -- PostGIS para geolocalización
  coverage_radius_km INT DEFAULT 10,
  experience_types TEXT[],  -- ["perros", "gatos", "otros"]
  reputation_score INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CASES (animales abandonados)
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  animal_type VARCHAR(50),  -- perro, gato, otro
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'abierto',  -- abierto, contactado, resuelto, spam
  urgency_level INT DEFAULT 1,  -- 1-5 (5 = crítico)
  location GEOMETRY(Point, 4326) NOT NULL,
  location_text VARCHAR(255),  -- "Caballito, CABA"
  images JSONB,  -- [{url, cloudinary_id}, ...]
  condition VARCHAR(100),  -- herido, asustado, ok
  phone_contact VARCHAR(20),
  whatsapp_link VARCHAR(500),  -- auto-generated
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- CASE_UPDATES (historial de cambios)
CREATE TABLE case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  update_type VARCHAR(50),  -- status_change, comment, photo_added
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CONTACTS (cuando voluntario contacta reportador)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  initiator_id UUID NOT NULL REFERENCES users(id),  -- quién se ofrece
  responder_id UUID NOT NULL REFERENCES users(id),  -- quién reportó
  status VARCHAR(50) DEFAULT 'pending',  -- pending, active, completed
  contact_method VARCHAR(50),  -- whatsapp, chat, email
  message TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices críticos
CREATE INDEX idx_cases_location ON cases USING GIST(location);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX idx_users_email ON users(email);
```

---

## V. ENDPOINTS MVP (API REST)

### Auth
```
POST   /api/auth/register              { email, password, phone, name } → token
POST   /api/auth/login                 { email, password } → token + refresh
POST   /api/auth/refresh               { refresh_token } → token
GET    /api/auth/verify-email/:token   → success
```

### Cases
```
POST   /api/cases                       { description, animal_type, images, location }
GET    /api/cases                       ?lat=X&lng=Y&radius=10&status=abierto → [cases]
GET    /api/cases/:id                   → case detail + update history
PATCH  /api/cases/:id                   { status, urgency_level }
DELETE /api/cases/:id                   (solo owner o admin)

GET    /api/cases/search                ?q=descripción → full-text search
GET    /api/cases/nearby                ?lat=X&lng=Y → top 20 cercanos
```

### Users
```
GET    /api/users/:id                   → public profile
PATCH  /api/users/:id                   { name, bio, avatar, coverage_radius }
GET    /api/users/:id/cases             → casos publicados by user
GET    /api/users/:id/contacts          → contactos activos
```

### Contacts
```
POST   /api/contacts                    { case_id, initiator_id, contact_method } → create contact
GET    /api/contacts/:id                → detail + last messages
PATCH  /api/contacts/:id                { status }
```

### Notifications
```
POST   /api/notifications/email         { user_id, type, data }
POST   /api/notifications/push          { user_id, title, body }
```

### Admin
```
GET    /api/admin/stats                 → { total_cases, active_cases, users_count }
DELETE /api/admin/cases/:id             { reason }
PATCH  /api/admin/users/:id             { is_banned: true }
GET    /api/admin/reports               → list de casos reportados
```

---

## VI. GO-TO-MARKET: Conseguir primeros 50 usuarios

### Semana 11 (antes de launch)

**1. Crear lista de 100 ONGs + refugios Argentina**
```
- Buscar en Google: "refugio animales CABA", "ONG rescate perros Argentina"
- Crear spreadsheet con: nombre, contacto, email, WhatsApp
- Focus: CABA, GBA, Córdoba, Rosario (ciudades grandes)
```

**2. Outreach email** (personalizado, no spam)
```
Asunto: "Herramienta para visibilizar animales abandonados (beta testing)"

Cuerpo (template):
Hola [Nombre ONG],

Somos [Tu nombre], developer trabajando en una aplicación para Argentina 
que centraliza reportes de animales abandonados en un mapa en tiempo real.

Idea: voluntarios y ONGs como ustedes pueden:
- Ver todos los casos en su zona (sin spam de redes sociales)
- Contactar directo con quien encontró el animal
- Publicar animales en adopción / tránsito

Beta testing: Ofrecemos acceso gratis + roles de moderador para ONGs clave.

¿Interesados en ayudar? Necesitamos 5-10 voluntarios/ONGs para feedback inicial.

Link: [landing page]
WhatsApp: [tu número]

Gracias,
[Nombre]
```

**3. Landing page minimalista**
```
Hero section:
- Título: "Rescate de animales abandonados - Argentina"
- Subtítulo: "Centraliza reportes en un mapa. Conecta voluntarios."
- CTA grande: "Acceder a beta testing"

Section 2: Problema
- "100+ animales abandonados diariamente en Argentina"
- "ONGs descoordinadas = rescates se pierden"

Section 3: Solución
- Mapa en tiempo real
- Contacto directo
- Historial de casos

Section 4: Beta signup
- Email input
- "¿Eres voluntario / ONG / persona que encontró animal?"
- Submit → Slack notification

Tech: Single HTML page (Vercel) o landing builder (Carrd)
```

**4. Grupos de WhatsApp + Telegram**
- Crear grupo privado: "Beta Testing - Rescate Animales"
- Invitar a 10-15 ONGs + voluntarios iniciales
- Enviar updates diarios
- Feedback en tiempo real

**5. Social media (Instagram)**
```
Post 1: "Problema"
"¿Qué pasa cuando encuentras un animal en la calle?
🐕 Lo reportas en redes? Se pierde entre 100k posts
🐱 Llamas a ONGs? No saben cuál te atiende
🆘 Resultado: Animal desaparece

¿Qué si todo fuera en UNA app?"

Post 2: "Solución"
"Mapa en tiempo real + contacto directo
Beta testing abierto
Link en bio → [landing]"

Post 3: "Stories de ONGs"
Contactar 5-10 ONGs, pedir testimonial corto
"Somos [ONG X], rescatamos animales y esto nos simplifica el trabajo"

Hashtags: #RescateAnimalesArg #AnimalesAbandonados #VoluntariadoArg
```

**6. Estrategia de launch day**
```
Día 1:
- Enviar email a 100 ONGs
- Post en Instagram
- Mensaje en Telegram grupos rescatistas
- Tweet/X si tienes followers

Día 1-3:
- Responder todos los mensajes rápido (< 2 horas)
- Onboarding personal: call de 10min con cada ONG
- Recopilar feedback
- Fix bugs urgentes

Meta: 50 usuarios en semana 1
```

---

## VII. COSTOS ESTIMADOS (3 meses)

| Servicio | Costo | Notas |
|----------|-------|-------|
| Render PostgreSQL | $7/mes | Free tier → $7 upgrade (crece con datos) |
| Railway Backend | $5/mes | Free tier tiene CPU limitada; $5 = safe |
| Vercel Frontend | $0 | Free con límite generoso |
| Cloudinary Images | $0 | Free 25GB, suficiente MVP |
| Firebase | $0 | Free FCM push notifications |
| SendGrid Emails | $0 | 12k/mes free (suficiente) |
| Expo Build | $0 | Free tier basic builds |
| Dominio | $10/año | .com o .com.ar (divide en 3 meses: ~$0.83) |
| **TOTAL 3 MESES** | **~$50** | Casi gratis, puro dinero en contingency |

**Deja ~$4,950 para**:
- Upgrade servers si escala rápido
- Storage extra Cloudinary si suben 1000+ imágenes
- Herramientas dev (Sentry pro, testing tools)
- Emergencias / consultoría puntual

---

## VIII. MILESTONES Y TIMEFRAME REALISTA

```
SEMANA 1-3 (Backend core)
✓ Auth + API ready
✓ Postman collection funcional
⏱ Deadline: backend 100% testeable sin UI

SEMANA 4-6 (Web frontend)
✓ Mapa funcional
✓ Primeras 10-20 pantallas
✓ Login + publish caso
⏱ Deadline: web usable, feature complete

SEMANA 7-8 (Mobile app)
✓ App básica en Expo
✓ Same features que web
✓ Push notifications
⏱ Deadline: alpha build para testers

SEMANA 9-10 (Testing + optimization)
✓ QA manual end-to-end
✓ Performance tunning
✓ Security hardening
⏱ Deadline: producción ready

SEMANA 11 (Launch)
✓ Deploy todo
✓ Outreach a 100 ONGs
✓ 50+ users activos
⏱ Deadline: beta testing abierto

SEMANA 12+ (Post-launch)
- Feedback loop rápido (daily)
- Bugs críticos fix en < 24h
- Feature requests para v2
```

---

## IX. RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-----------|
| Schema DB crece desordenado | Alta | Medio | Crear migrations desde día 1, versionar |
| Geolocalización lenta en datos grandes | Media | Bajo | PostGIS índices, testing temprano |
| Solo tú → burnout | Alta | Crítico | Timeboxing: 6h/día max; sábados OFF |
| Primeros usuarios no llegan | Alta | Crítico | Outreach ONGs ANTES de código, validar demanda |
| Auth issues / token expiración bugs | Media | Crítico | Test auth flow exhaustivamente semana 1 |
| Deploy fail día 1 | Media | Crítico | Runbook de deployment, testing en staging |
| Mobile app review delays | Media | Bajo | Enviar TestFlight desde semana 10, no esperar |

---

## X. PRÓXIMOS PASOS

1. **Hoy**: 
   - [ ] Crear GitHub repo (private o public)
   - [ ] Setup Node.js + postgres local
   - [ ] Primera migration vacía (test pipeline)

2. **Esta semana**:
   - [ ] Crear spreadsheet de 100 ONGs Argentina
   - [ ] Draft landing page copy
   - [ ] Setup Render + Railway (accounts)

3. **Semana 1 desarrollo**:
   - [ ] Auth API completa
   - [ ] Postman collection
   - [ ] PostgreSQL migrations

4. **Feedback inicial**:
   - [ ] Contactar 5 ONGs pequeñas (no esperar MVP)
   - [ ] Mostrar wireframes o prototype
   - [ ] Validar: ¿realmente necesitan esto?

---

## XI. RECURSOS ÚTILES

### Documentación
- [Sequelize ORM](https://sequelize.org/)
- [PostGIS Quick Start](https://postgis.net/workshops/postgis-intro/introduction.html)
- [Leaflet.js](https://leafletjs.com/)
- [React Native Geolocation](https://react-native-geolocation-service.github.io/react-native-geolocation-service/)
- [Expo + Firebase](https://docs.expo.dev/build-reference/notifications-config/)

### Boilerplates (speed up)
- `create-vite` → React template
- `express-generator` → Express template
- `expo init` → React Native template

### APIs de terceros
- [SendGrid Python SDK](https://github.com/sendgrid/sendgrid-nodejs)
- [Cloudinary SDK](https://cloudinary.com/documentation)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

### Testing
- Backend: Jest + Supertest
- Frontend: Vitest + Testing Library
- E2E: Playwright (opcional para MVP, pero útil)

---

## XII. CHECKLIST PRE-LAUNCH

### Seguridad
- [ ] Passwords hashed (bcrypt, >= 10 rounds)
- [ ] CORS configured (solo tu dominio)
- [ ] Rate limiting en todos endpoints (prevent spam/DOS)
- [ ] SQL injection prevention (Sequelize parameterized)
- [ ] XSS prevention (Helmet.js middleware)
- [ ] HTTPS enforced (auto con Vercel + Railway)
- [ ] Secrets en .env (no hardcoded)
- [ ] JWT refresh token rotation

### Performance
- [ ] Database indexes en queries frecuentes
- [ ] API response < 500ms (p95)
- [ ] Images optimized (Cloudinary transforms)
- [ ] Frontend bundle size < 500KB (initial load)
- [ ] Lazy load routes en React
- [ ] Caché header en backend (5min casos)

### Mobile
- [ ] TestFlight build enviado (semana 10)
- [ ] iOS provisioning profile setup
- [ ] Android keystore configured
- [ ] Deep linking funcionando
- [ ] Location permission requests tested

### Monitoring
- [ ] Sentry project created (error tracking)
- [ ] Uptime monitoring (Betteruptime)
- [ ] Logs centralizados (Railway o Vercel logs)
- [ ] Alert emails si error rate > 1%

### Docs
- [ ] README.md con setup instructions
- [ ] API docs (Swagger o Postman export)
- [ ] Environment variables documented
- [ ] Deployment guide step-by-step

---

## XIII. DESPUÉS DEL MVP: Road a v1.1+

(No hagas ahora, pero planifica)

**Semana 12-14 (Post-launch)**
- Chat in-app (reemplaza WhatsApp si users lo piden)
- Sistema de reputación (badges, ratings)
- Módulo ONGs (crear perfil, certificación)
- Analytics dashboard (admin)

**v1.5 (Mes 2 desde launch)**
- Integración con redes sociales (share caso a Instagram)
- Sistema de adopción (mascotas disponibles)
- Notificaciones inteligentes (ML: sugerir casos por zona/tipo)

**v2 (3 meses desde launch)**
- Módulo comunidad de mascotas (presume tu mascota)
- Monetización: tier premium, sponsor brands
- Gamificación (leaderboards, desafíos)

---

**Última nota**: 
Este plan es conservador a propósito. Sí es viable en 3-4 meses solo. 
La clave es disciplina + no perfectionism (MVP ≠ perfecto, MVP = útil).

Buena suerte. Este proyecto tiene potencial real de impacto social.
