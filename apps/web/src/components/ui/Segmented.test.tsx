import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Segmented from './Segmented'

const OPCIONES = [
  { id: 'all', label: 'Todos' },
  { id: 'found', label: 'Encontrados' },
  { id: 'lost', label: 'Buscados' },
]

describe('Segmented', () => {
  it('devuelve el id de la opcion elegida', async () => {
    const onChange = vi.fn()
    render(<Segmented options={OPCIONES} value="all" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Buscados' }))
    expect(onChange).toHaveBeenCalledWith('lost')
  })

  it('marca la opcion activa', () => {
    render(<Segmented options={OPCIONES} value="found" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Encontrados' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
  })

  // Protege contra violacion del handoff: area de toque minimo 44px en los
  // botones. Se cumplen con pseudo-elemento invisible sin alterar el layout.
  // Se chequea la clase porque jsdom no maqueta (getBoundingClientRect
  // devuelve ceros).
  it('cumple el area de toque minimo de 44px en cada boton con pseudo-elemento invisible', () => {
    const { container } = render(<Segmented options={OPCIONES} value="all" onChange={() => {}} />)
    const buttons = container.querySelectorAll('button')
    buttons.forEach((button) => {
      expect(button.className).toContain('after:h-11')
    })
  })
})
