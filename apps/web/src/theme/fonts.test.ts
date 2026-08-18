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

  // El loop de arriba solo prueba que cada url exista en disco, no que sea el
  // archivo correcto para esa familia y ese peso. Un @font-face con el
  // font-family y font-weight bien puestos pero un src que apunta a OTRO
  // woff2 real (por ejemplo Lora 700 sirviendo el archivo de Plus Jakarta
  // Sans 400) pasaria ese test igual: el archivo existe, solo que es el que
  // no corresponde. Esta prueba reconstruye el nombre esperado a partir de la
  // familia y el peso declarados en cada bloque y lo compara contra el src
  // real, asi ese mismatch silencioso queda cubierto.
  it('cada bloque @font-face sirve el archivo que corresponde a su familia y peso', () => {
    const css = readFileSync(CSS, 'utf8')

    const familySlug: Record<string, string> = {
      Lora: 'lora',
      'Plus Jakarta Sans': 'plus-jakarta-sans',
      'Space Grotesk': 'space-grotesk',
    }

    const blocks = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]!)
    expect(blocks.length).toBe(8)

    for (const block of blocks) {
      const family = block.match(/font-family:\s*'([^']+)'/)?.[1]
      const weight = block.match(/font-weight:\s*(\d+)/)?.[1]
      const url = block.match(/url\('([^']+\.woff2)'\)/)?.[1]
      const label = `${family ?? '?'} ${weight ?? '?'}`

      expect(family, `bloque sin font-family reconocible: ${block}`).toBeTruthy()
      expect(weight, `bloque ${label} sin font-weight`).toBeTruthy()
      expect(url, `bloque ${label} sin url`).toBeTruthy()

      const slug = familySlug[family!]
      expect(slug, `familia sin slug mapeado: ${family}`).toBeTruthy()

      const expected = `/fonts/${slug}-latin-${weight}.woff2`
      expect(url, `bloque ${label} apunta a ${url}, se esperaba ${expected}`).toBe(expected)
    }
  })
})
