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
