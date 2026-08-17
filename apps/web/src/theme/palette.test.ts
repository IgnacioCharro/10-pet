import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

// A partir de aca, los tests leen el index.css real (igual que fonts.test.ts
// lee los @font-face reales) en vez de comparar contra una copia de los
// valores: lo que se guarda es la relacion entre :root, html.dark y
// tailwind.config, no un snapshot de hexadecimales.
const CSS = resolve(__dirname, '../index.css')

function extractBlocks(css: string, selectorRegex: RegExp): string[] {
  return [...css.matchAll(selectorRegex)].map((m) => m[1]!)
}

function extractCustomProps(blocks: string[]): Set<string> {
  const props = new Set<string>()
  for (const block of blocks) {
    for (const m of block.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)) {
      props.add(m[1]!)
    }
  }
  return props
}

describe('variables CSS del tema', () => {
  const css = readFileSync(CSS, 'utf8')
  // html.dark aparece dos veces en el archivo: el bloque viejo de
  // color-scheme y el bloque nuevo de variables. Se fusionan las dos
  // coincidencias; el bloque viejo no aporta ninguna --propiedad.
  const rootVars = extractCustomProps(extractBlocks(css, /:root\s*\{([^}]*)\}/g))
  const darkVars = extractCustomProps(extractBlocks(css, /html\.dark\s*\{([^}]*)\}/g))

  // --nav-active se declara solo en :root, a proposito: :root y html.dark
  // apuntan al mismo elemento <html>, asi que el valor puesto en :root ya
  // vale en dark sin redeclararlo (es literalmente lo que dice el Paso 4
  // del brief: "Igual en los dos temas a proposito"). Es la unica excepcion
  // conocida; se nombra aca para que quede como decision documentada y no
  // como laguna del chequeo. Cualquier otra variable asimetrica es un bug
  // real: una variable que existe en un tema y no en el otro cae en el
  // valor equivocado (o en `initial`) en silencio.
  const ROOT_ONLY_EXCEPTIONS = new Set(['--nav-active'])

  it('toda variable de :root existe tambien en html.dark (salvo la excepcion documentada)', () => {
    const missingInDark = [...rootVars].filter(
      (v) => !darkVars.has(v) && !ROOT_ONLY_EXCEPTIONS.has(v)
    )
    expect(
      missingInDark.length,
      `declaradas en :root pero no en html.dark: ${missingInDark.join(', ') || '(ninguna)'}`
    ).toBe(0)
  })

  it('toda variable de html.dark existe tambien en :root', () => {
    const missingInRoot = [...darkVars].filter((v) => !rootVars.has(v))
    expect(
      missingInRoot.length,
      `declaradas en html.dark pero no en :root: ${missingInRoot.join(', ') || '(ninguna)'}`
    ).toBe(0)
  })
})

describe('tokens semanticos sin referencias colgantes', () => {
  const css = readFileSync(CSS, 'utf8')
  const rootVars = extractCustomProps(extractBlocks(css, /:root\s*\{([^}]*)\}/g))
  const darkVars = extractCustomProps(extractBlocks(css, /html\.dark\s*\{([^}]*)\}/g))
  const declaredVars = new Set([...rootVars, ...darkVars])

  // Recorre theme.extend.colors buscando cada valor 'var(--x)' (bg-surface,
  // text-muted, etc.), sin importar cuan anidado este. Si el nombre no esta
  // en index.css, la clase de Tailwind se sigue emitiendo pero no resuelve
  // a ningun color: un typo o una variable borrada quedarian mudos hasta
  // que alguien lo viera en pantalla. Este test lo detecta antes.
  function collectVarRefs(node: unknown, path: string, out: { path: string; varName: string }[]) {
    if (typeof node === 'string') {
      const m = node.match(/^var\((--[a-zA-Z0-9-]+)\)$/)
      if (m) out.push({ path, varName: m[1]! })
      return
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        collectVarRefs(value, path ? `${path}.${key}` : key, out)
      }
    }
  }

  it('cada var(--x) usado en theme.extend.colors nombra una variable declarada en index.css', () => {
    const colors = config.theme?.extend?.colors as Record<string, unknown>
    const refs: { path: string; varName: string }[] = []
    collectVarRefs(colors, '', refs)

    // Si esto es 0, no hay ningun token que consuma variables: probablemente
    // el parseo se rompio (cambio el nombre de la key, o el bloque se movio
    // de lugar) y el test de abajo pasaria trivialmente sin chequear nada.
    expect(refs.length, 'no se encontro ningun token var(--x) en theme.extend.colors').toBeGreaterThan(0)

    const dangling = refs.filter((r) => !declaredVars.has(r.varName))
    const message = dangling.map((r) => `${r.path} -> ${r.varName}`).join(', ')
    expect(dangling.length, `tokens con var() colgante: ${message}`).toBe(0)
  })
})
