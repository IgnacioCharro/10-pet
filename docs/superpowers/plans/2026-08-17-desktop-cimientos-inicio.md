# S0 + S1 — Cimientos de escritorio e Inicio: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar 10_Pet a escritorio: montar los cimientos visuales (tipografia, paleta clara/oscura, shell de 1408px, primitivas) y con ellos construir la pantalla de Inicio en su version de escritorio.

**Architecture:** El color se resuelve **redefiniendo los valores detras de los nombres de clase Tailwind que ya existen** (`gray-*`), no refactorizando 1081 usos a tokens semanticos; los 40 archivos adoptan la paleta nueva sin ser tocados. Encima de eso se agregan tokens semanticos como variables CSS que **solo consume el codigo nuevo**. El layout de escritorio se activa desde `lg` (1024px) sobre los mismos componentes, con clases responsive: no hay componentes separados para mobile y escritorio.

**Tech Stack:** React 18 + Vite + Tailwind (darkMode por clase `.dark`) + TypeScript strict. API: Express + Sequelize + PostgreSQL/PostGIS, validacion Zod. Tests: vitest (se monta en `apps/web` en la Task 1) y vitest + supertest en `apps/api` (ya existe).

**Spec:** `docs/superpowers/specs/2026-08-17-desktop-cimientos-inicio-design.md`

## Global Constraints

- Breakpoint de escritorio: **`lg` = 1024px**. Por debajo, el layout mobile actual queda **intacto**.
- Contenedor de escritorio: **max 1408px**, padding lateral **40px**.
- Header: **68px en escritorio, 64px en mobile**. Sticky, con blur.
- Rail sticky en **`top: 100px`**, ancho **392px**, gap **32px** contra el contenido.
- Radios: botones **10px**, tarjetas **14-16px**, chips **999px**.
- Punto de navegacion activo: **`#A855FF` en ambos temas**, 6px en mobile / 7px en escritorio.
- Color de urgencia **siempre acompanado de texto**, nunca color solo.
- Toque minimo **44px**; texto de UI nunca por debajo de **12,5px**.
- Nada de carruseles cortados en escritorio: lo que en mobile scrollea, aca es grilla.
- Codigo en ingles, comentarios y commits en espanol. **Sin emojis** en codigo ni en commits.
- Conventional Commits. Rama actual: `feat/desktop-cimientos-inicio`.
- Todo endpoint nuevo valida con Zod (body, query, params) y devuelve errores en el formato `{ error: { code, message, fields? } }`.

---

## File Structure

**Se crean:**

| Archivo | Responsabilidad |
|---|---|
| `apps/web/vitest.config.ts` | config de tests del front |
| `apps/web/src/test/setup.ts` | setup de testing-library |
| `apps/web/public/fonts/*.woff2` | 7 archivos de fuente, subset latin |
| `apps/web/src/theme/palette.test.ts` | guard de los 11 valores hex |
| `apps/web/src/components/ui/UrgencyTag.tsx` | chip de urgencia, color + texto |
| `apps/web/src/components/ui/Chip.tsx` | chip de filtro redondeado |
| `apps/web/src/components/ui/Segmented.tsx` | control segmentado |
| `apps/web/src/components/ui/Panel.tsx` | tarjeta del rail |
| `apps/web/src/components/ui/Rail.tsx` | contenedor sticky del rail |
| `apps/web/src/components/ui/*.test.tsx` | tests de las primitivas |
| `apps/web/src/components/cases/ZoneStatsPanel.tsx` | panel de metricas del rail |
| `apps/web/src/components/cases/UrgencyLegend.tsx` | leyenda por urgencia del rail |
| `apps/api/src/modules/rescue/cases/cases.zone-stats.ts` | consulta SQL de metricas de zona |

**Se modifican:**

| Archivo | Cambio |
|---|---|
| `apps/web/package.json` | devDeps de test + script `test` |
| `apps/web/src/index.css` | `@font-face` x7, variables de tema, comentario de Lora |
| `apps/web/tailwind.config.ts` | `fontFamily`, `colors.gray`, `colors.canvas`, tokens semanticos |
| `apps/web/src/components/ui/index.ts` | exportar las primitivas nuevas |
| `apps/web/src/components/NavBar.tsx` | tipografia de nav, punto activo, alto, contenedor, blur |
| `apps/web/src/pages/CasesPage.tsx:162` | `calc(100vh - 64px)` a responsive |
| `apps/web/src/layouts/RootLayout.tsx:7` | `dark:bg-gray-900` a `dark:bg-canvas` |
| `apps/web/src/components/ImprovementButton.tsx:84` | idem |
| `apps/web/src/components/ui/Modal.tsx:64` | idem (`/40`) |
| `apps/web/src/pages/ContactThreadPage.tsx:290` | idem |
| `apps/web/src/components/cases/HomeFeed.tsx` | layout de escritorio completo |
| `apps/web/src/services/cases.service.ts` | cliente de `zone-stats` |
| `apps/api/src/modules/rescue/cases/cases.validators.ts` | `zoneStatsSchema` |
| `apps/api/src/modules/rescue/cases/cases.service.ts` | reexport de `getZoneStats` |
| `apps/api/src/modules/rescue/cases/cases.controller.ts` | `getZoneStats` handler |
| `apps/api/src/modules/rescue/cases/cases.routes.ts` | ruta, **antes de `/:id`** |
| `apps/api/src/modules/rescue/cases/cases.integration.test.ts` | tests del endpoint |

---

### Task 1: Infraestructura de tests en el front

`apps/web` no tiene vitest, ni testing-library, ni script `test`, ni un solo archivo de test. Sin esto, ninguna task siguiente puede escribir su test primero.

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/test/smoke.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: comando `pnpm --filter web test`. Entorno `jsdom` con `@testing-library/jest-dom` cargado globalmente, de modo que las tasks siguientes pueden usar `render`, `screen` y matchers como `toBeInTheDocument()` sin importarlos.

- [ ] **Step 1: Instalar las dependencias de test**

```bash
cd apps/web
pnpm add -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6
```

- [ ] **Step 2: Crear la config de vitest**

Crear `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config propia y no la de vite.config.ts: ese archivo carga vite-plugin-pwa,
// que en modo test intenta generar el service worker y no hace falta.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 3: Crear el setup**

Crear `apps/web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// testing-library no desmonta solo cuando globals:true; sin esto los tests se
// contaminan entre si porque el DOM del anterior sigue montado.
afterEach(() => {
  cleanup()
})
```

- [ ] **Step 4: Agregar el script**

En `apps/web/package.json`, dentro de `"scripts"`, agregar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Escribir un smoke test que falle**

Crear `apps/web/src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('infraestructura de tests', () => {
  it('corre en jsdom', () => {
    expect(typeof document).toBe('object')
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement)
  })
})
```

- [ ] **Step 6: Correr los tests**

Run: `pnpm --filter web test`
Expected: PASS, 1 test. Si falla con "document is not defined", el `environment: 'jsdom'` no se aplico.

- [ ] **Step 7: Verificar que no rompio el typecheck**

Run: `pnpm --filter web typecheck`
Expected: sin errores. Si `vitest/config` no resuelve, falta el `-D vitest`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/test/ pnpm-lock.yaml
git commit -m "chore(web): montar vitest y testing-library

El front no tenia infraestructura de tests: los 247 del repo son todos del
API. Se monta acotado, para poder testear las primitivas nuevas y la paleta.
No se backfillea nada de lo que ya existe."
```

---

### Task 2: Las siete fuentes

**Files:**
- Create: `apps/web/public/fonts/lora-latin-700.woff2`
- Create: `apps/web/public/fonts/plus-jakarta-sans-latin-{400,500,600,700}.woff2`
- Create: `apps/web/public/fonts/space-grotesk-latin-{400,500}.woff2`
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/theme/fonts.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: clases `font-sans` (Plus Jakarta Sans), `font-brand` (Lora), `font-nav` (Space Grotesk). `font-sans` es el default del `body`, asi que toda la app cambia de tipografia.

- [ ] **Step 1: Descargar los siete archivos**

El metodo replica como llego `lora-latin-600.woff2`: se pide el CSS a Google Fonts con un user-agent moderno (si no, devuelve `ttf` en vez de `woff2`), se extrae la URL del bloque `/* latin */` y se baja el archivo.

```bash
cd apps/web/public/fonts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
grab(){ curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=$1:wght@$2&display=swap" -o /tmp/f.css
  URL=$(awk '/\/\* latin \*\//{f=1} f&&/src:/{match($0,/https:[^)]*/); print substr($0,RSTART,RLENGTH); exit}' /tmp/f.css)
  curl -s -o "$3" "$URL"; }
grab "Lora" 700 lora-latin-700.woff2
for w in 400 500 600 700; do grab "Plus+Jakarta+Sans" $w "plus-jakarta-sans-latin-$w.woff2"; done
grab "Space+Grotesk" 400 space-grotesk-latin-400.woff2
grab "Space+Grotesk" 500 space-grotesk-latin-500.woff2
rm -f /tmp/f.css
ls -la *.woff2
```

Pesos esperados (medidos): lora 700 = 21.0 KB, plus-jakarta 400/500/600/700 = 11.8/12.3/12.2/12.2 KB, space-grotesk 400/500 = 13.4/13.3 KB. **Total nuevo: 96.3 KB.**

- [ ] **Step 2: Escribir el test que falla**

Crear `apps/web/src/theme/fonts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const CSS = resolve(__dirname, '../index.css')
const PUBLIC = resolve(__dirname, '../../public')

describe('fuentes self-hosted', () => {
  it('cada url de @font-face apunta a un archivo que existe', () => {
    const css = readFileSync(CSS, 'utf8')
    const urls = [...css.matchAll(/url\('([^']+\.woff2)'\)/g)].map((m) => m[1]!)

    expect(urls.length).toBe(8)

    for (const url of urls) {
      const file = resolve(PUBLIC, url.replace(/^\//, ''))
      expect(existsSync(file), `falta ${url}`).toBe(true)
    }
  })

  it('declara las tres familias', () => {
    const css = readFileSync(CSS, 'utf8')
    expect(css).toContain("font-family: 'Lora'")
    expect(css).toContain("font-family: 'Plus Jakarta Sans'")
    expect(css).toContain("font-family: 'Space Grotesk'")
  })
})
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `pnpm --filter web test src/theme/fonts.test.ts`
Expected: FAIL. `urls.length` da 1 (solo el Lora 600 existente), no 8.

- [ ] **Step 4: Agregar los @font-face**

En `apps/web/src/index.css`, **debajo** del bloque `@font-face` de Lora 600 que ya existe, agregar. El `unicode-range` es el mismo subset latin del bloque existente; se repite en cada declaracion:

```css
/*
  Lora 700 para titulares de escritorio. El comentario del bloque de arriba
  decia que se bajaba un solo peso a proposito y que por eso el NavBar usa
  font-semibold: eso deja de valer aca, el 700 ahora es real.
*/
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/lora-latin-700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}

/*
  Plus Jakarta Sans: la tipografia de toda la UI. Cuatro pesos porque el
  handoff los usa: 400 cuerpo, 500 labels, 600 subtitulos, 700 botones.
*/
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/plus-jakarta-sans-latin-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/plus-jakarta-sans-latin-500.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/plus-jakarta-sans-latin-600.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/plus-jakarta-sans-latin-700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}

/*
  Space Grotesk: solo navegacion, en los dos breakpoints. El 400 es para los
  links secundarios del pie del drawer; el 500 para los items de menu.
*/
@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/space-grotesk-latin-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/space-grotesk-latin-500.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}
```

- [ ] **Step 5: Corregir el comentario obsoleto de Lora**

En el comentario del bloque `@font-face` de Lora 600 (arriba de todo en `index.css`), reemplazar la frase que dice que solo se carga un peso y que por eso el NavBar usa `font-semibold`. Texto nuevo:

```
  Dos pesos: el 600 para el wordmark y el 700 para titulares de escritorio. El
  unicode-range es el subset latin de Google Fonts. No es decorativo: si algun
  dia hay texto fuera de ese rango, el browser ni pide el archivo.
```

- [ ] **Step 6: Registrar las familias en Tailwind**

En `apps/web/tailwind.config.ts`, reemplazar el bloque `fontFamily` entero por:

```ts
      fontFamily: {
        // La UI entera. Los @font-face viven en index.css, self-hosted: la PWA
        // tiene que verse igual offline y no le pasamos la IP de cada visitante
        // a Google.
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        // Wordmark y titulares. El fallback es una serif de verdad y no la sans
        // del sistema: si la fuente tarda, la marca se degrada dentro de la
        // misma familia visual en vez de saltar de serif a palo seco.
        brand: ['Lora', 'Georgia', 'Times New Roman', 'serif'],
        // Solo navegacion, en los dos breakpoints.
        nav: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
```

- [ ] **Step 7: Correr el test para verificar que pasa**

Run: `pnpm --filter web test src/theme/fonts.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 8: Verificar el peso del precache**

Run: `pnpm --filter web build`
Expected: build verde. En la salida `PWA v1.2.0 / precache N entries (X KiB)`, X debe subir ~96 KB respecto de las 873.98 KiB previas. Si sube mucho mas, se colo un subset que no es el latin.

- [ ] **Step 9: Commit**

```bash
git add apps/web/public/fonts apps/web/src/index.css apps/web/tailwind.config.ts apps/web/src/theme/fonts.test.ts
git commit -m "feat(web): tipografia de marca en toda la app

Tres familias self-hosted: Plus Jakarta Sans para la UI, Lora para wordmark
y titulares, Space Grotesk para navegacion. 96 KB en siete woff2 subset
latin.

No van por el CDN de Google: la PWA tiene que verse igual offline y asi
tampoco le pasamos la IP de cada visitante a un tercero. Es la misma
decision que ya estaba tomada para Lora."
```

---

### Task 3: La paleta

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/index.css`
- Create: `apps/web/src/theme/palette.test.ts`
- Modify: `apps/web/src/layouts/RootLayout.tsx:7`
- Modify: `apps/web/src/components/ImprovementButton.tsx:84`
- Modify: `apps/web/src/components/ui/Modal.tsx:64`
- Modify: `apps/web/src/pages/ContactThreadPage.tsx:290`

**Interfaces:**
- Consumes: nada.
- Produces: la rampa `gray-*` con los valores de la maqueta; el color `canvas` (`#140e1c`); y las variables CSS `--bg --bg2 --card --card2 --line --line2 --fg --fg2 --fg3 --accent --accent2 --accent-soft --nav-active --red --red-soft --amber --amber-soft --yellow --yellow-soft --green --green-soft --blue --blue-soft`, expuestas en Tailwind como `bg-surface`, `bg-surface-alt`, `border-line`, `border-line-strong`, `text-fg`, `text-muted`, `text-faint`, `bg-canvas`, `text-nav-active`, `bg-nav-active`.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/src/theme/palette.test.ts`. Es el guard del cambio mas riesgoso del plan: 1081 clases en 40 archivos dependen de estos valores.

```ts
import { describe, it, expect } from 'vitest'
import config from '../../tailwind.config'

// Los valores salen de la maqueta de diseno (Home Desktop.html y su version
// clara). Si alguien los toca sin querer, este test avisa antes de que 40
// archivos cambien de color en silencio.
const GRAY: Record<string, string> = {
  50: '#f7f3fa',
  100: '#f4eef8',
  200: '#e4dbec',
  300: '#cec0dc',
  400: '#c3b6d0',
  500: '#5b4b6b',
  600: '#8d7f9c',
  700: '#372a48',
  800: '#241a31',
  900: '#241a31',
}

describe('paleta', () => {
  const colors = config.theme?.extend?.colors as Record<string, unknown>

  it('la rampa gris tiene los valores de la maqueta', () => {
    expect(colors['gray']).toEqual(GRAY)
  })

  it('canvas es el fondo de pagina en oscuro', () => {
    expect(colors['canvas']).toBe('#140e1c')
  })

  it('el violeta de marca no cambia', () => {
    const primary = colors['primary'] as Record<string, string>
    expect(primary['600']).toBe('#7c3aed')
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm --filter web test src/theme/palette.test.ts`
Expected: FAIL. `colors['gray']` es `undefined`: hoy la config no extiende `gray`, usa el de Tailwind.

- [ ] **Step 3: Escribir la rampa en la config**

En `apps/web/tailwind.config.ts`, dentro de `theme.extend.colors`, **antes** del bloque `primary`, agregar:

```ts
        // La rampa gris NO es gris: son los tokens de la maqueta metidos detras
        // de los nombres de clase que el codigo ya usa. Hay 1081 clases gray-*
        // en 40 archivos; refactorizarlas a tokens semanticos serian ~1300
        // ediciones y un diff irrevisable. Redefiniendo los valores, esos 40
        // archivos adoptan la paleta sin ser tocados.
        //
        // El mapeo sale de los pares que usa el codigo:
        //   bg-white / dark:bg-gray-800        -> card
        //   bg-gray-50 / dark:bg-gray-900      -> bg   (ver canvas)
        //   border-gray-200 / dark:border-gray-700 -> line
        //   text-gray-500 / dark:text-gray-400 -> fg2
        //   text-gray-900 / dark:text-gray-100 -> fg
        //
        // Dos tonos sirven a dos roles que la maqueta separa, y se unifican a
        // proposito:
        //   gray-700 es superficie oscura (75 usos) Y linea oscura (60 usos)
        //   gray-600 es texto secundario claro (71) Y borde oscuro (36)
        // Si alguno molesta en el recorrido visual, se editan a mano esos usos.
        // No se rehace el mapeo.
        gray: {
          50: '#f7f3fa',
          100: '#f4eef8',
          200: '#e4dbec',
          300: '#cec0dc',
          400: '#c3b6d0',
          500: '#5b4b6b',
          600: '#8d7f9c',
          700: '#372a48',
          800: '#241a31',
          900: '#241a31',
        },
        // gray-900 no puede ser el fondo de pagina en oscuro: se usa tambien
        // como text-gray-900 en claro, donde tiene que ser #241a31. Si fuera
        // #140e1c el fondo de pagina quedaria igual al de tarjeta y las
        // tarjetas desaparecerian. Por eso el fondo tiene nombre propio.
        canvas: '#140e1c',
        surface: 'var(--card)',
        'surface-alt': 'var(--card2)',
        line: 'var(--line)',
        'line-strong': 'var(--line2)',
        fg: 'var(--fg)',
        muted: 'var(--fg2)',
        faint: 'var(--fg3)',
        'nav-active': '#a855ff',
```

- [ ] **Step 4: Declarar las variables de tema**

En `apps/web/src/index.css`, **despues** del bloque `html.dark { color-scheme: dark; }` que ya existe, agregar:

```css
/*
  Los tokens de la maqueta. Mismos nombres en los dos temas: solo cambian los
  valores, tal como lo entrego diseno (el body de "Home Desktop Claro.html" es
  byte a byte identico al oscuro; lo unico distinto es este bloque).

  Los consume el codigo NUEVO de escritorio via las clases bg-surface,
  border-line, text-muted, etc. El codigo viejo sigue con las clases gray-*,
  que apuntan a estos mismos valores desde tailwind.config. Son dos caminos al
  mismo color: la convergencia se paga cuando S4 y S5 reescriban esas
  pantallas.
*/
:root {
  --bg: #f7f3fa;
  --bg2: #efe8f4;
  --card: #ffffff;
  --card2: #f7f3fa;
  --line: #e4dbec;
  --line2: #cec0dc;
  --fg: #241a31;
  --fg2: #5b4b6b;
  --fg3: #8d7f9c;
  --accent: #7c3aed;
  --accent2: #6d28d9;
  --accent-soft: rgba(124, 58, 237, 0.1);
  --red: #e03c26;
  --red-soft: rgba(224, 60, 38, 0.11);
  --amber: #d18a14;
  --amber-soft: rgba(209, 138, 20, 0.13);
  --yellow: #c0aa14;
  --yellow-soft: rgba(192, 170, 20, 0.14);
  --green: #1f8a48;
  --green-soft: rgba(31, 138, 72, 0.12);
  --blue: #2f7ede;
  --blue-soft: rgba(47, 126, 222, 0.12);

  /* El punto de seccion activa del menu. Igual en los dos temas a proposito.
     NO es el --signal ambar del README de marca: aquel significa urgencia
     temporal y va uno por vista; este marca seccion actual y hay uno siempre.
     La propia spec del menu los declara separados. */
  --nav-active: #a855ff;

  /* En claro las tarjetas suman sombra; en oscuro se apoyan solo en el borde. */
  --card-shadow: 0 1px 2px rgba(36, 26, 49, 0.05);
  --card-shadow-hover: 0 10px 22px rgba(36, 26, 49, 0.1);
  --header-bg: rgba(255, 255, 255, 0.86);
}

html.dark {
  --bg: #140e1c;
  --bg2: #1d1528;
  --card: #241a31;
  --card2: #2b2039;
  --line: #372a48;
  --line2: #443354;
  --fg: #f4eef8;
  --fg2: #c3b6d0;
  --fg3: #8d7f9c;
  --accent: #7c3aed;
  --accent2: #9a67f5;
  --accent-soft: rgba(124, 58, 237, 0.16);
  --red: #f0533f;
  --red-soft: rgba(240, 83, 63, 0.15);
  --amber: #e8a13a;
  --amber-soft: rgba(232, 161, 58, 0.15);
  --yellow: #d6c02f;
  --yellow-soft: rgba(214, 192, 47, 0.14);
  --green: #43c46a;
  --green-soft: rgba(67, 196, 106, 0.14);
  --blue: #569ef5;
  --blue-soft: rgba(86, 158, 245, 0.14);

  --card-shadow: none;
  --card-shadow-hover: none;
  --header-bg: rgba(20, 14, 28, 0.88);
}
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `pnpm --filter web test src/theme/palette.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Reparar los cuatro usos de dark:bg-gray-900**

Son los unicos cuatro lugares donde `gray-900` se usa como fondo. Con la rampa nueva quedarian del color de tarjeta y perderian el contraste. Reemplazar en cada uno:

| Archivo:linea | Buscar | Reemplazar por |
|---|---|---|
| `apps/web/src/layouts/RootLayout.tsx:7` | `dark:bg-gray-900` | `dark:bg-canvas` |
| `apps/web/src/components/ImprovementButton.tsx:84` | `dark:bg-gray-900` | `dark:bg-canvas` |
| `apps/web/src/pages/ContactThreadPage.tsx:290` | `dark:bg-gray-900` | `dark:bg-canvas` |
| `apps/web/src/components/ui/Modal.tsx:64` | `dark:bg-gray-900/40` | `dark:bg-canvas/40` |

- [ ] **Step 7: Verificar que no queda ninguno**

Run: `grep -rn "dark:bg-gray-900" apps/web/src/`
Expected: sin resultados.

- [ ] **Step 8: Typecheck, lint y build**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build`
Expected: los tres verdes.

- [ ] **Step 9: Recorrido visual**

Levantar `pnpm --filter web dev` y recorrer en **los dos temas**: Inicio (logueado y sin loguear), Mapa, Mis casos, Perfil, Admin, un detalle de caso, y un modal. Lo que se busca: texto ilegible sobre su fondo, bordes que desaparecieron, tarjetas que se confunden con la pagina.

Esta es la verificacion que importa de esta task. El test guarda los valores; el recorrido guarda que los valores sirvan.

- [ ] **Step 10: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/index.css apps/web/src/theme/palette.test.ts apps/web/src/layouts/RootLayout.tsx apps/web/src/components/ImprovementButton.tsx apps/web/src/components/ui/Modal.tsx apps/web/src/pages/ContactThreadPage.tsx
git commit -m "feat(web): paleta de la maqueta en toda la app

Los valores de la maqueta entran detras de los nombres de clase que el
codigo ya usa, en vez de refactorizar 1081 clases gray-* a tokens
semanticos. Los 40 archivos afectados adoptan la paleta sin ser tocados.

gray-900 no puede ser el fondo oscuro porque tambien es text-gray-900 en
claro: el fondo pasa a llamarse canvas, y los cuatro usos que lo pedian se
editan a mano.

Se agregan ademas los tokens semanticos como variables CSS, para que el
codigo nuevo de escritorio no dependa de nombres de gris."
```

---

### Task 4: Las primitivas

**Files:**
- Create: `apps/web/src/components/ui/UrgencyTag.tsx` + `.test.tsx`
- Create: `apps/web/src/components/ui/Chip.tsx` + `.test.tsx`
- Create: `apps/web/src/components/ui/Segmented.tsx` + `.test.tsx`
- Create: `apps/web/src/components/ui/Panel.tsx`
- Create: `apps/web/src/components/ui/Rail.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Interfaces:**
- Consumes: la paleta de la Task 3.
- Produces:
  - `<UrgencyTag level={1|2|3|4|5} />` — devuelve el chip con color **y** texto.
  - `URGENCY_LABEL: Record<number, string>` exportado desde `UrgencyTag.tsx`.
  - `<Chip active={boolean} onClick={() => void}>{children}</Chip>`
  - `<Segmented options={{id: string, label: string}[]} value={string} onChange={(id: string) => void} />`
  - `<Panel>{children}</Panel>` y `<Panel padded={false}>`
  - `<Rail>{children}</Rail>`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `apps/web/src/components/ui/UrgencyTag.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UrgencyTag from './UrgencyTag'

describe('UrgencyTag', () => {
  // Regla del handoff: el color de urgencia va SIEMPRE acompanado de texto,
  // nunca color solo. Este test es esa regla escrita.
  it('muestra el texto de la urgencia, no solo el color', () => {
    render(<UrgencyTag level={5} />)
    expect(screen.getByText('Critica')).toBeInTheDocument()
  })

  it('etiqueta cada nivel', () => {
    const esperado = ['Baja', 'Baja', 'Media', 'Alta', 'Critica']
    esperado.forEach((label, i) => {
      const { unmount } = render(<UrgencyTag level={i + 1} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    })
  })

  // El 4 va naranja y no rojo: en rojo se confundia con el 5. Regla que ya
  // existia en HomeFeed y que esta primitiva hereda.
  it('distingue el nivel 4 del 5', () => {
    const { container: c4 } = render(<UrgencyTag level={4} />)
    const clases4 = c4.firstElementChild!.className
    const { container: c5 } = render(<UrgencyTag level={5} />)
    const clases5 = c5.firstElementChild!.className
    expect(clases4).not.toBe(clases5)
  })

  it('cae a Media si el nivel es desconocido', () => {
    render(<UrgencyTag level={99} />)
    expect(screen.getByText('Media')).toBeInTheDocument()
  })
})
```

Crear `apps/web/src/components/ui/Chip.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chip from './Chip'

describe('Chip', () => {
  it('avisa cuando lo tocan', async () => {
    const onClick = vi.fn()
    render(<Chip active={false} onClick={onClick}>Perro</Chip>)
    await userEvent.click(screen.getByRole('button', { name: 'Perro' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('expone el estado activo a la accesibilidad', () => {
    render(<Chip active onClick={() => {}}>Gato</Chip>)
    expect(screen.getByRole('button', { name: 'Gato' })).toHaveAttribute('aria-pressed', 'true')
  })
})
```

Crear `apps/web/src/components/ui/Segmented.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Segmented from './Segmented'

const OPCIONES = [
  { id: 'all', label: 'Todos' },
  { id: 'found', label: 'Encontrados' },
  { id: 'lost', label: 'Buscados' },
]

describe('Segmented', () => {
  it('devuelve el id de la opcion elegida', async () => {
    const onChange = vi.fn()
    render(<Segmented options={OPCIONES} value="all" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Buscados' }))
    expect(onChange).toHaveBeenCalledWith('lost')
  })

  it('marca la opcion activa', () => {
    render(<Segmented options={OPCIONES} value="found" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Encontrados' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Instalar user-event y correr los tests para verificar que fallan**

```bash
cd apps/web && pnpm add -D @testing-library/user-event@^14
```

Run: `pnpm --filter web test src/components/ui/`
Expected: FAIL, "Cannot find module './UrgencyTag'".

- [ ] **Step 3: Escribir UrgencyTag**

Crear `apps/web/src/components/ui/UrgencyTag.tsx`:

```tsx
interface UrgencyTagProps {
  level: number
  className?: string
}

export const URGENCY_LABEL: Record<number, string> = {
  1: 'Baja',
  2: 'Baja',
  3: 'Media',
  4: 'Alta',
  5: 'Critica',
}

// El 4 va naranja y no rojo: en rojo se confundia con el 5. El 5 si pesa mas a
// proposito, es el que encabeza la grilla de urgentes.
const URGENCY_CLS: Record<number, string> = {
  1: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  2: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  3: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  4: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  5: 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200 font-semibold',
}

/**
 * Chip de urgencia. Regla del handoff: el color va SIEMPRE con texto, nunca
 * color solo. Por eso el componente no acepta una variante "solo color".
 */
export default function UrgencyTag({ level, className = '' }: UrgencyTagProps) {
  const label = URGENCY_LABEL[level] ?? 'Media'
  const cls = URGENCY_CLS[level] ?? URGENCY_CLS[3]

  return (
    <span
      className={['text-xs px-2 py-0.5 rounded-full font-medium', cls, className]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Escribir Chip**

Crear `apps/web/src/components/ui/Chip.tsx`:

```tsx
import type { ReactNode } from 'react'

interface ChipProps {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}

export default function Chip({ active, onClick, children, className = '' }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        // min-h-[36px] y no menos: el handoff pide 44px de toque, que se
        // completa con el gap vertical de la fila de chips.
        'px-3.5 py-2 min-h-[36px] rounded-full text-[13px] font-medium border transition-colors whitespace-nowrap',
        active
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 5: Escribir Segmented**

Crear `apps/web/src/components/ui/Segmented.tsx`:

```tsx
interface Option {
  id: string
  label: string
}

interface SegmentedProps {
  options: Option[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export default function Segmented({ options, value, onChange, className = '' }: SegmentedProps) {
  return (
    <div
      className={[
        'flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-[11px] p-[3px] w-fit',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={[
              'px-4 py-2 rounded-lg text-[13.5px] font-semibold transition-colors',
              active
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Escribir Panel y Rail**

Crear `apps/web/src/components/ui/Panel.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

/**
 * Tarjeta del rail. Distinta de Card: radio 16 en vez de 8, y la sombra sale
 * de --card-shadow, que en oscuro es none (ahi las tarjetas se apoyan solo en
 * el borde, como pide la maqueta).
 */
export default function Panel({ children, padded = true, className = '', ...rest }: PanelProps) {
  return (
    <div
      {...rest}
      style={{ boxShadow: 'var(--card-shadow)', ...rest.style }}
      className={[
        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden',
        padded ? 'p-[18px]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
```

Crear `apps/web/src/components/ui/Rail.tsx`:

```tsx
import type { ReactNode } from 'react'

interface RailProps {
  children: ReactNode
  className?: string
}

/**
 * Columna derecha de escritorio. Sticky en top 100px, como fija el handoff.
 * Regla que hay que respetar al llenarlo: el rail nunca contiene acciones
 * unicas — todo lo que vive aca existe tambien en el flujo principal.
 *
 * El "hidden lg:flex" vive ACA y no en quien lo usa: si el consumidor pasara
 * "hidden" por className contra un "flex" de esta base, ganaria el que Tailwind
 * emite ultimo en el CSS, no el que aparece ultimo en el string. El rail
 * quedaria visible en mobile de forma intermitente segun el orden de las
 * utilidades. Decidiendolo aca no hay conflicto posible.
 */
export default function Rail({ children, className = '' }: RailProps) {
  return (
    <aside
      className={['sticky top-[100px] hidden lg:flex lg:flex-col gap-5', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </aside>
  )
}
```

- [ ] **Step 7: Exportar desde el barrel**

Reemplazar `apps/web/src/components/ui/index.ts` por:

```ts
export { default as Button } from './Button'
export { default as Input } from './Input'
export { default as Card } from './Card'
export { default as Modal } from './Modal'
export { default as UrgencyTag, URGENCY_LABEL } from './UrgencyTag'
export { default as Chip } from './Chip'
export { default as Segmented } from './Segmented'
export { default as Panel } from './Panel'
export { default as Rail } from './Rail'
```

- [ ] **Step 8: Correr los tests para verificar que pasan**

Run: `pnpm --filter web test src/components/ui/`
Expected: PASS, 8 tests.

- [ ] **Step 9: Typecheck y lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: los dos verdes.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/ui/ apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): primitivas de escritorio

UrgencyTag, Chip, Segmented, Panel y Rail. Las van a consumir las cuatro
pantallas de escritorio, no solo Inicio.

UrgencyTag centraliza el mapa de urgencia que hoy esta duplicado en cuatro
lugares, con su regla: el 4 va naranja y no rojo porque en rojo se
confundia con el 5. Y no acepta variante sin texto: el handoff pide que el
color de urgencia vaya siempre acompanado."
```

---

### Task 5: Shell de escritorio y navegacion

**Files:**
- Modify: `apps/web/src/components/NavBar.tsx`
- Modify: `apps/web/src/pages/CasesPage.tsx:162`

**Interfaces:**
- Consumes: `font-nav` (Task 2), `--nav-active` y `--header-bg` (Task 3).
- Produces: header de 68px en `lg`, contenedor `max-w-[1408px] px-10`. Ningun export nuevo.

- [ ] **Step 1: Cambiar el contenedor y el alto del header**

En `apps/web/src/components/NavBar.tsx`, reemplazar la linea 80 (`<header ...>`) y el `<div>` de la 83.

El `<header>` pasa a:

```tsx
    <header
      className="border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 backdrop-blur-[14px]"
      style={{ paddingTop: 'env(safe-area-inset-top)', background: 'var(--header-bg)' }}
    >
```

Y el contenedor de adentro:

```tsx
      {/* h-16 en mobile, h-[68px] desde lg, como fija el handoff. Si cambia,
          mover tambien el calc de CasesPage, que depende de esta altura.
          ToastContainer NO depende: en desktop el toast va abajo (md:bottom-4)
          y su calc de arriba solo corre por debajo de md, donde el header
          sigue midiendo 64. */}
      <div className="max-w-6xl lg:max-w-[1408px] mx-auto px-4 lg:px-10 h-16 lg:h-[68px] flex items-center justify-between">
```

- [ ] **Step 2: Reemplazar el estilo de los links de navegacion**

En `apps/web/src/components/NavBar.tsx`, reemplazar `navLinkClass` (lineas 14-18) entero por:

```tsx
/*
  El activo se marca con un punto neon, no con un pill de fondo. En una lista
  vertical el pill pesa demasiado y compite con el boton "Reportar", que es del
  mismo violeta. El punto dice lo mismo con menos tinta.

  Los inactivos reservan el ancho del punto para que el label no salte al
  cambiar de seccion: por eso el <span> del punto existe siempre y solo cambia
  su color.
*/
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'font-nav font-medium tracking-[-0.005em] flex items-center gap-3 transition-colors',
    'text-[17px] h-12 px-3.5 rounded-xl lg:text-[15.5px] lg:h-auto lg:px-0 lg:rounded-none',
    isActive
      ? 'text-gray-900 dark:text-gray-100'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
  ].join(' ')

function NavDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="w-1.5 h-1.5 lg:w-[7px] lg:h-[7px] rounded-full flex-shrink-0"
      style={
        active
          ? {
              background: 'var(--nav-active)',
              boxShadow: '0 0 0 4px rgba(168,85,255,.22)',
            }
          : undefined
      }
    />
  )
}
```

- [ ] **Step 3: Usar el punto en cada NavLink**

Cada `NavLink` del nav de escritorio (lineas 97-124) y del drawer mobile (lineas 203-232) pasa a envolver su texto con el punto. El patron, aplicado a todos:

```tsx
          <NavLink to="/" end className={navLinkClass}>
            {({ isActive }) => (
              <>
                <NavDot active={isActive} />
                Inicio
              </>
            )}
          </NavLink>
```

Para "Mis casos", que lleva el globo de pendientes:

```tsx
              <NavLink to="/dashboard" className={navLinkClass}>
                {({ isActive }) => (
                  <>
                    <NavDot active={isActive} />
                    <span className="relative inline-flex items-center">
                      Mis casos
                      {badgeCount > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </NavLink>
```

Aplicar lo mismo a `/cases` (Mapa), `/profile` (Mi perfil) y `/admin` (Admin), en los dos bloques.

- [ ] **Step 4: Separar los items del nav de escritorio**

En el `<nav className="hidden md:flex items-center gap-1">` (linea 96), cambiar `gap-1` por `gap-[30px]`:

```tsx
        <nav className="hidden md:flex items-center gap-[30px]">
```

- [ ] **Step 5: Dejar "Reportar" como esta**

El boton "+ Reportar" conserva el pill violeta y su tipografia: es accion, no navegacion. No se toca ni el de escritorio (lineas 131-135) ni el de mobile (lineas 165-171). El `NavLink` a `/cases/new` que vive dentro del drawer (linea 224) **si** deja de ser un item de menu: reemplazarlo por el boton, debajo del ultimo NavLink:

```tsx
                <Link to="/cases/new" onClick={() => setOpen(false)} className="mt-2">
                  <Button variant="primary" size="md" fullWidth>
                    + Reportar un caso
                  </Button>
                </Link>
```

- [ ] **Step 6: Los links secundarios del pie del drawer**

En el bloque final del drawer, los links secundarios van en Space Grotesk 400 / 14px y sin punto. "Salir" ya existe como boton; se le suma "Como funciona" apuntando al ancla de la landing. **"Refugios" de la maqueta se omite: no existe en el producto.** El toggle de tema **se conserva**, aunque la maqueta del drawer no lo muestre.

Agregar, antes del bloque del toggle de tema:

```tsx
            <a
              href="/#como-funciona"
              onClick={() => setOpen(false)}
              className="font-nav text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3"
            >
              Como funciona
            </a>
```

- [ ] **Step 7: Hacer responsive el calc de CasesPage**

En `apps/web/src/pages/CasesPage.tsx:162`, reemplazar:

```tsx
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
```

por:

```tsx
    {/* El header mide 64 en mobile y 68 desde lg. Si cambia alla, cambia aca. */}
    <div className="flex flex-col h-[calc(100vh-64px)] lg:h-[calc(100vh-68px)]">
```

- [ ] **Step 8: Typecheck, lint y build**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build`
Expected: los tres verdes. Si el typecheck se queja del children de `NavLink`, es porque falta la forma de funcion `{({ isActive }) => ...}`.

- [ ] **Step 9: Recorrido visual**

Con `pnpm --filter web dev`:
- **Escritorio (>=1024px)**: header de 68px con blur al scrollear, contenedor de 1408, items separados 30px, punto violeta solo en la seccion actual, sin pill.
- **Mobile (<768px)**: abrir el drawer. Filas de 48px, texto 17px, punto de 6px con halo, "Reportar" como boton violeta, toggle de tema presente.
- **Sin salto**: cambiar de seccion y confirmar que los labels no se corren horizontalmente.
- **Los dos temas.**

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/NavBar.tsx apps/web/src/pages/CasesPage.tsx
git commit -m "feat(web): navegacion de marca y shell de escritorio

El activo pasa de pill violeta a punto neon, en los dos breakpoints:
diseno lo confirmo por escrito, es el sistema de navegacion de la marca y
no algo exclusivo de escritorio. El pill queda solo para Reportar, que es
accion y no navegacion.

Los inactivos reservan el ancho del punto para que el label no salte al
cambiar de seccion.

El header pasa a 68px desde lg con contenedor de 1408. Eso arrastra el
calc de CasesPage, que ahora es responsive. ToastContainer no se toca: en
desktop el toast va abajo y no depende del alto del header."
```

---

### Task 6: Endpoint de metricas de zona

**Files:**
- Create: `apps/api/src/modules/rescue/cases/cases.zone-stats.ts`
- Modify: `apps/api/src/modules/rescue/cases/cases.validators.ts`
- Modify: `apps/api/src/modules/rescue/cases/cases.service.ts`
- Modify: `apps/api/src/modules/rescue/cases/cases.controller.ts`
- Modify: `apps/api/src/modules/rescue/cases/cases.routes.ts`
- Modify: `apps/api/src/modules/rescue/cases/cases.integration.test.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `GET /api/v1/cases/zone-stats?lat&lng&radius` devolviendo
  `{ activeCases: number, resolvedThisMonth: number, byUrgency: { critica: number, alta: number, media: number, baja: number }, byListingType: { found: number, lost: number } }`.
  Export `getZoneStats(query: ZoneStatsQuery): Promise<ZoneStats>` desde `cases.zone-stats.ts`, reexportado por `cases.service.ts`.

- [ ] **Step 1: Escribir el schema de validacion**

En `apps/api/src/modules/rescue/cases/cases.validators.ts`, junto a `nearbyCasesSchema`, agregar:

```ts
export const zoneStatsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(10),
});
```

- [ ] **Step 2: Escribir los tests de integracion que fallan**

En `apps/api/src/modules/rescue/cases/cases.integration.test.ts`, agregar `getZoneStats: vi.fn()` al `vi.mock('./cases.service', ...)` del principio, y al final del archivo agregar:

```ts
describe('GET /api/v1/cases/zone-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve las metricas de la zona', async () => {
    vi.mocked(svc.getZoneStats).mockResolvedValue({
      activeCases: 12,
      resolvedThisMonth: 19,
      byUrgency: { critica: 1, alta: 1, media: 2, baja: 8 },
      byListingType: { found: 6, lost: 2 },
    });

    const res = await request(app)
      .get('/api/v1/cases/zone-stats')
      .query({ lat: -34.17, lng: -60.79, radius: 20 });

    expect(res.status).toBe(200);
    expect(res.body.activeCases).toBe(12);
    expect(res.body.byUrgency.critica).toBe(1);
    expect(vi.mocked(svc.getZoneStats)).toHaveBeenCalledWith({
      lat: -34.17,
      lng: -60.79,
      radius: 20,
    });
  });

  it('usa radio 10 por defecto', async () => {
    vi.mocked(svc.getZoneStats).mockResolvedValue({
      activeCases: 0,
      resolvedThisMonth: 0,
      byUrgency: { critica: 0, alta: 0, media: 0, baja: 0 },
      byListingType: { found: 0, lost: 0 },
    });

    await request(app).get('/api/v1/cases/zone-stats').query({ lat: -34.17, lng: -60.79 });

    expect(vi.mocked(svc.getZoneStats)).toHaveBeenCalledWith({
      lat: -34.17,
      lng: -60.79,
      radius: 10,
    });
  });

  it('rechaza sin coordenadas con el formato de error estandar', async () => {
    const res = await request(app).get('/api/v1/cases/zone-stats');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('lat');
  });

  it('rechaza un radio fuera de rango', async () => {
    const res = await request(app)
      .get('/api/v1/cases/zone-stats')
      .query({ lat: -34.17, lng: -60.79, radius: 500 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('radius');
  });

  // La ruta se registra antes de /:id. Si se registrara despues, Express
  // tomaria "zone-stats" como un id de caso y devolveria 404 o 400.
  it('no la intercepta la ruta /:id', async () => {
    vi.mocked(svc.getZoneStats).mockResolvedValue({
      activeCases: 3,
      resolvedThisMonth: 0,
      byUrgency: { critica: 0, alta: 0, media: 3, baja: 0 },
      byListingType: { found: 3, lost: 0 },
    });

    const res = await request(app)
      .get('/api/v1/cases/zone-stats')
      .query({ lat: -34.17, lng: -60.79 });

    expect(res.status).toBe(200);
    expect(vi.mocked(svc.getCaseById)).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `pnpm --filter api test cases.integration`
Expected: FAIL. `svc.getZoneStats` no existe.

- [ ] **Step 4: Escribir la consulta**

Crear `apps/api/src/modules/rescue/cases/cases.zone-stats.ts`:

```ts
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db';

export interface ZoneStatsQuery {
  lat: number;
  lng: number;
  radius: number;
}

export interface ZoneStats {
  activeCases: number;
  resolvedThisMonth: number;
  byUrgency: { critica: number; alta: number; media: number; baja: number };
  byListingType: { found: number; lost: number };
}

interface ZoneStatsDbRow {
  activeCases: string;
  resolvedThisMonth: string;
  critica: string;
  alta: string;
  media: string;
  baja: string;
  found: string;
  lost: string;
}

/**
 * Metricas del rail de Inicio. Una sola pasada por la tabla: los seis
 * contadores salen de FILTER sobre el mismo WHERE geografico, en vez de seis
 * consultas con el mismo ST_DWithin.
 *
 * Los conteos por urgencia y por tipo miran solo casos abiertos: son la
 * leyenda de lo que se ve en el mapa, no un historico.
 */
export async function getZoneStats(query: ZoneStatsQuery): Promise<ZoneStats> {
  const { lat, lng, radius } = query;

  const [row] = await sequelize.query<ZoneStatsDbRow>(
    `SELECT
       COUNT(*) FILTER (WHERE c.status IN ('abierto', 'en_rescate')) AS "activeCases",
       COUNT(*) FILTER (
         WHERE c.status = 'resuelto'
           AND c.updated_at >= date_trunc('month', NOW())
       ) AS "resolvedThisMonth",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 5) AS "critica",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 4) AS "alta",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 3) AS "media",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level <= 2) AS "baja",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.listing_type = 'found') AS "found",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.listing_type = 'lost') AS "lost"
     FROM cases c
     WHERE ST_DWithin(
       c.location::geography,
       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
       :radiusM
     )`,
    {
      replacements: { lat, lng, radiusM: radius * 1000 },
      type: QueryTypes.SELECT,
    },
  );

  // COUNT devuelve bigint, que el driver serializa como string. Sin el Number
  // la respuesta JSON saldria con comillas y el front sumaria strings.
  const n = (v: string | undefined): number => Number(v ?? 0);

  return {
    activeCases: n(row?.activeCases),
    resolvedThisMonth: n(row?.resolvedThisMonth),
    byUrgency: {
      critica: n(row?.critica),
      alta: n(row?.alta),
      media: n(row?.media),
      baja: n(row?.baja),
    },
    byListingType: {
      found: n(row?.found),
      lost: n(row?.lost),
    },
  };
}
```

- [ ] **Step 5: Reexportar desde el service**

Al final de `apps/api/src/modules/rescue/cases/cases.service.ts`, agregar:

```ts
export { getZoneStats } from './cases.zone-stats';
export type { ZoneStatsQuery, ZoneStats } from './cases.zone-stats';
```

- [ ] **Step 6: Escribir el handler**

En `apps/api/src/modules/rescue/cases/cases.controller.ts`, agregar `zoneStatsSchema` al import de `./cases.validators`, `getZoneStats` al import de `./cases.service`, y el handler debajo de `getNearby`:

```ts
export async function getZoneStatsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = zoneStatsSchema.parse(req.query);
    const stats = await getZoneStats(query);
    res.json(stats);
  } catch (err) {
    handleError(err, res, next);
  }
}
```

- [ ] **Step 7: Registrar la ruta ANTES de /:id**

En `apps/api/src/modules/rescue/cases/cases.routes.ts`, agregar `getZoneStatsHandler` al import y la ruta entre `/feed` y `/:id`:

```ts
// Public routes
casesRouter.get('/', getCases);
casesRouter.get('/nearby', getNearby);
casesRouter.get('/feed', getFeed);
// Antes de '/:id' a proposito: si fuera despues, Express tomaria "zone-stats"
// como el id de un caso.
casesRouter.get('/zone-stats', getZoneStatsHandler);
casesRouter.get('/:id', getCase);
```

- [ ] **Step 8: Correr los tests para verificar que pasan**

Run: `pnpm --filter api test cases.integration`
Expected: PASS, incluidos los 5 nuevos.

- [ ] **Step 9: Verificar el SQL contra la base de verdad**

La suite mockea `../../../db`, asi que **ningun test de arriba ejecuta la consulta**. Sin este paso no hay evidencia de que el SQL corra.

Correr contra Supabase, dentro de una transaccion que se revierte:

```sql
BEGIN;
SELECT
  COUNT(*) FILTER (WHERE c.status IN ('abierto', 'en_rescate')) AS "activeCases",
  COUNT(*) FILTER (WHERE c.status = 'resuelto' AND c.updated_at >= date_trunc('month', NOW())) AS "resolvedThisMonth",
  COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 5) AS "critica",
  COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 4) AS "alta",
  COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 3) AS "media",
  COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level <= 2) AS "baja",
  COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.listing_type = 'found') AS "found",
  COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.listing_type = 'lost') AS "lost"
FROM cases c
WHERE ST_DWithin(
  c.location::geography,
  ST_SetSRID(ST_MakePoint(-60.79, -34.17), 4326)::geography,
  20000
);
ROLLBACK;
```

Expected: una fila con ocho columnas numericas, sin error de sintaxis ni de tipo. Comparar `activeCases` contra un `SELECT COUNT(*) FROM cases WHERE status IN ('abierto','en_rescate')` acotado a la misma zona: tienen que coincidir.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/rescue/cases/
git commit -m "feat(cases): metricas de zona para el rail de Inicio

GET /cases/zone-stats devuelve casos activos, resueltos del mes y el
desglose por urgencia y por tipo. Solo lectura, sin migrations.

Los ocho contadores salen de FILTER sobre un unico WHERE geografico, en
vez de ocho consultas repitiendo el mismo ST_DWithin.

La ruta se registra antes de /:id: si fuera despues, Express tomaria
zone-stats como el id de un caso. Hay un test que lo fija."
```

---

### Task 7: Inicio en escritorio

**Files:**
- Modify: `apps/web/src/services/cases.service.ts`
- Create: `apps/web/src/components/cases/ZoneStatsPanel.tsx`
- Create: `apps/web/src/components/cases/UrgencyLegend.tsx`
- Modify: `apps/web/src/components/cases/HomeFeed.tsx`

**Interfaces:**
- Consumes: `Panel`, `Rail`, `Chip`, `Segmented`, `UrgencyTag` (Task 4); `GET /cases/zone-stats` (Task 6).
- Produces: `getZoneStats(params: { lat: number; lng: number; radius: number }): Promise<ZoneStats>` en el service del front.

- [ ] **Step 1: Cliente del endpoint**

En `apps/web/src/services/cases.service.ts`, agregar:

```ts
export interface ZoneStats {
  activeCases: number
  resolvedThisMonth: number
  byUrgency: { critica: number; alta: number; media: number; baja: number }
  byListingType: { found: number; lost: number }
}

export async function getZoneStats(params: {
  lat: number
  lng: number
  radius: number
}): Promise<ZoneStats> {
  const res = await api.get<ZoneStats>('/cases/zone-stats', { params })
  return res.data
}
```

- [ ] **Step 2: Panel de metricas**

Crear `apps/web/src/components/cases/ZoneStatsPanel.tsx`:

```tsx
import { Panel } from '../ui'
import type { ZoneStats } from '../../services/cases.service'

interface Props {
  stats: ZoneStats | null
  loading: boolean
}

/**
 * La maqueta muestra cuatro metricas; dos de ellas ("voluntarios cerca" y
 * "respuesta media") necesitan producto que todavia no existe y viven en un
 * bloque posterior. Este panel muestra las dos que si son calculables mas el
 * desglose por tipo.
 */
export default function ZoneStatsPanel({ stats, loading }: Props) {
  const items = [
    { value: stats?.activeCases, label: 'casos activos' },
    { value: stats?.resolvedThisMonth, label: 'resueltos este mes' },
    { value: stats?.byListingType.found, label: 'encontrados' },
    { value: stats?.byListingType.lost, label: 'buscados' },
  ]

  return (
    <Panel>
      <h3 className="text-[11.5px] font-bold tracking-[0.13em] uppercase text-gray-600 dark:text-gray-400 mb-3.5">
        Tu zona
      </h3>
      <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
        {items.map((it) => (
          <div key={it.label} className="bg-white dark:bg-gray-800 px-4 py-3.5">
            <b className="block font-brand text-[25px] font-bold leading-none text-gray-900 dark:text-gray-100">
              {loading ? '—' : (it.value ?? 0)}
            </b>
            <span className="block mt-1.5 text-xs text-gray-600 dark:text-gray-400">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
```

- [ ] **Step 3: Leyenda por urgencia**

Crear `apps/web/src/components/cases/UrgencyLegend.tsx`:

```tsx
import { Panel } from '../ui'
import type { ZoneStats } from '../../services/cases.service'

interface Props {
  stats: ZoneStats | null
}

// Los colores salen de las variables de tema, que cambian con el modo. El
// texto acompana siempre al color: es regla del handoff.
const FILAS = [
  { key: 'critica', label: 'Critica', color: 'var(--red)' },
  { key: 'alta', label: 'Alta', color: 'var(--amber)' },
  { key: 'media', label: 'Media', color: 'var(--yellow)' },
  { key: 'baja', label: 'Baja', color: 'var(--green)' },
] as const

export default function UrgencyLegend({ stats }: Props) {
  if (!stats) return null

  return (
    <Panel>
      <h3 className="text-[11.5px] font-bold tracking-[0.13em] uppercase text-gray-600 dark:text-gray-400 mb-3.5">
        Por urgencia
      </h3>
      <div className="flex flex-col gap-2.5">
        {FILAS.map((f) => (
          <div
            key={f.key}
            className="flex items-center gap-2.5 text-[13.5px] text-gray-700 dark:text-gray-300"
          >
            <i
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: f.color }}
            />
            {f.label}
            <span className="ml-auto text-xs text-gray-600 dark:text-gray-400 tabular-nums">
              {stats.byUrgency[f.key]}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
```

- [ ] **Step 4: Traer las metricas en HomeFeed**

En `apps/web/src/components/cases/HomeFeed.tsx`, agregar al import de servicios `getZoneStats` y el tipo `ZoneStats`, y junto a los otros `useState`:

```tsx
  const [stats, setStats] = useState<ZoneStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
```

Y un efecto al lado del de urgentes:

```tsx
  // Solo alimenta el rail, que no existe por debajo de lg. Se pide igual: el
  // breakpoint es CSS y el componente es el mismo, y una peticion de lectura
  // mas por cambio de zona no justifica meter logica de viewport en JS.
  //
  // Bandera y no AbortController como los efectos de arriba: getZoneStats no
  // recibe signal. Un controller aca seria una variable sin usar que ademas
  // mentiria sobre estar cancelando algo.
  useEffect(() => {
    if (!loc) return
    let cancelled = false
    setStatsLoading(true)
    getZoneStats({ lat: loc.center[0], lng: loc.center[1], radius: 10 })
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loc])
```

- [ ] **Step 5: Selector de orden**

El backend ya acepta `sort: 'recent' | 'urgency' | 'distance'`. Agregar el estado:

```tsx
  const [sort, setSort] = useState<'recent' | 'urgency' | 'distance'>('recent')
```

Pasarlo a `listCases` (reemplazando el `sort: 'recent'` fijo de la linea 181) y sumarlo al array de dependencias del efecto de la lista y al efecto que resetea `page`.

El control, dentro de la barra de filtros y visible solo en escritorio:

```tsx
            <label className="hidden lg:flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400">
              Ordenar por
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5"
              >
                <option value="distance">Mas cercanos</option>
                <option value="recent">Mas recientes</option>
                <option value="urgency">Mas urgentes</option>
              </select>
            </label>
```

- [ ] **Step 6: Contenedor y grilla**

Reemplazar el contenedor de la linea 213:

```tsx
      <div className="max-w-2xl lg:max-w-[1408px] mx-auto px-4 lg:px-10 pt-5 lg:pt-8 pb-28">
```

La seccion de urgentes (linea 254) deja de ser carrusel en escritorio:

```tsx
              {/* En mobile scrollea; desde lg es grilla de 4. El handoff
                  prohibe carruseles cortados en escritorio. */}
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:grid lg:grid-cols-4 lg:gap-[18px] lg:overflow-visible lg:mx-0 lg:px-0">
```

Y en `UrgentCard`, el ancho fijo `w-44` pasa a `w-44 lg:w-auto` para que la tarjeta llene su celda de la grilla.

- [ ] **Step 7: El split de contenido y rail**

Envolver la seccion de la lista y el rail. La `<section>` de "Lista completa" (linea 268) pasa a estar dentro de:

```tsx
        <div className="lg:grid lg:grid-cols-[1fr_392px] lg:gap-8 lg:items-start">
          <section>
            {/* ...lo que ya habia... */}
          </section>

          <Rail className="hidden lg:flex">
            <ZoneStatsPanel stats={stats} loading={statsLoading} />
            <UrgencyLegend stats={stats} />
          </Rail>
        </div>
```

La lista de resultados (linea 321) pasa a dos columnas en escritorio:

```tsx
            <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-4">
```

- [ ] **Step 8: Reemplazar los chips y las tabs por las primitivas**

El bloque de tabs (lineas 272-286) pasa a `<Segmented options={TABS.map(t => ({ id: t.id, label: t.label }))} value={tab} onChange={(id) => setTab(id as Tab)} />`.

El bloque de chips (lineas 289-305) pasa a:

```tsx
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 lg:flex-wrap lg:overflow-visible">
            {ANIMAL_CHIPS.map((c) => (
              <Chip
                key={c.value}
                active={animalType === c.value}
                onClick={() => setAnimalType(c.value as AnimalType | '')}
              >
                {c.label}
              </Chip>
            ))}
          </div>
```

Y el chip de urgencia de `UrgentCard` (linea 89) pasa a `<UrgencyTag level={row.urgencyLevel} />`, borrando los `URGENCY_CLS` y `URGENCY_LABEL` locales de las lineas 30-41.

- [ ] **Step 9: Typecheck, lint y build**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build`
Expected: los tres verdes.

- [ ] **Step 10: Correr toda la suite**

Run: `pnpm --filter web test && pnpm --filter api test`
Expected: web verde; api con sus 247 previos mas los 5 de la Task 6.

- [ ] **Step 11: Recorrido visual**

Con `pnpm --filter web dev`, logueado y con zona elegida:
- **Escritorio**: urgentes en grilla de 4 sin scroll horizontal; lista en 2 columnas; rail a la derecha pegado al scrollear; metricas con numeros reales; leyenda con los conteos; selector de orden funcionando (cambiar a "Mas urgentes" y ver que la lista se reordena).
- **Mobile**: sin rail, urgentes en carrusel, lista de una columna. **Nada cambio respecto de antes.**
- **Los dos temas** en los dos breakpoints.
- **Zona sin casos**: metricas en cero, sin romper.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/components/cases/ apps/web/src/services/cases.service.ts
git commit -m "feat(web): Inicio en escritorio

Grilla de urgentes de 4 en vez del carrusel cortado, lista en dos
columnas, selector de orden y rail con metricas de zona y leyenda por
urgencia.

Es el mismo componente con clases responsive, no uno nuevo: por debajo de
lg todo queda exactamente como estaba.

El selector de orden no necesito backend: listCases ya aceptaba
recent/urgency/distance y nadie lo estaba exponiendo."
```

---

## Cierre

- [ ] **Correr todo junto**

```bash
pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test && pnpm --filter web build
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
```

- [ ] **Abrir el PR**

```bash
git push -u origin feat/desktop-cimientos-inicio
gh pr create --title "feat(web): cimientos de escritorio e Inicio (S0+S1)"
```

En el cuerpo del PR, marcar lo que un revisor tiene que mirar con atencion:

1. **El remapeo de la rampa gris** (Task 3) afecta 40 archivos sin tocarlos. Lo que hay que revisar no es el diff, es el recorrido visual.
2. **`gray-600` y `gray-700` sirven a dos roles cada uno** y se unificaron a proposito. Estan documentados en el comentario de la config.
3. **La navegacion cambia tambien en mobile.** No es un descuido: diseno lo confirmo por escrito.
4. **Que no se toco nada por debajo de `lg`** salvo la navegacion y la paleta.

## Lo que este plan NO hace

Queda anotado para que nadie lo busque en el diff:

- "Voluntarios cerca" y "respuesta media" del rail: son features propias y van con el bloque de agregados.
- "Refugios" en el pie del drawer: no existe en el producto.
- Convergencia entre las clases `gray-*` y los tokens semanticos: se paga cuando S4 y S5 reescriban esas pantallas.
- Fira Code: pendiente de respuesta de diseno.
- Backfill de tests de los 40 componentes que ya existen.
