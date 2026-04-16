# RESUMEN EJECUTIVO: Rescate de Animales Argentina MVP

**Objetivo**: Aplicación funcional (web + mobile) en 3-4 meses, solo, <$5k presupuesto, 0 usuarios iniciales.

---

## ¿QUÉ ES?

Plataforma nacional donde:
- Alguien encuentra un animal abandonado → **publica en mapa con foto + ubicación**
- Voluntarios cercanos lo ven **en tiempo real**
- Contacto directo **en 5 segundos** (WhatsApp)
- Historial de cada caso (abierto → resuelto)

**Impacto**: Conecta oferta (voluntarios) + demanda (animales) sin intermediarios.

---

## POR QUÉ VIABLE (solo + presupuesto bajo)

| Aspecto | Ventaja |
|--------|---------|
| **Tech stack** | Node + React + PostgreSQL + Expo (ecosystem maduro, muchos tutoriales) |
| **Hosting** | Vercel (free), Railway ($5/mes), Render ($7/mes) = $12/mes total |
| **Imágenes** | Cloudinary free (25GB) |
| **Emails** | SendGrid free (12k/mes) |
| **Arquitectura** | Monolith simple, sin microservicios complejos |
| **MVP scope** | Mapa + filtros + contacto directo (0 features fancy) |

**Total 3 meses**: ~$36 hosting + $4,964 contingency = viable.

---

## PLAN 3-4 MESES (11 semanas)

### Fase 1: Backend (Semanas 1-3) ⚙️

**Semana 1-3: Auth + Cases API**
- ✅ JWT auth (register, login, refresh)
- ✅ Modelos: User, Case, Contact, CaseUpdate
- ✅ Geolocalización con PostGIS
- ✅ Búsqueda por ubicación (radio X km)
- ✅ Admin endpoints (ban, delete, stats)
- ✅ Email verification, push notifications, rate limiting

**Output**: Backend 100% testeable con Postman, 0 UI.

**Horas**: ~30h  
**Status**: Backend es "black box" práctico para teams.

---

### Fase 2: Frontend Web (Semanas 4-6) 🌐

**Semana 4-6: React + Mapa**
- ✅ Auth flow (register, login, verify email)
- ✅ Mapa Leaflet (marcadores, clusters, filtros)
- ✅ Formulario "Publicar caso" (fotos + Cloudinary)
- ✅ Búsqueda avanzada (tablas, paginación)
- ✅ Dashboard (mis casos, mis contactos)
- ✅ Perfil usuario + reputación

**Output**: Web funcional, puedes publicar y contactar.

**Horas**: ~30h  
**Status**: 100% feature-complete para MVP.

---

### Fase 3: App Móvil (Semanas 7-9) 📱

**Semana 7-9: React Native + Expo**
- ✅ Same features que web (map, search, publish)
- ✅ Geolocalización nativa
- ✅ Camera + foto upload
- ✅ Push notifications (Firebase)
- ✅ Share 70% código con React web

**Output**: App en TestFlight + Google Play (beta).

**Horas**: ~25h  
**Status**: Alpha, pero usable.

---

### Fase 4: Polish + Launch (Semanas 10-11) 🚀

**Semana 10: Testing QA**
- Manual testing (todos flujos)
- Bugs críticos fix (lista: severity 1-3)
- Performance optimization
- Security hardening

**Semana 11: Deploy + Outreach**
- Backend en Railway
- Frontend en Vercel (automático)
- App TestFlight/Play (internal testing)
- Outreach a 100 ONGs
- **Meta: 50+ usuarios activos en week 1**

**Horas**: ~25h

---

## TIMELINE VISUAL

```
SEMANA  1  2  3 | 4  5  6 | 7  8  9 | 10 11
        |--------|         |---------| <- Backend ready
                  |--------|        | <- Web ready
                           |--------|  <- Mobile ready
                                    |-----| <- Testing & Launch
```

---

## BUDGET (3 meses)

| Item | Costo |
|------|-------|
| Render (PostgreSQL) | $7/mes = $21 total |
| Railway (Backend) | $5/mes = $15 total |
| Vercel (Frontend) | $0 |
| Cloudinary | $0 (free 25GB) |
| Firebase | $0 |
| SendGrid | $0 (12k emails/mes free) |
| Domain | $10/año ÷ 3 = $3.33 |
| **TOTAL** | **~$56** |

**Sobra**: $4,944 para emergencias, upgrades, herramientas.

---

## GO-TO-MARKET: Cero usuarios → 50

**Estrategia**: Contacta ONGs ANTES de código listo.

| Semana | Acción | Output |
|--------|--------|--------|
| 6 | Landing + primer batch emails (20 ONGs) | 2-3 respuestas |
| 7 | Grupo WhatsApp privado (beta testers) | 10-15 en grupo |
| 8-9 | Feedback loop, calls 1:1, iteración rápida | Features validadas |
| 10 | Push final, invitaciones públicas | 40-50 testers activos |
| 11 | Launch público, viralización | 50+ users week 1 |

**Clave**: No esperes producto perfecto. Valida con ONGs desde semana 6.

---

## ARQUITECTURA FINAL

```
┌─────────────────────────────────────────────────────┐
│ USUARIOS: Voluntarios + ONGs + Personas que encuentran │
└──────┬──────────────────────────────────┬───────────┘
       │                                  │
    ┌──▼────────┐                 ┌──────▼──┐
    │ Web (Vite)│                 │ Mobile  │
    │  React    │                 │ Expo RN │
    └──┬────────┘                 └──┬──────┘
       │                            │
       └──────────────┬─────────────┘
                      │
              ┌───────▼────────┐
              │  API Gateway   │
              │  (Express.js)  │
              └───────┬────────┘
          │           │           │
    ┌─────▼────┐  ┌──▼────┐  ┌──▼─────┐
    │ PostgreSQL│ │Firebase│ │SendGrid │
    │ + PostGIS │ │  FCM   │ │  Email  │
    └───────────┘ └────────┘ └─────────┘
```

---

## RIESGOS + MITIGACIÓN

| Riesgo | Probabilidad | Mitiga |
|--------|--------------|--------|
| Burnout (solo 11 semanas) | Alta | Timeboxing 6h/día, sábados OFF |
| Usuarios no llegan | Alta | **Outreach ONGs semana 6** (antes de MVP) |
| Bugs en producción | Media | QA manual exhaustivo semana 10 |
| Geolocation lenta con datos grandes | Media | PostGIS indexes día 1 |
| Solo tú = no escalable | NA | OK para MVP. Escala después. |

---

## QUÉ HACER HOY (ESTA SEMANA)

### ✅ Antes de escribir código:

1. **[ ] Crear repo GitHub** (README minimal)
   ```
   # Rescate de animales Argentina
   
   ## Objetivo
   Plataforma nacional para visibilizar animales abandonados.
   
   ## Stack
   Node + React + PostgreSQL + React Native
   
   ## Timeline
   3-4 meses MVP
   ```

2. **[ ] Crear spreadsheet de 100 ONGs Argentina**
   - Buscar: "refugio animales CABA", "rescate perros Argentina"
   - Columns: Nombre, contacto, email, WhatsApp, reach, status
   - Prioridad: CABA, GBA, Córdoba, Rosario

3. **[ ] Setup accounts (free):**
   - [ ] PostgreSQL managed (Render.com)
   - [ ] Railway.app (hosting Node)
   - [ ] Firebase (push notifications)
   - [ ] Cloudinary (image storage)
   - [ ] SendGrid (emails)
   - [ ] Vercel (frontend hosting)

4. **[ ] Draft landing page copy** (30 min)
   - Hero: "Rescate de animales en mapa real-time"
   - Problema + Solución
   - Beta signup CTA

5. **[ ] Setup dev environment local**
   ```bash
   # Node + npm
   node -v  # v18+
   npm init
   
   # PostgreSQL local (o usa Docker)
   docker run --name postgres -e POSTGRES_PASSWORD=password -d postgres
   ```

### 📝 Esta semana: Semana 1 checklist

Lunes-Viernes:
- Auth API completa (register, login, refresh)
- PostgreSQL + User model
- JWT tokens
- Email verification (SendGrid)
- Postman collection (testeable)

---

## CHECKLIST PRE-LAUNCH (Semana 11)

Antes de publicar a usuarios reales:

- [ ] ✅ Passwords hashed (bcrypt)
- [ ] ✅ CORS configured
- [ ] ✅ Rate limiting
- [ ] ✅ SQL injection prevention
- [ ] ✅ XSS protection (Helmet.js)
- [ ] ✅ API < 500ms response (p95)
- [ ] ✅ Mobile app TestFlight ready
- [ ] ✅ Sentry error tracking
- [ ] ✅ Uptime monitoring
- [ ] ✅ Documentation complete

---

## MÉTRICAS ÉXITO MVP

| Métrica | Target |
|---------|--------|
| Usuarios semana 1 | 50+ |
| Casos publicados | 100+ |
| Contact rate | 80% (caso contactado en 24h) |
| API response | < 200ms (p50), < 500ms (p95) |
| App crashes | 0 blocker bugs |
| Uptime | 99.9% |

---

## RECURSOS DOCUMENTACIÓN

En los archivos adjuntos tienes:

1. **PLAN_MVP_RESCATE_ANIMALES.md** (completo)
   - Stack técnico detallado
   - Schema BD + endpoints API
   - Infraestructura + costos

2. **ESTRATEGIA_USUARIOS_CERO_A_50.md**
   - Cómo contactar ONGs
   - Email templates
   - WhatsApp + landing page

3. **CHECKLIST_SEMANAL.md**
   - Qué hacer cada día
   - 11 semanas desglosadas
   - Señales de alerta

---

## ÚLTIMA PALABRA

Este plan es **conservador a propósito**. MVP ≠ perfecto. MVP = útil + deployed.

Clave: **Validar supuestos con usuarios reales (ONGs) desde semana 6**, no esperar a semana 11.

Vas a tener 30+ bugs durante desarrollo. Normal. Priorizas critical, el rest para v1.1.

El risk real no es técnico: **es conseguir usuarios**. Por eso outreach temprano (semana 6, no semana 11).

---

## NEXT STEP

1. Lee los 3 documentos adjuntos (esta noche)
2. Crea repo + primeros commits semana 1 (esta semana)
3. Contacta 5 ONGs pequeñas (semana 3)
4. Muestra wireframes o prototype (semana 5)
5. Recibe feedback (semana 6)
6. Itera basado en eso (semana 7-9)
7. Lanzas semana 11

**Éxito 🚀**

---

**Preguntas?** Escribime.

Creo genuinamente en esto. Hay demanda real, timing es ahora, y vos tienes skills para hacerlo.

Vamos.
