# PROMPT: Planificación Profesional Completa — App de Rescate Animal + Comunidad de Mascotas

> **Instrucciones de uso:** Copiá todo el contenido debajo de la línea y pegalo como prompt en tu IA. Ajustá los valores entre `[corchetes]` si querés personalizar algo.

---

## PROMPT INICIO

Actuá como un equipo combinado de: arquitecto de software senior, product manager, estratega de growth, y diseñador UX. Necesito que analices un problema real y generes la planificación profesional completa para resolverlo con una aplicación.

Tu trabajo es tomar las mejores decisiones técnicas, de producto y de estrategia. No quiero que me preguntes qué prefiero — quiero que vos decidas, justifiques cada decisión, y si hay trade-offs importantes me los presentes con tu recomendación clara.

---

### EL PROBLEMA

En Argentina hay un gran problema con los animales abandonados en la calle. El trabajo de rescatar, curar, cuidar, poner en adopción o tránsito lo hacen personas voluntarias que no dan abasto. No existe una plataforma centralizada que les dé visibilidad a estos animales ni que conecte eficientemente a quien encuentra un animal con quien puede ayudarlo.

### LA IDEA

Una aplicación con dos conceptos centrales:

**Concepto A — Rescate:** Cualquier persona pueda reportar un animal abandonado en la calle (foto, ubicación, estado del animal, identificación particular) y darle visibilidad para que voluntarios, ONGs o adoptantes lo encuentren.

**Concepto B — Comunidad de mascotas:** Un espacio donde los dueños puedan "presumir" a sus mascotas. La mascota toca el corazón de cada dueño como ninguna otra cosa — hay un potencial enorme en explotar ese sentimiento emocional. Este módulo aprovecha el tráfico que genera el módulo de rescate y viceversa.

**La sinergia:** Alguien que reporta un animal descubre la comunidad y se engancha. Alguien que presume su mascota lee sobre rescates y adopta. Tráfico cruzado orgánico.

### MIS RESTRICCIONES REALES

- **Equipo:** 1 persona full-stack (yo solo). [Si considerás que necesito ayuda externa puntual, decime en qué y cuánto costaría.]
- **Presupuesto total:** Menos de $5.000 USD para los primeros 3-4 meses.
- **Mercado inicial:** Argentina. [Pero evaluá si conviene arrancar nacional o focalizado en una ciudad/región.]
- **Timeframe deseado:** 3-4 meses para un primer lanzamiento. [Si considerás que es irrealista, proponé un timeline mejor y justificá.]
- **Conocimiento técnico:** Tengo experiencia en desarrollo full-stack con Python y JavaScript. [Recomendá el stack que consideres óptimo para este contexto, no te limites a lo que ya conozco si hay algo mejor.]

---

### QUÉ NECESITO QUE GENERES

Analizá todo el problema y generá un documento de planificación profesional completo. Para cada sección, tomá las decisiones que consideres correctas y justificalas brevemente. Si hay decisiones donde las alternativas son muy parejas, presentá las opciones con tu recomendación marcada.

---

#### PARTE 1: ANÁLISIS ESTRATÉGICO

**1. Análisis del problema y oportunidad**
- Dimensión real del problema en Argentina (números si los tenés)
- Qué soluciones existen hoy y por qué no alcanzan
- Dónde está la oportunidad concreta

**2. Decisión: ¿Qué se construye primero y por qué?**
- ¿Concepto A (Rescate), Concepto B (Comunidad), o ambos juntos en MVP?
- ¿Cuál genera tracción más rápido?
- ¿Cuál valida la hipótesis de negocio antes?
- Justificá tu recomendación

**3. Decisión: ¿Alcance geográfico inicial?**
- ¿Nacional, provincial, o una sola ciudad?
- Pros y contras de cada enfoque
- Tu recomendación y por qué

**4. Propuesta de valor diferenciadora**
- Qué hace a esta app diferente de un grupo de Facebook o WhatsApp de rescate
- Por qué un usuario elegiría esta app sobre lo que ya existe

**5. Análisis de competencia**
- Apps o plataformas similares en Argentina y LATAM
- Qué hacen bien, qué hacen mal
- Espacio que queda sin cubrir

**6. Definición de usuarios objetivo**
- Perfiles de usuario (personas/arquetipos concretos)
- Cuál es el usuario más importante para el MVP
- Qué problema específico le resuelve a cada uno

---

#### PARTE 2: PRODUCTO (UX/UI + FEATURES)

**7. Definición del MVP — Qué entra y qué NO**
- Lista concreta de features del MVP con prioridad (must-have / nice-to-have / Fase 2)
- Lista explícita de "tentaciones a evitar" (features que parecen necesarias pero no lo son para validar)
- Criterio que usaste para decidir qué entra

**8. Flujos de usuario principales**
- Todos los flujos críticos, paso a paso:
  - Reportar un animal
  - Buscar animales cerca
  - Ofrecerse a ayudar
  - Resolver un caso
  - Registro y onboarding
  - Moderación (admin)
- Para cada flujo: pasos del usuario, pantallas, datos que se mueven, estados que cambian

**9. Pantallas principales (wireframes descriptivos)**
- Descripción detallada de cada pantalla clave
- Qué datos muestra, qué acciones permite
- Jerarquía visual (qué es lo más importante en cada pantalla)
- Consideraciones mobile-first

**10. Sistema de estados y notificaciones**
- Estados de un caso (ciclo de vida completo)
- Qué notificaciones se envían, a quién, cuándo
- Canal de notificación recomendado y por qué

**11. Decisión: Sistema de contacto entre usuarios**
- ¿Chat in-app, WhatsApp, llamada, otro?
- Evaluá costo, complejidad, experiencia de usuario, y privacidad
- Tu recomendación para MVP y para Fase 2

---

#### PARTE 3: ARQUITECTURA TÉCNICA

**12. Decisión: Stack tecnológico completo**
- Backend: lenguaje, framework, por qué
- Base de datos: cuál, por qué, extensiones necesarias
- Frontend web: framework, por qué
- App móvil: nativo, híbrido, PWA, o postergar — justificá
- Mapas y geolocalización: servicio/librería
- Almacenamiento de imágenes: servicio
- Autenticación: estrategia
- Notificaciones push: servicio
- Para cada decisión: por qué es la mejor opción dado que soy 1 dev con presupuesto limitado

**13. Arquitectura del sistema**
- Diagrama de arquitectura (en Mermaid)
- Flujo de datos completo
- Separación de responsabilidades
- Cómo la arquitectura permite agregar Concepto B sin reescribir todo
- Consideraciones de escalabilidad

**14. Schema de base de datos**
- Diagrama ER completo (en Mermaid)
- Todas las tablas: campos, tipos, constraints, índices
- Queries geoespaciales: cómo se implementan
- Migrations iniciales (código listo para usar)

**15. Especificación de API**
- Lista completa de endpoints organizados por recurso
- Para cada endpoint: método, ruta, request body, response body, errores, autenticación requerida
- Versionado de API

**16. Estructura de carpetas**
- Backend y frontend completos
- Convenciones de nombrado
- Estructura extensible para Fase 2

**17. Infraestructura y deployment**
- Hosting: qué servicios, por qué, costo mensual
- CI/CD: pipeline recomendado para 1 dev
- Monitoreo, logging, backups
- Dominio + SSL + CDN
- Costo mensual total desglosado

**18. Consideraciones técnicas especiales**
- Performance (muchos markers en mapa)
- Offline (qué debería funcionar sin conexión en Argentina)
- Seguridad (datos de usuarios, anti-spam, moderación)
- Imágenes (compresión, tamaños, lazy loading)
- SEO

---

#### PARTE 4: EJECUCIÓN

**19. Roadmap detallado semana a semana**
- Qué se construye, prueba y entrega cada semana
- Hitos con criterios de "done"
- Horas estimadas por semana (soy 1 persona, necesito evitar burnout)
- Cuándo empezar outreach a usuarios (antes de terminar el MVP)

**20. Estrategia para conseguir los primeros 100 usuarios**
- Fuentes concretas de usuarios en Argentina (no genéricas)
- Templates de mensajes listos para copiar y pegar (email, WhatsApp, redes)
- Landing page: estructura y copy
- SEO: keywords y contenido sugerido
- Timeline de outreach coordinado con el desarrollo
- Métricas para saber si está funcionando

**21. Plan de monetización**
- Modelo de negocio que no comprometa la misión social
- Fuentes de ingreso ordenadas por viabilidad
- Proyección de costos vs ingresos (12 meses)
- En qué punto se vuelve autosustentable

**22. Análisis de riesgos**
- Top 5 riesgos técnicos + mitigación
- Top 5 riesgos de producto/mercado + mitigación
- Plan B si no hay tracción en las primeras 4 semanas post-lanzamiento
- Señales de alerta tempranas

**23. KPIs y métricas de éxito**
- Métricas concretas con números objetivo
- Cómo medirlas (herramientas, implementación)
- Criterio para decidir si el MVP fue exitoso o necesita pivotar

---

### FORMATO DE SALIDA

- Markdown profesional con headers claros y numerados
- Diagramas en Mermaid donde aplique (arquitectura, ER, flujos)
- Código copy-paste listo donde aplique (SQL, configs, estructura de carpetas)
- Todo en español
- Específico para Argentina (cultura, infraestructura, servicios disponibles, moneda)
- Cada decisión con su justificación breve
- Si hay trade-offs muy parejos: presentá opciones con tu recomendación marcada como **"RECOMENDACIÓN:"**
- Sé tan exhaustivo como sea necesario. Prefiero un documento largo y completo que uno corto e incompleto.

### LO QUE ESPERO DE VOS

No seas conservador ni genérico. Tomá posiciones claras. Si pensás que alguna parte de mi idea es débil, decímelo. Si creés que hay una oportunidad que no estoy viendo, señalala. Si algo de mis restricciones es irrealista, decímelo con datos. Quiero un plan que un inversor o mentor pueda leer y decir "esto está pensado en serio".

## PROMPT FIN
