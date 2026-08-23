/**
 * Consultas a Nominatim ancladas a una localidad.
 *
 * El bug que este modulo existe para matar: mandar la localidad como texto
 * dentro del query. Nominatim la trata como sugerencia y la ignora si encuentra
 * un match mejor en otra parte. Medido: "Avenida Alem 850, Salto, Argentina"
 * devuelve una casa en Almafuerte, Cordoba, a 600 km — y el wizard pedia
 * limit=1 y plantaba el pin ahi.
 *
 * La localidad se elige una vez de una lista y de ahi sale su boundingbox. Todo
 * lo que sigue va con viewbox + bounded=1, asi que el resultado no puede caer
 * afuera. Es una restriccion del servidor, no una validacion nuestra.
 */

const BASE = 'https://nominatim.openstreetmap.org/search'

/** El orden que usa Nominatim en `boundingbox`: sur, norte, oeste, este. */
export type BBox = [south: number, north: number, west: number, east: number]

export interface Localidad {
  /** Corto, para el input y para el texto de la direccion: "Pehuajo". */
  name: string
  /**
   * Completo, para el desplegable: "Pehuajo, Partido de Pehuajo, Buenos Aires".
   * Sin el, cinco resultados llamados "San Martin" se ven identicos en la lista
   * y elegir el correcto es adivinar.
   */
  label: string
  lat: number
  lng: number
  bbox: BBox
}

export interface NominatimRaw {
  name?: string
  display_name: string
  lat: string
  lon: string
  boundingbox?: string[]
}

/** `viewbox` va en orden oeste,sur,este,norte — distinto del de `boundingbox`. */
function viewboxParam(bbox: BBox): string {
  const [south, north, west, east] = bbox
  return `${west},${south},${east},${north}`
}

export function parseLocalidad(raw: NominatimRaw): Localidad | null {
  if (!raw.boundingbox || raw.boundingbox.length !== 4) return null
  const bbox = raw.boundingbox.map(Number) as BBox
  const lat = parseFloat(raw.lat)
  const lng = parseFloat(raw.lon)
  // Sin coordenadas validas o caja invalida, descartamos. Un NaN que escape acá
  // falla lejos (en el mapa), no en el modulo donde se origino.
  if (bbox.some(Number.isNaN) || Number.isNaN(lat) || Number.isNaN(lng)) return null
  return {
    name: raw.name || raw.display_name.split(',')[0].trim(),
    label: raw.display_name,
    lat,
    lng,
    bbox,
  }
}

export function buildLocalidadUrl(q: string): string {
  const params = new URLSearchParams({
    format: 'json',
    q: q.trim(),
    countrycodes: 'ar',
    limit: '5',
  })
  return `${BASE}?${params}`.replace(/\+/g, '%20')
}

function buildBoundedUrl(q: string, loc: Localidad, limit: number): string {
  const params = new URLSearchParams({
    format: 'json',
    q,
    countrycodes: 'ar',
    viewbox: viewboxParam(loc.bbox),
    bounded: '1',
    limit: String(limit),
  })
  return `${BASE}?${params}`.replace(/\+/g, '%20')
}

export function buildCalleUrl(calle: string, loc: Localidad): string {
  return buildBoundedUrl(calle.trim(), loc, 8)
}

/**
 * Los prefijos que la gente escribe y OSM no guarda. Medido en Pehuajo: la
 * calle esta como "Leandro N. Alem", asi que "Avenida Alem 850" con bounded=1
 * devuelve cero resultados, mientras que "Alem 850" acierta con altura exacta.
 *
 * Solo van los tipos de via que el nombre catastral suele omitir. "Ruta" y
 * "Diagonal" quedan afuera a proposito: ahi el prefijo es parte del nombre
 * ("Ruta Nacional 5"), y sacarlo dejaria un numero suelto que puede aterrizar
 * en cualquier otra cosa dentro de la caja.
 */
const PREFIJOS_VIA = /^(avenidas?|avda\.?|av\.?|calle|boulevard|bulevar|bv\.?|blvd\.?|pasaje|pje\.?)\s+(.+)$/i

/** Devuelve la calle sin su tipo de via, o null si no empezaba con uno. */
export function stripViaPrefix(calle: string): string | null {
  const m = calle.trim().match(PREFIJOS_VIA)
  return m ? m[2].trim() : null
}

export interface DireccionIntento {
  url: string
  /**
   * Si este intento lleva la altura. Cuando acierta uno que no la lleva, el pin
   * quedo sobre la calle y no en la cuadra, y eso hay que decirlo.
   */
  conNumero: boolean
}

/**
 * La cascada de busquedas para una direccion escrita a mano, de la mas precisa
 * a la mas tolerante. El primer intento que caiga dentro de la caja gana.
 *
 * El numero es una pista, no un requisito: en los pueblos del interior OSM casi
 * no tiene numeros de casa. Si falta o no existe, la busqueda cae sola a la
 * calle y el usuario termina de ubicar el pin arrastrandolo.
 */
export function buildDireccionIntentos(
  calle: string,
  numero: string,
  loc: Localidad,
): DireccionIntento[] {
  const c = calle.trim()
  const n = numero.trim()
  const sinPrefijo = stripViaPrefix(c)
  // Sin duplicados: si no habia prefijo, el segundo nombre seria el mismo.
  const nombres = sinPrefijo && sinPrefijo !== c ? [c, sinPrefijo] : [c]

  const intentos: DireccionIntento[] = []
  if (n) {
    for (const nombre of nombres) {
      intentos.push({ url: buildBoundedUrl(`${nombre} ${n}`, loc, 1), conNumero: true })
    }
  }
  for (const nombre of nombres) {
    intentos.push({ url: buildBoundedUrl(nombre, loc, 1), conNumero: false })
  }
  return intentos
}

export function isInsideBBox(lat: number, lng: number, bbox: BBox): boolean {
  const [south, north, west, east] = bbox
  return lat >= south && lat <= north && lng >= west && lng <= east
}
