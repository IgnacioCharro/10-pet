import { describe, it, expect } from 'vitest'
import { timeAgo } from './time'

const haceHoras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

describe('timeAgo', () => {
  it('dice "hace unos minutos" antes de la hora', () => {
    expect(timeAgo(haceHoras(0.5))).toBe('hace unos minutos')
  })

  it('cuenta horas dentro del dia', () => {
    expect(timeAgo(haceHoras(5))).toBe('hace 5h')
  })

  it('cuenta dias hasta el mes', () => {
    expect(timeAgo(haceHoras(48))).toBe('hace 2d')
  })

  it('escribe "meses" completo y no "m", que se lee como minutos', () => {
    expect(timeAgo(haceHoras(24 * 65))).toBe('hace 2 meses')
  })
})
