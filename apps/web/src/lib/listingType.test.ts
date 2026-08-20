import { describe, it, expect } from 'vitest'
import { LISTING_TYPE } from './listingType'

describe('LISTING_TYPE', () => {
  it('tiene una entrada propia para cada tipo de publicacion', () => {
    expect(Object.keys(LISTING_TYPE).sort()).toEqual(['at_risk', 'found', 'lost'])
  })

  it('no muestra un caso en riesgo como encontrado', () => {
    // El bug que este catalogo previene: con ternarios, at_risk caia en la rama
    // de found sin que el typecheck dijera nada.
    expect(LISTING_TYPE.at_risk.short).not.toBe(LISTING_TYPE.found.short)
    expect(LISTING_TYPE.at_risk.chipClass).not.toBe(LISTING_TYPE.found.chipClass)
  })
})
