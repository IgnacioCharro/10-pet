import { ANIMAL_LABEL, CONDITION_LABEL } from './animalType'
import type { AnimalType, AnimalSize, AnimalCondition } from '../types/case'

/**
 * El titulo que el wizard precarga: "Perro mediano, herido".
 *
 * Devuelve vacio mientras no haya especie —precargar "Animal" apenas se abre el
 * paso seria ponerle al usuario un titulo que no eligio y que probablemente
 * publique tal cual.
 */
export function suggestCaseTitle(
  animalType: AnimalType | '',
  animalSize: AnimalSize | '',
  animalCondition: AnimalCondition | '',
): string {
  if (!animalType) return ''
  const especie = ANIMAL_LABEL[animalType]
  const conTamano = animalSize ? `${especie} ${animalSize}` : especie
  if (!animalCondition) return conTamano
  return `${conTamano}, ${CONDITION_LABEL[animalCondition].toLowerCase()}`
}
