# ESTRATEGIA USUARIO CERO → 50 USUARIOS ACTIVOS

**Premisa**: No esperes a tener MVP perfecto. Empieza outreach en semana 6, cuando tengas:
- Backend 60% (auth + API básica)
- Web UI 50% (mapa funcional, aunque feo)

---

## FASE 1: INVESTIGACIÓN (Semana 1-2)

### 1. Crear "Target List" de 100 contactos

**Dónde buscar** (prioridad):

```
Tier 1 (CONTACTAR PRIMERO - tienen estructura):
- Fundación Cuatro Patitas
- Fundación Meztli
- SOAR (Sociedad Ordenada de Adopción y Rescate)
- SOS Gatos Callejeros
- Refugio Nueva Ilusión
- Patas en Acción

Tier 2 (ONGs medianas):
- Búsqueda en Google: "refugio animales CABA"
- LinkedIn: buscar "rescue", "animal", "ONG"
- Instagram: hashtag #rescateanimales #refugioarg

Tier 3 (Voluntarios individuales):
- Grupos Facebook: "Rescate animales CABA"
- Telegram: "voluntarios rescate", "perros abandonados"
- Twitter: #animalesAbandonados #rescatearg
```

**Spreadsheet estructura**:
```
| Nombre | Tipo | Contacto | Email | WhatsApp | Instagram | Reach | Reached | Status | Notes |
|--------|------|----------|-------|----------|-----------|-------|---------|--------|-------|
| Fundación Meztli | ONG | María | maria@meztli.org | +54911223344 | @meztliarg | 12k | NO | - | Rescate activo |
```

**Tool**: Google Sheets (compartible, funcional, basta)

---

## FASE 2: LANDING PAGE (Semana 3)

### Crear página única para mostrar + captar emails

**Opción A (MÁS RÁPIDO - 1h)**:
- Carrd.co - builder visual, muy simple
- Template: "Service Launch"
- URL: rescueargentina.carrd.co

**Opción B (MÁS FLEXIBLE - 3h)**:
- Vercel + HTML (una página)
- Template: minimalist, focus on CTAs
- URL: tudominio.com

**Contenido estructura**:

```html
<!-- HEADER: 10 segundos para enganche -->
<h1>Rescate de animales abandonados - Argentina</h1>
<p>Mapa en tiempo real + voluntarios conectados</p>
<button>Acceder a beta testing</button>

<!-- PROBLEM: Relatabilidad -->
<section>
  <h2>¿Por qué existe este problema?</h2>
  
  <stat>100+ animales abandonados diariamente en Argentina</stat>
  <stat>ONGs descoordinadas = casos se pierden</stat>
  <stat>Redes sociales = caos, sin filtro de ubicación</stat>
  
  <quote>
    "Encontramos un perro herido en Recoleta.
    Lo publiqué en 3 grupos de Facebook pero...
    ¿Quién sabe si alguien lo rescató?"
  </quote>
</section>

<!-- SOLUTION: Claridad -->
<section>
  <h2>¿Cómo lo solucionamos?</h2>
  
  <feature>
    <icon>📍</icon>
    <title>Mapa en tiempo real</title>
    <desc>Todos los casos geolocalizados. Filtra por zona.</desc>
  </feature>
  
  <feature>
    <icon>📞</icon>
    <title>Contacto directo</title>
    <desc>Voluntario contacta reportador en 5 segundos.</desc>
  </feature>
  
  <feature>
    <icon>✅</icon>
    <title>Historial</title>
    <desc>Cada caso tiene estado: abierto, resuelto, en proceso.</desc>
  </feature>
</section>

<!-- BETA TESTING: CTA principal -->
<section>
  <h2>Beta testing: ¡Participa!</h2>
  <p>Buscamos voluntarios y ONGs para testear.</p>
  
  <form>
    <input type="email" placeholder="tu@email.com" required>
    <select>
      <option>Soy voluntario</option>
      <option>Soy ONG</option>
      <option>Encontré un animal</option>
    </select>
    <textarea placeholder="¿Por qué te interesa?"></textarea>
    <button>Acceder a beta</button>
  </form>
</section>

<!-- FOOTER: Credibilidad -->
<footer>
  <p>Hecho por rescatistas, para rescatistas</p>
  <p>Email de contacto: hello@rescatearg.com</p>
</footer>
```

**Diseño visual** (Tailwind):
- Fondo blanco limpio
- Acentos en teal/verde (simboliza vida, rescate)
- Tipografía: sans-serif clara
- Imágenes: 2-3 fotos de animales rescatados reales
- Mobile-first responsive

**Copy tone**: Empático, urgente pero no dramático, directo.

---

## FASE 3: OUTREACH EMAIL MASIVO (Semana 6-7)

### Timing
- **Martes 10am**: Mejor open rate
- **Martes-Jueves**: No viernes (perdido en inbox)
- **Evitar**: Lunes (caos), domingos (ignorado)

### Email template (personalizado)

```
ASUNTO: [¿Sos voluntario/ONG rescate?] Herramienta nueva para Argentina

CUERPO:

Hola [Nombre ONG/Voluntario],

Soy [Tu nombre], developer en Argentina. Llevo el último mes construyendo 
algo que creo que te puede interesar.

**El problema que vemos:**
- 100+ animales abandonados por día en Argentina
- Voluntarios y ONGs trabajando sin coordinación
- Redes sociales = ruido, sin filtro de ubicación

**La solución:**
Una plataforma donde:
✓ Reportas un animal abandonado en un mapa
✓ Voluntarios cercanos lo ven instantáneamente
✓ Contacto directo en < 1 minuto
✓ Historial de cada caso (abierto → resuelto)

Estamos en BETA TESTING ahora. Buscamos 20 ONGs + voluntarios 
para feedback inicial antes de launch público.

Si participas en beta obtienes:
→ Acceso exclusivo (antes que el público)
→ Rol de moderador en tu zona
→ Tu nombre en el landing como "early supporter"
→ Input directo en nuevas features

Link: [www.rescuearg.com/beta]

¿Interesado? Tocá este link y te agregamos al grupo privado de testing.

Cualquier pregunta, escribime al WhatsApp: +54 9 11 [tu número]

Gracias,
[Tu nombre]
P.D: Somos rescatistas también, por eso hacemos esto.
```

### Variantes por tipo de contacto

**Para ONG formal** (cambiar "Hola [Nombre ONG]"):
```
Hola,

Representantes de [ONG X],

Somos un equipo de developers trabajando en herramienta de 
rescate coordinado. ¿Podrían tomar 15 minutos para conocer?

...
```

**Para voluntario individual** (tono más casual):
```
¡Hola [Nombre]!

Vi que haces rescate en [zona]. Te escribo porque estamos 
armando app para conectar a gente como vos.

...
```

### Proceso masivo (cómo NO spamear)

1. **Dividir lista en 5 tandas** (20 contactos cada una)
2. **Tandas separadas 2-3 días** (no envíes los 100 igual)
3. **Personaliza cada email** (busca nombre real, ONG específica)
4. **Tracking simple**: Google Sheet → "Sent", "Opened?", "Replied?"
5. **Reply rate esperado**: 5-15% (así que de 100, espera 5-15 respuestas)

---

## FASE 4: WHATSAPP + GRUPO TESTING (Semana 7)

### Crear grupo privado de beta testers

**Nombre**: "🐾 Beta Testing - Rescate Animales Argentina"

**Invitados**:
- 5-10 ONGs principales
- 10-15 voluntarios
- 2-3 amigos (testers funcionales)

**Rol del grupo**:
- Daily updates (lunes-viernes 10am)
- "¿Qué queremos testear hoy?"
- Bugs reportados → fix en < 24h
- Feedback cualitativo (sesiones de 30min)

**Template mensaje día 1**:
```
¡Hola a todos! 🙌

Bienvenidos a beta testing de [App Name].

Esta semana (semana 7):
✅ Mapa funcional (pero básico)
✅ Publicar casos (flujo simple)
✅ Búsqueda por ubicación
⏳ Chat (semana 8)
❌ App móvil (semana 9)

Hoy los invito a:
1. Crear cuenta en www.rescatearg.com/beta
2. Probar publicar 1 caso (ficticio está bien)
3. Filtrar casos en mapa
4. Reportar bugs aquí directamente

Dudas? Pregunten sin filtro. 

Gracias por estar acá 🙏
```

---

## FASE 5: FEEDBACK LOOP ACELERADO (Semana 8-9)

### 1:1 Calls (15-30min cada una)

**Con**: ONGs principales (5-10 contactos clave)  
**Cuándo**: Lunes-miércoles, 2-4pm  
**Duración**: 20 min (no más)  
**Script**:

```
Intro (2 min):
"Gracias por testear. Queremos que disfrutes usando esto
y que nos digas qué falta."

Demo (5 min):
"Mira acá [screen share]: publicá un caso, ¿qué te falta?"

Preguntas (10 min):
1. ¿Qué te molestó más?
2. ¿Qué usarías todos los días?
3. ¿Qué feature crítico falta?
4. ¿Invitarías a otros voluntarios?

Close (2 min):
"Gracias, vamos a implementar [feature X] para la semana que viene"
```

**Output**: Google Doc con 20-30 notas de feedback

### Live testing session (viernes)

- Todos en mismo WhatsApp video call
- Pantalla compartida: "Publicar un caso entre todos"
- Anotar bugs en tiempo real
- 30 minutos max

---

## FASE 6: PUSH FINAL (Semana 10-11)

### 48 horas antes de launch público

**Validación rápida**:
- [ ] Todos los 50 usuarios pueden crear caso
- [ ] Todos pueden ver casos en mapa
- [ ] Push notification delivery > 90%
- [ ] Zero blocker bugs

**Social media blitz**:

**Instagram post**:
```
🚀 Lanzan beta RESCATE ANIMALES Argentina

Mapa en tiempo real + voluntarios conectados

Encontraste un perro/gato?
→ Clic en mapa
→ Voluntarios cercanos lo ven YA
→ Contacto directo en 5 seg

Beta testing termina HOY.
Acceso libre mañana 🐾

Link en bio
```

**WhatsApp a grupo beta**:
```
¡Gracias a todos!

Mañana a las 10am lanzan RESCATE ANIMALES 🐾
en acceso público.

El mérito es de ustedes.
Ustedes son los early supporters.

Inviten a otros voluntarios, ONGs, amigos
que encuentren animales.

Link: www.rescatearg.com

¡Vamos a rescatar juntos!
```

**Email a lista 100 ONGs** (last call):
```
ASUNTO: Rescate Animales Argentina → LIVE ✅

Después de 6 semanas de beta testing...

¡LANZAMOS MAÑANA!

La plataforma que conecta voluntarios 
y reportadores en tiempo real.

Acceso: www.rescatearg.com

Gracias a 50 testers que nos ayudaron.
Ahora es para todos 🐾
```

---

## MÉTRICAS ESPERADAS

| Métrica | Meta | Realista |
|---------|------|----------|
| Email open rate | 30% | 20-25% |
| Email reply rate | 15% | 5-10% |
| Signup desde landing | 50% | 30-40% |
| Caso publicado en primer uso | 60% | 40% |
| Vuelve en 3 días | 80% | 60% |
| Activos semana 2 | 70% de signups | 40-50% |

**Realismo**: De 100 emails, espera 10-15 respuestas, 5-8 signups activos.

---

## COSAS A EVITAR

❌ **NO** envíes newsletters genéricas sin personalizar  
❌ **NO** publiques "soon" sin demo funcional  
❌ **NO** abandones el grupo WhatsApp después de semana 1  
❌ **NO** hagas cambios grandes basado en feedback de 1 persona  
❌ **NO** oversell features que no tienes  
❌ **NO** ignores bugs reportados > 24h  

✅ **SÍ** personaliza cada email  
✅ **SÍ** responsde rápido (< 4h)  
✅ **SÍ** reconoce contribuciones de testers  
✅ **SÍ** itera basado en patrón de feedback (no outliers)  

---

## TEMPLATE TRACEO (Copiar a Google Sheets)

```
Fecha      | Nombre ONG | Email | WhatsApp | Estado | Acción | Fecha follow-up | Notas
-----------|-----------|-------|----------|--------|--------|-----------------|-------
2024-01-15 | Meztli    | xxx   | +54...   | SENT   | Wait   | 2024-01-22     | -
2024-01-15 | SOAR      | xxx   | +54...   | SENT   | Call   | 2024-01-18     | Interested
2024-01-16 | Gatos CC  | xxx   | +54...   | REPLIED| INVITE | 2024-01-17     | In beta group
```

---

## RESUMEN EJECUTIVO

- **Semana 6**: Landing + envíos email (batch 1)
- **Semana 7**: Respuestas + invites a beta group
- **Semana 8-9**: Grupo activo, calls 1:1, feedback acelerado
- **Semana 10-11**: Push final, 50+ activos, LAUNCH
- **Semana 12+**: Community runs itself (esperas)

**Clave**: No esperes perfección. Lanza con 40% listo. Los usuarios te dicen qué falta.

---

Éxito 🚀
