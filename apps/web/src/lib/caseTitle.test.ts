import { describe, it, expect } from 'vitest'
import { suggestCaseTitle } from './caseTitle'

describe('suggestCaseTitle', () => {
  it('junta especie, tamano y estado', () => {
    expect(suggestCaseTitle('perro', 'mediano', 'herido')).toBe('Perro mediano, herido')
  })

  it('omite el tamano cuando no se eligio', () => {
    expect(suggestCaseTitle('gato', '', 'asustado')).toBe('Gato, asustado')
  })

  it('omite el estado cuando no se eligio', () => {
    expect(suggestCaseTitle('perro', 'grande', '')).toBe('Perro grande')
  })

  it('devuelve solo la especie cuando no hay nada mas', () => {
    expect(suggestCaseTitle('vaca', '', '')).toBe('Vaca')
  })

  it('devuelve vacio mientras no haya especie, para no precargar un titulo falso', () => {
    expect(suggestCaseTitle('', 'chico', 'herido')).toBe('')
  })

  it('escribe el estado en minuscula, que va en medio de la frase', () => {
    expect(suggestCaseTitle('ave', '', 'no_pude_acercarme')).toBe('Ave, no me pude acercar')
  })

  it('nunca pasa de los 120 caracteres que acepta el API', () => {
    expect(suggestCaseTitle('caballo', 'grande', 'no_pude_acercarme').length).toBeLessThanOrEqual(120)
  })
})
