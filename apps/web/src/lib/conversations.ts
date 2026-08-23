import type { AnimalType } from '../types/case'
import type { ContactItem } from '../services/contacts.service'
import { ANIMAL_LABEL } from './animalType'

/**
 * El hilo existe desde que se acepta la solicitud y se sigue leyendo cuando se
 * completa. En pending y rejected no hay nada que abrir.
 */
export function esConversacionLegible(item: ContactItem): boolean {
  return item.status === 'active' || item.status === 'completed'
}

/**
 * Como se nombra una conversacion: el caso del que salio.
 *
 * Usa ANIMAL_LABEL, el mismo mapa que el resto de la app. La copia local que
 * vivia en el dashboard tenia tres especies de seis, asi que una conversacion
 * sobre un caballo o un ave se rotulaba "Caso".
 */
export function caseSummary(item: ContactItem): string {
  const animal = ANIMAL_LABEL[item.caseAnimalType as AnimalType] ?? 'Caso'
  const location = item.caseLocationText ?? ''
  return location ? `${animal} · ${location}` : animal
}

/** Quien esta del otro lado del hilo, mirado desde `userId`. */
export function contraparte(item: ContactItem, userId: string): {
  id: string
  name: string | null
} {
  return item.initiatorId === userId
    ? { id: item.responderId, name: item.responderName }
    : { id: item.initiatorId, name: item.initiatorName }
}
