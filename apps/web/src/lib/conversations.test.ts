import { describe, it, expect } from 'vitest'
import { esConversacionLegible, caseSummary, contraparte } from './conversations'
import type { ContactItem } from '../services/contacts.service'

const base: ContactItem = {
  id: 'c1',
  caseId: 'case1',
  initiatorId: 'yo',
  initiatorName: 'Nacho',
  responderId: 'otro',
  responderName: 'Tokyo',
  status: 'active',
  contactMethod: 'app',
  message: null,
  lastMessageAt: null,
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
  caseAnimalType: 'perro',
  caseLocationText: 'Alem 850',
}

describe('esConversacionLegible', () => {
  it('deja abrir el hilo aceptado y el ya cerrado', () => {
    // En completed el hilo se lee aunque no se escriba: el historial sigue ahi.
    expect(esConversacionLegible({ ...base, status: 'active' })).toBe(true)
    expect(esConversacionLegible({ ...base, status: 'completed' })).toBe(true)
  })

  it('no ofrece un hilo que todavia no existe o que fue rechazado', () => {
    expect(esConversacionLegible({ ...base, status: 'pending' })).toBe(false)
    expect(esConversacionLegible({ ...base, status: 'rejected' })).toBe(false)
  })
})

describe('caseSummary', () => {
  it('nombra la conversacion por su caso', () => {
    expect(caseSummary(base)).toBe('Perro · Alem 850')
  })

  it('no dice "Caso" para las especies que el dashboard no conocia', () => {
    // La copia local de etiquetas tenia tres especies de seis, asi que un
    // caballo o un ave caian al generico.
    expect(caseSummary({ ...base, caseAnimalType: 'caballo' })).toBe('Caballo · Alem 850')
    expect(caseSummary({ ...base, caseAnimalType: 'ave' })).toBe('Ave · Alem 850')
    expect(caseSummary({ ...base, caseAnimalType: 'vaca' })).toBe('Vaca · Alem 850')
  })

  it('aguanta un caso sin direccion y una especie desconocida', () => {
    expect(caseSummary({ ...base, caseLocationText: null })).toBe('Perro')
    expect(caseSummary({ ...base, caseAnimalType: null })).toBe('Caso · Alem 850')
  })
})

describe('contraparte', () => {
  it('devuelve al otro sin importar de que lado este quien mira', () => {
    expect(contraparte(base, 'yo')).toEqual({ id: 'otro', name: 'Tokyo' })
    expect(contraparte(base, 'otro')).toEqual({ id: 'yo', name: 'Nacho' })
  })
})
