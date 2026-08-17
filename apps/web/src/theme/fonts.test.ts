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
