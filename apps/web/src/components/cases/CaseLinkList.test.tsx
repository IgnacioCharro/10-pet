import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CaseLinkList from './CaseLinkList'
import type { CaseItem } from '../../types/case'

const caso = (over: Partial<CaseItem> = {}): CaseItem => ({
  id: 'case-1',
  userId: 'user-1',
  listingType: 'found',
  animalType: 'perro',
  title: 'Perro chico en la plaza',
  publicCode: 'C-1019',
  description: 'Un perro chico',
  status: 'abierto',
  resolutionType: null,
  urgencyLevel: 2,
  lat: -34.6,
  lng: -58.4,
  locationText: null,
  referenceNote: null,
  animalCondition: null,
  animalSex: null,
  animalSize: null,
  animalColor: null,
  seenAt: null,
  whereabouts: 'en_la_calle',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  resolvedAt: null,
  ...over,
})

const montar = (items: CaseItem[]) =>
  render(
    <MemoryRouter>
      <CaseLinkList items={items} title="Casos publicados" emptyText="Todavía no publicó ningún caso." />
    </MemoryRouter>,
  )

describe('CaseLinkList', () => {
  // El motivo de la seccion: el perfil contaba casos sin dar forma de abrirlos.
  it('lleva a la pagina de cada caso', () => {
    montar([caso(), caso({ id: 'case-2', title: 'Gato en el techo', animalType: 'gato' })])

    expect(screen.getByRole('link', { name: /Perro chico en la plaza/ })).toHaveAttribute('href', '/cases/case-1')
    expect(screen.getByRole('link', { name: /Gato en el techo/ })).toHaveAttribute('href', '/cases/case-2')
  })

  it('dice el estado de cada caso', () => {
    montar([caso({ status: 'resuelto' })])
    expect(screen.getByText('Resuelto')).toBeTruthy()
  })

  it('explica el vacio en vez de desaparecer', () => {
    montar([])
    expect(screen.getByText('Todavía no publicó ningún caso.')).toBeTruthy()
    expect(screen.getByText('Casos publicados')).toBeTruthy()
  })
})
