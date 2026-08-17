# S0 + S1 — Cimientos de escritorio e Inicio

Fecha: 2026-08-17
Estado: aprobado, listo para plan de implementacion

## Contexto

Hoy la web sirve el layout mobile estirado: una columna de ~520px centrada en
pantallas de 1600-1900px. Diseno entrego un handoff de escritorio con cuatro
pantallas (Inicio, Mapa, Mis casos, Reportar) mas la referencia de tema claro.

Las maquetas viven en `diseño/10_Pet_diseño2/desktop/` (fuera de git). El
paquete viejo `diseño/desktop/` esta obsoleto.

### Decision de alcance ya tomada

El encargo se ejecuta con **fidelidad total a la maqueta**, no solo layout. Las
maquetas inventan producto que no existe (titulo de caso, codigo publico,
avistamientos, ETA de voluntarios, insignias, guardias veterinarias). Todo eso
entra, repartido en bloques posteriores.

### Troceado del encargo completo

| # | Bloque | Migrations |
|---|--------|------------|
| **S0** | Cimientos de escritorio | no |
| **S1** | Inicio escritorio | no |
| S2 | Modelo de caso ampliado | si |
| S3 | Voluntariado enriquecido | si |
| S4 | Mapa escritorio | no |
| S5 | Mis casos escritorio | posible |
| S6 | Reportar escritorio | no |
| S7 | Avistamientos | si |
| S8 | Guardias veterinarias | si |

Este spec cubre **S0 y S1 unicamente**. S1 va junto a S0 porque los cimientos
solos no se ven en pantalla y no se validan; pegados a la primera pantalla si.
S1 no depende de S2 porque sus tarjetas muestran la especie, no el titulo.

## Especificaciones que fija el handoff

- Ancho de diseno 1600px; contenedor max 1408px, padding lateral 40px.
- Breakpoint desktop >= 1024px. Debajo, el mobile actual **sin tocar**.
- Header 68px sticky con blur.
- Grilla principal: contenido fluido + rail 372-400px, gap 32px.
- Radios: botones 10, tarjetas 14-16, chips 999.
- Rail sticky en `top: 100px`.
- Reglas transversales: nada de carruseles cortados (grilla en su lugar); color
  de urgencia **siempre acompanado de texto**; el rail nunca contiene acciones
  unicas; toque minimo 44px; texto de UI nunca por debajo de 12,5px.

---

## S0.1 — Tipografia

Tres familias, todas **self-hosted**, no desde Google Fonts. Las maquetas usan
el CDN porque son prototipos; el repo ya decidio lo contrario y esta
documentado en `apps/web/src/index.css`: la PWA tiene que verse igual offline y
no se le pasa la IP de cada visitante a un tercero.

| Familia | Pesos | Rol | Token Tailwind |
|---|---|---|---|
| Lora | 600 (ya esta) + **700** | wordmark, titulares | `font-brand` |
| Plus Jakarta Sans | **400, 500, 600, 700** | toda la UI | `font-sans` |
| Space Grotesk | **400, 500** | navegacion, ambos breakpoints | `font-nav` |

Siete `woff2` nuevos en `apps/web/public/fonts/`, subset latin (el mismo
`unicode-range` que ya usa el `@font-face` de Lora, que cubre el castellano).
Estimado ~150-175 KB sumados sobre un precache que hoy es 874 KB.

`font-display: swap` en todos, igual que el Lora existente.

**Nota sobre Lora 700:** el comentario actual de `index.css` explica que se
bajo un solo peso a proposito y que por eso el NavBar usa `font-semibold` y no
`font-bold`. Al sumar el 700 real, ese comentario queda obsoleto y hay que
actualizarlo en el mismo commit.

### Fira Code: fuera de alcance

El README de marca lista Fira Code 300/400 para microcopy y etiquetas tecnicas.
El handoff de escritorio no la menciona y la spec del menu mobile confirma que
"Plus Jakarta sigue siendo la tipografia de UI". **No se instala Fira Code en
S0.** Queda como pregunta abierta a diseno.

---

## S0.2 — Color

### El problema

El codigo tiene **1081 clases `gray-*` y 224 `primary-*` en 40 archivos
`.tsx`**. Un refactor a tokens semanticos (`bg-card`, `border-line`) son ~1300
ediciones mecanicas y un diff que nadie puede revisar de verdad.

### La decision

**Redefinir los valores detras de los nombres de clase que ya existen**, en
`apps/web/tailwind.config.ts`. Cero componentes tocados: los 40 archivos
adoptan la paleta nueva solos.

Funciona porque los pares que usa el codigo mapean casi 1:1 contra los tokens
de la maqueta:

| Uso en el codigo | Token de la maqueta | Claro | Oscuro |
|---|---|---|---|
| `bg-white` / `dark:bg-gray-800` | card | `#ffffff` | `#241a31` |
| `bg-gray-50` / `dark:bg-gray-900` | bg | `#f7f3fa` | `#140e1c` |
| `border-gray-200` / `dark:border-gray-700` | line | `#e4dbec` | `#372a48` |
| `text-gray-500` / `dark:text-gray-400` | fg2 | `#5b4b6b` | `#c3b6d0` |
| `text-gray-900` / `dark:text-gray-100` | fg | `#241a31` | `#f4eef8` |

### Tabla de valores a escribir

```
white     #ffffff   card claro (sin cambio)
gray-50   #f7f3fa   bg claro
gray-100  #f4eef8   fg oscuro
gray-200  #e4dbec   line claro
gray-300  #cec0dc   line2 claro
gray-400  #c3b6d0   fg2 oscuro
gray-500  #5b4b6b   fg2 claro
gray-600  #8d7f9c   fg3 (mismo en ambos temas)
gray-700  #372a48   line oscuro
gray-800  #241a31   card oscuro
gray-900  #241a31   fg claro  (ver conflicto)
```

`primary-600` ya es `#7c3aed` y coincide con el `--accent` de la maqueta. La
rampa `primary-*` no se toca.

### El conflicto de `gray-900`, y como se resuelve

`gray-900` se usa con dos roles incompatibles:

- `text-gray-900` (27 usos) — color de texto en claro, quiere `#241a31`.
- `dark:bg-gray-900` (4 usos) — fondo de pagina en oscuro, quiere `#140e1c`.

Un solo valor no sirve para ambos: si `gray-900` fuera `#140e1c`, el texto en
claro se veria casi negro azulado en vez del carbon violaceo de la marca; si es
`#241a31`, el fondo de pagina en oscuro queda identico al color de tarjeta y
las tarjetas desaparecen.

**Resolucion:** `gray-900` queda en `#241a31`, y se agrega a la config un color
nuevo `canvas` = `#140e1c`. Los 4 usos de `dark:bg-gray-900` se editan a mano a
`dark:bg-canvas`. Son cuatro ediciones puntuales, no un refactor.

### Limitaciones aceptadas

Dos tonos sirven a la vez como superficie y como linea, roles que la maqueta
distingue. En ambos casos se unifica y se acepta la degradacion:

- **`gray-700`** — superficie oscura (`dark:bg-gray-700`, 75 usos) y linea
  oscura (`dark:border-gray-700`, 60 usos). La maqueta separa `card2 #2b2039`
  de `line #372a48`. Se unifica en `#372a48`: como superficie elevada sobre
  `card #241a31` se lee bien, y como borde sobre tarjeta tambien.
- **`gray-600`** — texto secundario en claro (`text-gray-600`, 71 usos) y borde
  en oscuro (`dark:border-gray-600`, 36 usos). Se unifica en `#8d7f9c` (el
  `fg3`, que la maqueta usa igual en ambos temas). Como borde oscuro queda mas
  claro que el `line2 #443354` de la maqueta, o sea un borde algo mas marcado
  de lo disenado. Es visible, no roto.

Si el recorrido visual muestra que alguno de los dos molesta, la salida es
editar a mano ese puñado de usos, como con `gray-900` — no rehacer el mapeo.

### Tokens semanticos para el codigo nuevo

Ademas de redefinir los grises, se declaran los tokens de la maqueta como
variables CSS en `index.css`, con sus valores claro/oscuro colgados de la clase
`.dark` que ya existe:

```
--bg --bg2 --card --card2 --line --line2
--fg --fg2 --fg3
--accent --accent2 --accent-soft
--red --red-soft --amber --amber-soft --yellow --yellow-soft
--green --green-soft --blue --blue-soft
--nav-active   (#a855ff, el punto del menu, igual en ambos temas)
```

Se exponen en Tailwind como `bg-surface`, `border-line`, `text-muted`, etc. **El
codigo nuevo de escritorio usa estos**; el codigo viejo sigue con los grises
redefinidos. La deuda de convergencia queda anotada, no pagada.

`--nav-active` es token propio y **no** una variante del `--signal` ambar del
README de marca: aquel significa urgencia temporal y va uno por vista; este
marca seccion actual y hay uno siempre. La propia spec del menu los declara
separados (`--vio`, `--neon`, `--oro`).

### Retoques del tema claro

La maqueta clara no solo cambia valores; suma tres cosas:

- Header: `rgba(255,255,255,.86)` en vez de `rgba(20,14,28,.88)`.
- Tarjetas y paneles: `box-shadow: 0 1px 2px rgba(36,26,49,.05)`; en hover
  `0 10px 22px rgba(36,26,49,.1)`.
- Placeholders de foto: violeta muy claro (`#ece4f3` / `#e2d7ec`).

En oscuro las tarjetas se apoyan solo en el borde, sin sombra.

---

## S0.3 — Shell de escritorio

### Contenedor

`max-w-[1408px]` con padding lateral 40px, activo desde `lg` (1024px). Debajo
de 1024px el layout mobile actual queda **intacto**.

### Header

- Escritorio (>= 1024px): **68px**, sticky, con blur.
- Mobile: **64px**, como hoy. La spec del drawer no cambia el alto en mobile.

El header ya existe casi 1:1 en `NavBar.tsx:96-162` (Inicio / Mapa / Mis casos /
Mi perfil / Admin, toggle de tema, boton Reportar, avatar con nombre, Salir). El
delta es contenedor, alto y blur.

**Trampa documentada que hay que respetar.** El comentario de `NavBar.tsx:81`
avisa que el alto `h-16` lo dependen otros dos lugares:

- `CasesPage.tsx:162` — `style={{ height: 'calc(100vh - 64px)' }}`
- `ToastContainer.tsx` — el `top`, calculado sobre 4rem + `safe-area-inset-top`

Como el alto pasa a depender del breakpoint, ese `calc` tiene que volverse
responsive. Va como paso explicito del plan, no como detalle de implementacion.

### Navegacion

Cambia en **ambos** breakpoints. Diseno lo confirmo por escrito: el tratamiento
nuevo no es exclusivo de escritorio, es el sistema de navegacion de la marca.

| | Mobile | Escritorio |
|---|---|---|
| Familia | Space Grotesk 500 | Space Grotesk 500 |
| Tamano | 17px | 15,5px |
| Tracking | -0.005em | -0.005em |
| Gap entre items | vertical, filas de 48px | 30px |
| Punto activo | 6px `#A855FF`, halo `0 0 0 4px rgba(168,85,255,.22)`, a 12px del label | 7px con halo mas amplio |
| Fila (mobile) | alto 48px, padding lateral 14px, radio 12px | — |

Tres reglas de implementacion:

1. Los items **inactivos reservan el ancho del punto** (6px + gap) para que el
   label no salte al cambiar de seccion.
2. El item activo **no lleva pill ni fondo**. Hover/press: solo superficie sutil.
3. **"Reportar" conserva el pill violeta y Plus Jakarta Sans 700** — es boton,
   no navegacion.
4. Links secundarios del pie del drawer: Space Grotesk 400 / 14px, sin punto.

Queda deprecado el pill violeta como indicador de activo, y Plus Jakarta en los
items de menu.

### Dos huecos de la maqueta del drawer

La maqueta del drawer mobile trae al pie tres links: "Como funciona",
"Refugios" y "Salir". **`Refugios` no existe en el producto** y "Como funciona"
no es una ruta (es una seccion de la landing). Ademas el drawer maqueteado **no
tiene la fila del toggle de tema**, que hoy si existe en `NavBar.tsx:234-239`.

Resolucion para S0: se conserva el toggle de tema, se omite "Refugios", y "Como
funciona" apunta al ancla de la landing. Anotado para revisar con diseno.

---

## S0.4 — Primitivas

En `apps/web/src/components/ui/`:

| Componente | Que resuelve |
|---|---|
| `Panel` | tarjeta del rail: radio 16, borde, sombra solo en claro |
| `UrgencyTag` | chip de urgencia. **Color siempre con texto**, nunca color solo |
| `Chip` | filtro redondeado (radio 999), estados on/off |
| `Segmented` | control segmentado (Todos / Encontrados / Buscados) |
| `Rail` | contenedor sticky `top: 100px`, columna con gap 20 |

`UrgencyTag` centraliza el mapa de urgencia, que hoy esta duplicado en cuatro
lugares (`HomeFeed.tsx:30-41`, `CaseCard`, `CasePage`, `CaseDetailSheet`) con
la sutileza de que el nivel 4 va naranja y no rojo para no confundirse con el 5.
Esa regla se preserva tal cual.

---

## S1 — Inicio escritorio

Sobre `apps/web/src/components/cases/HomeFeed.tsx` (357 lineas), que hoy es una
columna de `max-w-2xl`.

### Layout

```
[ header 68px sticky ]
[ h1 + zona + acciones ]
[ urgentes: grid de 4 ]
[ split: contenido fluido | rail 392px, gap 32 ]
```

### Cambios respecto de mobile

- **Urgentes en grilla de 4.** Reemplaza el carrusel con `overflow-x-auto` de
  `HomeFeed.tsx:254`. El handoff prohibe carruseles cortados en escritorio.
- **Lista en 2 columnas** con tarjeta nueva (thumb 96px + contenido), en vez de
  filas de ancho completo.
- **Selector de orden**: cercanos / recientes / urgentes. El backend ya los
  soporta — `sort: z.enum(['recent','urgency','distance'])` en los validators de
  cases. Es solo exponerlo en la UI.
- **Rail**: mini mapa, metricas de zona, leyenda por urgencia, CTA de alertas.

Mobile (<1024px) conserva el carrusel, la lista de una columna y no muestra el
rail. Es el mismo componente con clases responsive, no un componente aparte.

### Backend nuevo: `GET /cases/zone-stats`

Lo unico que S1 agrega al API. Solo lectura, sin migrations.

```
GET /api/v1/cases/zone-stats?lat=&lng=&radius=

200 {
  activeCases: number,
  resolvedThisMonth: number,
  byUrgency: { critica, alta, media, baja },
  byListingType: { found, lost }
}
```

- Validacion Zod de query (lat, lng, radius), como todo endpoint del repo.
- Reusa el `ST_DWithin` que ya usa el listado de casos.
- Rate limit estandar de lectura (60 req/min por IP).
- Errores en el formato estandar `{ error: { code, message, fields? } }`.

### Lo que NO entra en S1, y por que

La maqueta muestra en el rail dos metricas mas:

- **"7 voluntarios cerca"** — exige contar usuarios por zona. La app no guarda
  ubicacion de usuario: solo la localidad elegida, y vive en `localStorage`.
- **"2.1 h de respuesta media"** — exige medir el tiempo entre publicacion y
  primer contacto. Es calculable pero es una feature propia, no un numero suelto.

Las dos son producto, no relleno de un rail. Se mueven al bloque de agregados,
junto con las insignias de impacto de S5.

El rail queda con tres paneles reales (mini mapa, metricas, leyenda) mas el CTA.
Ninguno de ellos es una accion unica: el mini mapa duplica el link "Ver mapa
completo" de la cabecera y el CTA de alertas duplica el permiso de
notificaciones que ya existe. Cumple la regla del handoff.

---

## Testing

- **Unit**: `UrgencyTag`, `Chip`, `Segmented` y el mapeo de urgencia extraido.
- **Integration**: `GET /cases/zone-stats` — caso feliz, radio sin casos,
  parametros invalidos (400), y el formato de error estandar.
- **SQL real**: las consultas de `zone-stats` se verifican contra Supabase
  dentro de `BEGIN; ... ROLLBACK;` **antes de commitear**, porque la suite
  mockea `../../../db` y no ejecuta SQL de verdad. Un test que afirme sobre el
  `attributes` de la llamada no prueba que la consulta corra.
- **Visual**: recorrido en los dos temas y en los dos breakpoints. El tema claro
  no es opcional: es la mitad del entregable de diseno.

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| Redefinir grises rompe contraste en pantallas no revisadas | recorrido visual por las 40 pantallas afectadas en ambos temas antes de mergear |
| El `calc(100vh - 64px)` de CasesPage queda desincronizado | paso explicito del plan, no detalle |
| +175 KB de fuentes degradan la carga | subset latin, `font-display: swap`, medir el precache antes y despues |
| La deuda de dos sistemas de color (grises + semanticos) se vuelve permanente | anotada aca; converge cuando S4/S5 reescriban esas pantallas |

## Preguntas abiertas a diseno

Ninguna bloquea S0/S1.

1. El oro `#f2c33d` contradice una regla explicita del README de marca ("no
   entra al logo: el escudo es violeta + crema, siempre"). La decision del oro
   es correcta; el README quedo viejo y conviene corregirlo para que nadie
   revierta el oro citandolo.
2. Fira Code: sigue viva para microcopy y etiquetas tecnicas, o la reemplazo
   Plus Jakarta y el README quedo viejo tambien ahi.
3. El icono maskable de la PWA queda descoordinado: en Android con soporte
   maskable se ve escudo crema con huella violeta; sin soporte, escudo violeta
   con huella oro. Ya estaba invertido antes del oro, asi que no es regresion,
   pero ahora ademas difiere el color de la huella.
4. "Refugios" en el pie del drawer no existe en el producto.
