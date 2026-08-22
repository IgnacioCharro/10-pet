import { describe, it, expect } from 'vitest'
import { WHEREABOUTS_LABEL, WHEREABOUTS_PIN, isSheltered, deriveWhereabouts, pinBorderColor, PIN_LEGEND } from './whereabouts'
import type { Whereabouts } from '../types/case'

describe('whereabouts', () => {
  it('cubre exactamente los cuatro valores', () => {
    expect(Object.keys(WHEREABOUTS_LABEL).sort()).toEqual([
      'con_quien_publica', 'con_un_tercero', 'desconocido', 'en_la_calle',
    ])
    expect(Object.keys(WHEREABOUTS_PIN).sort()).toEqual(Object.keys(WHEREABOUTS_LABEL).sort())
  })

  it('a resguardo son exactamente los dos del medio', () => {
    const all: Whereabouts[] = ['en_la_calle', 'con_quien_publica', 'con_un_tercero', 'desconocido']
    expect(all.filter(isSheltered)).toEqual(['con_quien_publica', 'con_un_tercero'])
  })

  it('un animal buscado no cuenta como a resguardo', () => {
    // El caso que importa: 'desconocido' es la ausencia de dato, no una garantia.
    // Si cayera del lado de "a resguardo", los perros perdidos desaparecerian
    // del mapa por defecto, que es justo donde tienen que estar.
    expect(isSheltered('desconocido')).toBe(false)
  })
})

describe('deriveWhereabouts', () => {
  it('un animal buscado no tiene paradero conocido', () => {
    expect(deriveWhereabouts('lost', 'con_quien_publica')).toBe('desconocido')
  })

  it('en found respeta lo que eligio el usuario', () => {
    expect(deriveWhereabouts('found', 'con_un_tercero')).toBe('con_un_tercero')
  })

  it('en found sin eleccion, el animal quedo donde estaba', () => {
    expect(deriveWhereabouts('found', 'en_la_calle')).toBe('en_la_calle')
  })
})

describe('pinBorderColor', () => {
  it('un animal a resguardo se distingue de uno en la calle', () => {
    expect(pinBorderColor('con_quien_publica', false))
      .not.toBe(pinBorderColor('en_la_calle', false))
  })

  it('el caso propio gana sobre el paradero', () => {
    // Reconocer los casos de uno mismo es mas util que su paradero: ya sabes
    // donde esta tu animal.
    expect(pinBorderColor('en_la_calle', true)).toBe('#7c3aed')
  })
})

describe('PIN_LEGEND', () => {
  it('nombra todos los colores de borde que el mapa puede pintar', () => {
    const posibles = new Set([
      ...Object.keys(WHEREABOUTS_LABEL).map((w) => pinBorderColor(w as Whereabouts, false)),
      pinBorderColor('en_la_calle', true),
    ])
    expect(new Set(PIN_LEGEND.map((f) => f.color))).toEqual(posibles)
  })
})
