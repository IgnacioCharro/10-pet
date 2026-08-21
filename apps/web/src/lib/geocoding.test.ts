import { describe, it, expect } from 'vitest'
import {
  parseLocalidad, buildLocalidadUrl, buildCalleUrl, buildDireccionUrl, isInsideBBox,
} from './geocoding'
import type { Localidad } from './geocoding'

const pehuajo: Localidad = {
  name: 'Pehuajó',
  lat: -35.8104933,
  lng: -61.899055,
  bbox: [-35.85, -35.77, -61.95, -61.85],
}

describe('parseLocalidad', () => {
  it('se queda con las coordenadas y la caja que Nominatim ya devolvio', () => {
    const loc = parseLocalidad({
      name: 'Pehuajó',
      display_name: 'Pehuajó, Partido de Pehuajó, Buenos Aires, Argentina',
      lat: '-35.8104933',
      lon: '-61.8990550',
      boundingbox: ['-35.85', '-35.77', '-61.95', '-61.85'],
    })
    expect(loc?.name).toBe('Pehuajó')
    expect(loc?.bbox).toEqual([-35.85, -35.77, -61.95, -61.85])
  })

  it('descarta un resultado sin boundingbox en vez de inventarlo', () => {
    // Sin caja no hay ancla, y sin ancla la busqueda de calle vuelve a poder
    // aterrizar en otra provincia. Preferimos no ofrecer esa localidad.
    expect(parseLocalidad({
      name: 'X', display_name: 'X', lat: '-35', lon: '-61',
    })).toBeNull()
  })
})

describe('buildLocalidadUrl', () => {
  it('construye una URL valida sin acotar a bbox', () => {
    const url = buildLocalidadUrl('Pehuajo')
    expect(url).toContain('format=json')
    expect(url).toContain('q=Pehuajo')
    expect(url).toContain('countrycodes=ar')
    expect(url).not.toContain('viewbox')
  })
})

describe('buildCalleUrl', () => {
  it('acota la busqueda a la caja de la localidad', () => {
    const url = buildCalleUrl('San Martin', pehuajo)
    expect(url).toContain('bounded=1')
    expect(url).toContain('viewbox=-61.95%2C-35.85%2C-61.85%2C-35.77')
  })

  it('no manda el nombre de la localidad dentro del texto buscado', () => {
    // Esa era la causa raiz: como texto, Nominatim la ignora si encuentra un
    // match mejor en otra provincia.
    const url = buildCalleUrl('San Martin', pehuajo)
    expect(url).not.toContain('Pehuaj')
  })
})

describe('buildDireccionUrl', () => {
  it('incluye el numero cuando lo hay', () => {
    expect(buildDireccionUrl('Alem', '850', pehuajo)).toContain('Alem%20850')
  })

  it('sin numero busca la calle sola y no rompe', () => {
    const url = buildDireccionUrl('Alem', '', pehuajo)
    expect(url).toContain('q=Alem')
    expect(url).not.toContain('undefined')
    expect(url).toContain('bounded=1')
  })

  it('un numero con espacios de sobra no ensucia la query', () => {
    expect(buildDireccionUrl('Alem', '  850  ', pehuajo)).toContain('Alem%20850')
  })
})

describe('isInsideBBox', () => {
  it('acepta un punto de la localidad', () => {
    expect(isInsideBBox(-35.81, -61.89, pehuajo.bbox)).toBe(true)
  })

  it('rechaza el resultado de otra provincia', () => {
    // Almafuerte, Cordoba: el lugar exacto al que iba a parar el pin.
    expect(isInsideBBox(-32.19, -64.26, pehuajo.bbox)).toBe(false)
  })
})
