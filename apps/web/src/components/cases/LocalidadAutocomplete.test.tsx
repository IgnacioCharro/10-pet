import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocalidadAutocomplete from './LocalidadAutocomplete'

const RESULT = {
  name: 'Pehuajó',
  display_name: 'Pehuajó, Partido de Pehuajó, Buenos Aires, Argentina',
  lat: '-35.8104933',
  lon: '-61.8990550',
  boundingbox: ['-35.85', '-35.77', '-61.95', '-61.85'],
}

describe('LocalidadAutocomplete', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([RESULT]) }),
    ))
  })

  it('entrega la caja junto con el nombre al elegir', async () => {
    const onSelect = vi.fn()
    render(<LocalidadAutocomplete value="" onChange={() => {}} onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('textbox'), 'Pehuajo')
    const opcion = await screen.findByRole('button', { name: /Pehuajó/ })
    await userEvent.click(opcion)

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Pehuajó', bbox: [-35.85, -35.77, -61.95, -61.85] }),
    )
  })

  it('no dispara un fetch por cada tecla', async () => {
    // La causa por la que el desplegable quedaba vacio: Nominatim corta por
    // cuota y el catch dejaba la lista en cero, sin decir nada.
    render(<LocalidadAutocomplete value="" onChange={() => {}} onSelect={() => {}} />)
    await userEvent.type(screen.getByRole('textbox'), 'Pehuajo')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(2)
  })
})
