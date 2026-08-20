import { ANIMAL_LABEL, CONDITION_LABEL } from './animalType'
import type { AnimalType, AnimalSize, AnimalCondition } from '../types/case'

/**
 * Genero de cada especie, para que el tamano y el estado concuerden: "Ave
 * mediana, herida" y no "Ave mediano, herido".
 */
const ANIMAL_GENDER: Record<AnimalType, 'm' | 'f'> = {
  perro: 'm',
  gato: 'm',
  caballo: 'm',
  vaca: 'f',
  ave: 'f',
  otro: 'm',
}

/**
 * Pasa a femenino un adjetivo escrito en masculino. Alcanza con la terminacion
 * en -o porque los adjetivos que usamos o terminan asi (chico, mediano, herido,
 * sano, asustado) o son invariables (grande, debil).
 */
function toFeminine(word: string): string {
  return word.replace(/o$/, 'a')
}

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
  const concordar = ANIMAL_GENDER[animalType] === 'f' ? toFeminine : (w: string) => w
  const conTamano = animalSize ? `${especie} ${concordar(animalSize)}` : especie
  if (!animalCondition) return conTamano
  return `${conTamano}, ${concordar(CONDITION_LABEL[animalCondition].toLowerCase())}`
}
