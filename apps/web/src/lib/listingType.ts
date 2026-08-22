import type { ListingType } from '../types/case'

interface ListingTypeStyle {
  /** Chip de la tarjeta */
  short: string
  /** Ficha y panel del mapa */
  long: string
  /** Encabezado de la pagina del caso */
  upper: string
  chipClass: string
  ringClass: string
}

// Un Record exhaustivo y no ternarios: con `listingType === 'lost' ? A : B`, un
// valor nuevo cae en la rama del else sin que el typecheck se entere.
export const LISTING_TYPE: Record<ListingType, ListingTypeStyle> = {
  found: {
    short: 'Encontré',
    long: 'Encontrado',
    upper: 'ENCONTRADO',
    chipClass: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    ringClass: 'ring-1 ring-green-300',
  },
  lost: {
    short: 'Busco',
    long: 'Buscado',
    upper: 'BUSCADO',
    chipClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    ringClass: 'ring-1 ring-blue-300',
  },
}
