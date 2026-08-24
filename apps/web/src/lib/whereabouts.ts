import type { Whereabouts, ListingType, AlojamientoWhereabouts } from '../types/case'

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

/** El violeta con el que el mapa marca los casos de uno mismo. */
const PIN_PROPIO = '#7c3aed'

/**
 * El borde del pin codifica el paradero; el relleno lo sigue poniendo la
 * urgencia. Antes el borde decia el tipo de publicacion, que era el dato menos
 * accionable de los tres.
 *
 * Vive aca y no en LeafletMap porque es una funcion pura del catalogo: testearla
 * dentro del mapa obligaria a levantar leaflet y markercluster bajo jsdom, un
 * import con efectos que puede fallar por el entorno y no por el codigo.
 */
export function pinBorderColor(whereabouts: Whereabouts, isOwn: boolean): string {
  return isOwn ? PIN_PROPIO : WHEREABOUTS_PIN[whereabouts]
}

/**
 * Las filas de la leyenda del mapa. Vive pegada a los colores a proposito: la
 * leyenda anterior estaba escrita a mano en CasesPage y sobrevivio tanto al
 * cambio de significado del borde como a la baja de 'at_risk', asi que seguia
 * explicando pines que ya no existian.
 */
export const PIN_LEGEND: { color: string; label: string }[] = [
  { color: WHEREABOUTS_PIN.en_la_calle, label: 'En la calle' },
  { color: WHEREABOUTS_PIN.con_quien_publica, label: 'A resguardo' },
  { color: WHEREABOUTS_PIN.desconocido, label: 'Sin datos' },
  { color: PIN_PROPIO, label: 'Tuyo' },
]

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

/**
 * Con que opcion abre el selector de paradero de la novedad de alojamiento.
 *
 * Arranca en el paradero que el caso ya tiene, para que contar un cambio de
 * alojamiento sobre un caso que ya estaba a resguardo no lo mueva sin que nadie
 * lo pida. 'desconocido' no es una opcion del selector, asi que cae en la
 * transicion mas comun: apareció y lo tiene quien publicó.
 */
export function paraderoInicial(actual: Whereabouts): AlojamientoWhereabouts {
  return actual === 'desconocido' ? 'con_quien_publica' : actual
}
