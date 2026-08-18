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
})
