import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaseLocationInfo } from './CaseHeaderInfo'

describe('CaseLocationInfo — referencia repetida', () => {
  it('no repite la referencia cuando dice lo mismo que la direccion', () => {
    render(
      <CaseLocationInfo
        locationText="12 de Octubre y España"
        referenceNote="12 de octubre y Espana"
        whereabouts="en_la_calle"
      />,
    )
    expect(screen.getAllByText(/12 de Octubre y España/i)).toHaveLength(1)
  })

  it('muestra la referencia cuando aporta algo distinto', () => {
    render(
      <CaseLocationInfo
        locationText="12 de Octubre y España"
        referenceNote="frente al kiosco"
        whereabouts="en_la_calle"
      />,
    )
    expect(screen.getByText('frente al kiosco')).toBeTruthy()
  })

  it('muestra la referencia cuando no hay direccion', () => {
    render(
      <CaseLocationInfo locationText={null} referenceNote="frente al kiosco" whereabouts="desconocido" />,
    )
    expect(screen.getByText('frente al kiosco')).toBeTruthy()
  })
})
