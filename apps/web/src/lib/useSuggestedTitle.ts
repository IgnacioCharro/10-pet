import { useState } from 'react'
import { suggestCaseTitle } from './caseTitle'
import type { AnimalType, AnimalSize, AnimalCondition } from '../types/case'

/**
 * El titulo del wizard: precargado con la derivacion mientras el usuario no lo
 * haya tocado, suyo para siempre en cuanto lo edita.
 *
 * La sugerencia se calcula en el render y no en un efecto: con useEffect el
 * campo mostraria el valor viejo por un frame cada vez que cambia la especie.
 */
export function useSuggestedTitle(
  animalType: AnimalType | '',
  animalSize: AnimalSize | '',
  animalCondition: AnimalCondition | '',
): { title: string; setTitle: (v: string) => void } {
  const [edited, setEdited] = useState<string | null>(null)

  const setTitle = (v: string) => setEdited(v)

  return {
    title: edited ?? suggestCaseTitle(animalType, animalSize, animalCondition),
    setTitle,
  }
}
