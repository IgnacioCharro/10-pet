/**
 * Helpers para mostrar la ubicacion de un caso.
 *
 * El chequeo de 'undefined' estaba copiado en cinco vistas. No es paranoia:
 * hay casos viejos guardados con textos tipo "undefined 350, undefined" de
 * cuando el reverse geocoding contestaba a medias. El string existe en la DB
 * pero no sirve para mostrar, asi que lo tratamos como si no estuviera.
 *
 * Lo correcto seria limpiar esos registros y sacar el chequeo. Mientras tanto,
 * al menos vive en un solo lugar.
 */

/** El texto de ubicacion si sirve para mostrarlo, o null si no hay nada util. */
export function displayLocation(locationText: string | null | undefined): string | null {
  if (!locationText) return null
  if (locationText.includes('undefined')) return null
  const trimmed = locationText.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * La distancia como la leeria una persona.
 *
 * Un caso publicado desde el centro de la localidad, mirado por alguien que
 * eligio esa misma localidad, da 0.0 km. Es cierto, pero "0.0 km" se lee como
 * un dato roto; "en tu zona" dice lo mismo sin desconfianza.
 */
export function displayDistance(distanceKm: number | null | undefined): string | null {
  if (distanceKm == null) return null
  if (distanceKm < 0.1) return 'en tu zona'
  return `${distanceKm.toFixed(1)} km`
}
