import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocalidadAutocomplete from './LocalidadAutocomplete'
import type { Localidad } from '../../lib/geocoding'

const RESULT = {
  name: 'Pehuajó',
  display_name: 'Pehuajó, Partido de Pehuajó, Buenos Aires, Argentina',
  lat: '-35.8104933',
  lon: '-61.8990550',
  boundingbox: ['-35.85', '-35.77', '-61.95', '-61.85'],
}

/**
 * El componente es controlado: sin un padre que devuelva lo tecleado en `value`,
 * React repone el input vacio despues de cada tecla y el test mide un componente
 * que no existe en la app. Este wrapper es el padre que le falta.
 */
function Montado({ onSelect }: { onSelect?: (loc: Localidad) => void }) {
  const [value, setValue] = useState('')
  return <LocalidadAutocomplete value={value} onChange={setValue} onSelect={onSelect ?? (() => {})} />
}

describe('LocalidadAutocomplete', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([RESULT]) }),
    ))
  })

  it('entrega la caja junto con el nombre al elegir', async () => {
    const onSelect = vi.fn()
    render(<Montado onSelect={onSelect} />)

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
    render(<Montado />)
    await userEvent.type(screen.getByRole('textbox'), 'Pehuajo')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('muestra el nombre completo, no solo la palabra corta', async () => {
    // Es lo unico que distingue a un "San Martin" de otro.
    render(<Montado />)
    await userEvent.type(screen.getByRole('textbox'), 'Pehuajo')
    expect(
      await screen.findByRole('button', { name: RESULT.display_name }),
    ).toBeInTheDocument()
  })
})
