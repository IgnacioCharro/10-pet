# Política de seguridad

## Reportar una vulnerabilidad

Si encontrás una vulnerabilidad en 10_Pet, **por favor no abras un issue público**.

En su lugar, reportala por uno de estos canales:

- **Preferido**: [GitHub Security Advisory](https://github.com/IgnacioCharro/10-pet/security/advisories/new) (privado, notifica a maintainers).
- **Alternativa**: email directo al founder — contacto disponible en el perfil de GitHub.

## Qué incluir

- Descripción del problema y potencial impacto.
- Pasos para reproducir.
- Versión/commit afectado.
- Si tenés un fix sugerido, bienvenido.

## Qué esperar

- Acuse de recibo en **72 h hábiles**.
- Triage inicial en **7 días**.
- Fix + coordinación de disclosure según severidad:
  - **Crítica / Alta**: fix prioritario, disclosure coordinada.
  - **Media / Baja**: se agenda en el próximo release.

## Alcance

Aplica a todo el código de este repositorio y al stack definido en `Home/PLAN_ULTRA.md §12` (API, Web, integraciones con Supabase, Upstash, Cloudinary, SendGrid, FCM).

**Fuera de alcance**:

- Vulnerabilidades en servicios de terceros (reportalas directo al vendor).
- DoS por volumen masivo.
- Ataques de ingeniería social.
- Vulnerabilidades en dependencias ya reportadas públicamente en el NVD.

## Agradecimientos

Los reporters de vulnerabilidades válidas serán reconocidos en las release notes (si así lo desean).
