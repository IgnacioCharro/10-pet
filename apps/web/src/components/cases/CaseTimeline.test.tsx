import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CaseTimeline, { updateTypesFor } from './CaseTimeline'
import type { Whereabouts } from '../../types/case'

// Salud y veterinaria no se ofrecen mientras el animal no este con nadie: en un caso
// buscado son el parte medico de un perro que todavia no aparecio.
describe('updateTypesFor', () => {
  it('ofrece las cinco cuando alguien lo tiene', () => {
    for (const w of ['con_quien_publica', 'con_un_tercero'] as Whereabouts[]) {
      expect(updateTypesFor(w)).toEqual([
        'avistamiento', 'alojamiento', 'salud', 'veterinario', 'comentario',
      ])
    }
  })

  it('esconde salud y veterinaria mientras nadie lo tenga', () => {
    for (const w of ['desconocido', 'en_la_calle'] as Whereabouts[]) {
      expect(updateTypesFor(w)).toEqual(['avistamiento', 'alojamiento', 'comentario'])
    }
  })
})

const base = {
  createdAt: '2026-08-01T12:00:00.000Z',
  status: 'abierto' as const,
  resolutionType: null,
  updates: [],
  assistances: [],
  isOwner: true,
  isAuthenticated: true,
  showAddUpdate: true,
  addUpdateType: 'comentario' as const,
  addUpdateContent: '',
  addUpdateHostName: '',
  addUpdateWhereabouts: 'con_quien_publica' as const,
  addUpdateLoading: false,
  onToggleForm: () => {},
  onTypeChange: () => {},
  onContentChange: () => {},
  onHostNameChange: () => {},
  onWhereaboutsChange: () => {},
  onSubmit: () => {},
  showVetForm: false,
  vetProcedure: '',
  vetMedication: '',
  vetLoading: false,
  onToggleVetForm: () => {},
  onVetProcedureChange: () => {},
  onVetMedicationChange: () => {},
  onVetSubmit: () => {},
}

describe('CaseTimeline segun el paradero', () => {
  it('un caso buscado no ofrece cargar atencion veterinaria', () => {
    render(<CaseTimeline {...base} whereabouts="desconocido" />)
    expect(screen.queryByText('+ Atención')).toBeNull()
    expect(screen.queryByText('Estado de salud')).toBeNull()
    expect(screen.queryByText('Atención veterinaria')).toBeNull()
    // El chip de alojamiento es el que destraba el resto, asi que tiene que estar.
    expect(screen.getByText('Ya está con alguien')).toBeTruthy()
  })

  it('con el animal a resguardo aparecen las cinco y el boton de atencion', () => {
    render(<CaseTimeline {...base} whereabouts="con_un_tercero" />)
    expect(screen.getByText('+ Atención')).toBeTruthy()
    expect(screen.getByText('Estado de salud')).toBeTruthy()
    expect(screen.getByText('Cambió de lugar')).toBeTruthy()
  })

  it('el nombre de quien aloja se pide solo si lo tiene un tercero', () => {
    const { rerender } = render(
      <CaseTimeline {...base} whereabouts="desconocido" addUpdateType="alojamiento" addUpdateWhereabouts="con_quien_publica" />,
    )
    expect(screen.queryByLabelText('¿Quién lo tiene?')).toBeNull()

    rerender(
      <CaseTimeline {...base} whereabouts="desconocido" addUpdateType="alojamiento" addUpdateWhereabouts="con_un_tercero" />,
    )
    expect(screen.getByLabelText('¿Quién lo tiene?')).toBeTruthy()
  })
})
