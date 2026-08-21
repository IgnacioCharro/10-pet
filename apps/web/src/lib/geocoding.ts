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
  name: string
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
 * El numero es una pista, no un requisito: en los pueblos del interior OSM casi
 * no tiene numeros de casa. Si falta o no existe, la busqueda cae sola a la
 * calle y el usuario termina de ubicar el pin arrastrandolo.
 */
export function buildDireccionUrl(calle: string, numero: string, loc: Localidad): string {
  const n = numero.trim()
  const q = n ? `${calle.trim()} ${n}` : calle.trim()
  return buildBoundedUrl(q, loc, 1)
}

export function isInsideBBox(lat: number, lng: number, bbox: BBox): boolean {
  const [south, north, west, east] = bbox
  return lat >= south && lat <= north && lng >= west && lng <= east
}
