import type { Whereabouts, ListingType } from '../types/case'

/**
 * Donde esta el animal ahora, que no es donde se lo vio.
 *
 * La ubicacion del caso siempre marca el avistamiento: el domicilio de quien
 * rescata no entra al sistema. Este catalogo es lo unico que traduce el enum a
 * pantalla; un Record exhaustivo convierte un valor nuevo en error de
 * compilacion, un objeto literal lo convierte en bug silencioso.
 */
export const WHEREABOUTS_LABEL: Record<Whereabouts, string> = {
  en_la_calle: 'Sigue donde lo vieron',
  con_quien_publica: 'A resguardo con quien publicó',
  con_un_tercero: 'A resguardo con otra persona',
  desconocido: 'Sin datos de dónde está',
}

/** Color del borde del pin en el mapa. El relleno lo sigue poniendo la urgencia. */
export const WHEREABOUTS_PIN: Record<Whereabouts, string> = {
  en_la_calle: '#f97316',
  con_quien_publica: '#22c55e',
  con_un_tercero: '#22c55e',
  desconocido: '#3b82f6',
}

/**
 * Si alguien lo tiene. Es la unica definicion de "a resguardo" del front.
 *
 * 'desconocido' NO cuenta: es la ausencia de dato, no una garantia. Un animal
 * perdido tiene que seguir apareciendo entre los que necesitan ayuda.
 */
export function isSheltered(w: Whereabouts): boolean {
  return w === 'con_quien_publica' || w === 'con_un_tercero'
}

/**
 * El paradero solo se le pregunta a quien se cruzo con un animal. Quien busca a
 * su mascota no sabe donde esta —esa es toda la historia—, asi que su respuesta
 * no se pide, y si llegara igual no se respeta.
 */
export function deriveWhereabouts(listingType: ListingType, chosen: Whereabouts): Whereabouts {
  return listingType === 'lost' ? 'desconocido' : chosen
}
