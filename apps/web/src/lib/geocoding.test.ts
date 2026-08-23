import { describe, it, expect } from 'vitest'
import {
  parseLocalidad, buildLocalidadUrl, buildCalleUrl, buildDireccionIntentos,
  stripViaPrefix, isInsideBBox,
} from './geocoding'
import type { Localidad } from './geocoding'

const pehuajo: Localidad = {
  name: 'Pehuajó',
  label: 'Pehuajó, Partido de Pehuajó, Buenos Aires, Argentina',
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

  it('conserva el display_name entero para poder desambiguar en la lista', () => {
    // Hay una localidad llamada "San Martin" en casi cada provincia. Con el
    // nombre corto solo, las cinco opciones del desplegable son la misma
    // palabra cinco veces.
    const loc = parseLocalidad({
      name: 'San Martín',
      display_name: 'San Martín, Departamento de San Martín, Mendoza, Argentina',
      lat: '-33.08',
      lon: '-68.46',
      boundingbox: ['-33.2', '-32.9', '-68.6', '-68.3'],
    })
    expect(loc?.name).toBe('San Martín')
    expect(loc?.label).toBe('San Martín, Departamento de San Martín, Mendoza, Argentina')
  })

  it('descarta un resultado sin boundingbox en vez de inventarlo', () => {
    // Sin caja no hay ancla, y sin ancla la busqueda de calle vuelve a poder
    // aterrizar en otra provincia. Preferimos no ofrecer esa localidad.
    expect(parseLocalidad({
      name: 'X', display_name: 'X', lat: '-35', lon: '-61',
    })).toBeNull()
  })

  it('descarta un resultado con lat o lon invalidos aunque boundingbox sea valido', () => {
    // Un NaN que escape acá falla lejos, en el mapa. Mejor rechazarlo acá
    // donde se origina el error.
    expect(parseLocalidad({
      name: 'X',
      display_name: 'X, Argentina',
      lat: '',
      lon: '-61',
      boundingbox: ['-35.85', '-35.77', '-61.95', '-61.85'],
    })).toBeNull()
    expect(parseLocalidad({
      name: 'X',
      display_name: 'X, Argentina',
      lat: '-35',
      lon: 'invalid',
      boundingbox: ['-35.85', '-35.77', '-61.95', '-61.85'],
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

describe('stripViaPrefix', () => {
  it('saca el tipo de via que OSM no guarda', () => {
    // En Pehuajo la calle esta como "Leandro N. Alem": con "Avenida" adelante
    // y bounded=1, Nominatim devuelve cero.
    expect(stripViaPrefix('Avenida Alem')).toBe('Alem')
    expect(stripViaPrefix('Av. San Martin')).toBe('San Martin')
    expect(stripViaPrefix('AVENIDA Mitre')).toBe('Mitre')
    expect(stripViaPrefix('Calle 9')).toBe('9')
    expect(stripViaPrefix('Pje. Los Andes')).toBe('Los Andes')
  })

  it('devuelve null cuando no habia prefijo', () => {
    expect(stripViaPrefix('Alem')).toBeNull()
    expect(stripViaPrefix('Leandro N. Alem')).toBeNull()
  })

  it('no toca las vias donde el prefijo es parte del nombre', () => {
    // "Ruta Nacional 5" sin prefijo queda "Nacional 5", y "Diagonal 74" queda
    // "74": un numero suelto que puede aterrizar en cualquier cosa de la caja.
    expect(stripViaPrefix('Ruta 5')).toBeNull()
    expect(stripViaPrefix('Diagonal 74')).toBeNull()
  })

  it('no deja una calle vacia cuando el prefijo es todo lo escrito', () => {
    expect(stripViaPrefix('Avenida')).toBeNull()
    expect(stripViaPrefix('Av.')).toBeNull()
  })
})

describe('buildDireccionIntentos', () => {
  it('va de lo mas preciso a lo mas tolerante', () => {
    const intentos = buildDireccionIntentos('Avenida Alem', '850', pehuajo)
    expect(intentos).toHaveLength(4)
    expect(intentos[0].url).toContain('Avenida%20Alem%20850')
    expect(intentos[1].url).toContain('Alem%20850')
    expect(intentos[2].url).toContain('q=Avenida%20Alem')
    expect(intentos[3].url).toContain('q=Alem')
  })

  it('marca cuales intentos llevan la altura', () => {
    // El texto que se le muestra al usuario depende de esto: si acerto uno sin
    // altura, el pin esta sobre la calle y no en la cuadra.
    const intentos = buildDireccionIntentos('Avenida Alem', '850', pehuajo)
    expect(intentos.map((i) => i.conNumero)).toEqual([true, true, false, false])
  })

  it('sin prefijo no repite la misma busqueda dos veces', () => {
    const intentos = buildDireccionIntentos('Alem', '850', pehuajo)
    expect(intentos).toHaveLength(2)
    expect(intentos[0].conNumero).toBe(true)
    expect(intentos[1].conNumero).toBe(false)
  })

  it('sin numero busca la calle sola y no rompe', () => {
    const intentos = buildDireccionIntentos('Alem', '', pehuajo)
    expect(intentos).toHaveLength(1)
    expect(intentos[0].url).toContain('q=Alem')
    expect(intentos[0].url).not.toContain('undefined')
    expect(intentos[0].url).toContain('bounded=1')
    expect(intentos[0].conNumero).toBe(false)
  })

  it('un numero con espacios de sobra no ensucia la query', () => {
    expect(buildDireccionIntentos('Alem', '  850  ', pehuajo)[0].url).toContain('Alem%20850')
  })

  it('todos los intentos siguen acotados a la localidad', () => {
    // El fallback afloja el nombre de la calle, nunca la caja: sin esto,
    // "Alem" solo puede volver a aterrizar en otra provincia.
    for (const intento of buildDireccionIntentos('Avenida Alem', '850', pehuajo)) {
      expect(intento.url).toContain('bounded=1')
      expect(intento.url).toContain('viewbox=-61.95%2C-35.85%2C-61.85%2C-35.77')
      expect(intento.url).not.toContain('Pehuaj')
    }
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
