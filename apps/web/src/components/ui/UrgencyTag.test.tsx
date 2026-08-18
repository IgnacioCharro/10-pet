import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UrgencyTag from './UrgencyTag'

describe('UrgencyTag', () => {
  // Regla del handoff: el color de urgencia va SIEMPRE acompanado de texto,
  // nunca color solo. Este test es esa regla escrita.
  it('muestra el texto de la urgencia, no solo el color', () => {
    render(<UrgencyTag level={5} />)
    expect(screen.getByText('Critica')).toBeInTheDocument()
  })

  it('etiqueta cada nivel', () => {
    const esperado = ['Baja', 'Baja', 'Media', 'Alta', 'Critica']
    esperado.forEach((label, i) => {
      const { unmount } = render(<UrgencyTag level={i + 1} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    })
  })

  // El 4 va naranja y no rojo: en rojo se confundia con el 5. Regla que ya
  // existia en HomeFeed y que esta primitiva hereda.
  it('distingue el nivel 4 del 5', () => {
    const { container: c4 } = render(<UrgencyTag level={4} />)
    const clases4 = c4.firstElementChild!.className
    const { container: c5 } = render(<UrgencyTag level={5} />)
    const clases5 = c5.firstElementChild!.className
    expect(clases4).not.toBe(clases5)
  })

  it('cae a Media si el nivel es desconocido', () => {
    render(<UrgencyTag level={99} />)
    expect(screen.getByText('Media')).toBeInTheDocument()
  })
})
