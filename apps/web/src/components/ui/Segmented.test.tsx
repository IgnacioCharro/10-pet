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
})
