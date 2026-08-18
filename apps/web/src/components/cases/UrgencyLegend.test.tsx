import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UrgencyLegend from './UrgencyLegend'
import type { ZoneStats } from '../../services/cases.service'

// Valores todos distintos entre si, misma razon que en ZoneStatsPanel.test:
// atrapar un cruce entre niveles (p.ej. "Alta" mostrando el conteo de "Baja").
const STATS: ZoneStats = {
  activeCases: 0,
  resolvedThisMonth: 0,
  byUrgency: { critica: 9, alta: 8, media: 7, baja: 6 },
  byListingType: { found: 0, lost: 0 },
}

describe('UrgencyLegend', () => {
  it('muestra el conteo correcto junto a cada nivel, sin cruzarlos', () => {
    render(<UrgencyLegend stats={STATS} />)
    // getByText('Critica') devuelve la fila entera (el label es un nodo de
    // texto suelto, no un elemento propio): se busca el span del conteo
    // adentro de esa misma fila para no comparar contra la fila siguiente.
    expect(screen.getByText('Critica').querySelector('span')).toHaveTextContent('9')
    expect(screen.getByText('Alta').querySelector('span')).toHaveTextContent('8')
    expect(screen.getByText('Media').querySelector('span')).toHaveTextContent('7')
    expect(screen.getByText('Baja').querySelector('span')).toHaveTextContent('6')
  })

  // Regla del handoff: el color de urgencia va SIEMPRE acompanado de texto,
  // nunca color solo. La leyenda es justamente texto explicando al color.
  it('acompana cada color con su etiqueta de texto', () => {
    render(<UrgencyLegend stats={STATS} />)
    expect(screen.getByText('Critica')).toBeInTheDocument()
    expect(screen.getByText('Alta')).toBeInTheDocument()
    expect(screen.getByText('Media')).toBeInTheDocument()
    expect(screen.getByText('Baja')).toBeInTheDocument()
  })

  it('sin stats no rompe: no renderiza nada', () => {
    const { container } = render(<UrgencyLegend stats={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
