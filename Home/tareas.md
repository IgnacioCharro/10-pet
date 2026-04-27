# Tareas pendientes

## Grupo C — Fixes rápidos (un PR)
- [x] Renombrar tab "Lista" → "Explorar" en /cases (`CasesPage.tsx`)
- [x] Nombre obligatorio en registro + fallback "Anónimo" para datos viejos (`RegisterPage.tsx` + API)
- [x] Quitar "MVP en construcción" de la landing (`HomePage.tsx`)
- [x] Estados vacíos con CTAs claros en mapa y dashboard (`CasesPage` + `DashboardPage`)

## Grupo B — Dashboard (un PR)
- [x] Renombrar "Dashboard" → "Mis casos y solicitudes" (`DashboardPage.tsx`)
- [x] Casos clickeables en "Mis casos" → abre CaseDetailSheet (`DashboardPage.tsx`)

## Grupo A — Wizard de publicar (un PR)
- [x] Bug intersecciones: cambiar `"y"` → `"esq."` en query Nominatim (`PublishCasePage.tsx`)
- [x] Labels contextuales de urgencia por nivel (`PublishCasePage.tsx`)
- [x] Simplificar paso 2: GPS primero, formulario como fallback (`PublishCasePage.tsx`)

## Grupo D — Burbuja home feed (un PR)
- [x] Popup minimalista al clickear caso: foto, tipo, urgencia, ubicación, timeAgo, descripción corta, botón "Ver completo" (`HomePage.tsx` + componente nuevo)

## Grupo E — Taxonomía de resolución (un PR, requiere migración)
- [x] Migración DB: campo `resolution_type` en cases
- [x] Validador + servicio: acepta/devuelve `resolution_type` (`cases.validators.ts` + `cases.service.ts`)
- [x] UI: modal al marcar caso como resuelto con opciones formales (`CaseDetailSheet.tsx`)
  - adoptado · en tránsito · centro de zoonosis · derivado a ONG · falleció · sin paradero · otro
- [x] Mostrar resolución en "Mis casos" (`DashboardPage.tsx`)

## Grupo F — Operacional
- [ ] Script SQL para truncar tablas antes del launch (ejecutar manualmente en Supabase)
