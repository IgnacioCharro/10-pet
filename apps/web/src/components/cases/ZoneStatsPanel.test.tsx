import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ZoneStatsPanel from './ZoneStatsPanel'
import type { ZoneStats } from '../../services/cases.service'

// Valores todos distintos entre si: si el mapeo cruzara dos campos (p.ej.
// mostrar resolvedThisMonth donde va activeCases), un test con numeros
// repetidos no lo detectaria.
const STATS: ZoneStats = {
  activeCases: 5,
  resolvedThisMonth: 2,
  byUrgency: { critica: 9, alta: 8, media: 7, baja: 6 },
  byListingType: { found: 3, lost: 1 },
}

describe('ZoneStatsPanel', () => {
  it('muestra cada metrica con su numero correspondiente, sin cruzarlas', () => {
    render(<ZoneStatsPanel stats={STATS} loading={false} />)

    // Se busca el numero por el hermano anterior de su etiqueta en vez de
    // por orden de aparicion, para que el test falle si el componente
    // cambia el orden de las tarjetas pero deja el numero pegado a la
    // etiqueta equivocada.
    expect(screen.getByText('casos activos').previousElementSibling).toHaveTextContent('5')
    expect(screen.getByText('resueltos este mes').previousElementSibling).toHaveTextContent('2')
    expect(screen.getByText('encontrados').previousElementSibling).toHaveTextContent('3')
    expect(screen.getByText('buscados').previousElementSibling).toHaveTextContent('1')
  })

  it('en cero cuando no hay stats (zona sin casos), sin romper', () => {
    render(<ZoneStatsPanel stats={null} loading={false} />)
    expect(screen.getByText('casos activos').previousElementSibling).toHaveTextContent('0')
    expect(screen.getByText('buscados').previousElementSibling).toHaveTextContent('0')
  })

  it('en loading muestra el placeholder, no un cero ni el valor viejo', () => {
    render(<ZoneStatsPanel stats={STATS} loading={true} />)
    expect(screen.getByText('casos activos').previousElementSibling).toHaveTextContent('—')
    // Los numeros de STATS no deberian filtrarse mientras carga.
    expect(screen.queryByText('5')).not.toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })
})
