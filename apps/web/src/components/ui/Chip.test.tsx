import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chip from './Chip'

describe('Chip', () => {
  it('avisa cuando lo tocan', async () => {
    const onClick = vi.fn()
    render(<Chip active={false} onClick={onClick}>Perro</Chip>)
    await userEvent.click(screen.getByRole('button', { name: 'Perro' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('expone el estado activo a la accesibilidad', () => {
    render(<Chip active onClick={() => {}}>Gato</Chip>)
    expect(screen.getByRole('button', { name: 'Gato' })).toHaveAttribute('aria-pressed', 'true')
  })

  // Protege contra violacion del handoff: area de toque minimo 44px. El chip
  // pintado conserva 36px (maqueta), y los 44px se cumplen con un
  // pseudo-elemento invisible. Se chequea la clase porque jsdom no maqueta
  // (getBoundingClientRect devuelve ceros).
  it('cumple el area de toque minimo de 44px con pseudo-elemento invisible', () => {
    const { container } = render(<Chip active={false} onClick={() => {}}>Test</Chip>)
    const button = container.querySelector('button')
    expect(button?.className).toContain('after:h-11')
  })
})
