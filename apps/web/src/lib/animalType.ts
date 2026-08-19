import type { AnimalType, AnimalCondition } from '../types/case'

// Estos dos vivian copiados en CaseCard, CaseDetailSheet, HomeFeed, LeafletMap,
// CasePage y PublishCasePage. Sumar una especie obligaba a tocar los seis.
export const ANIMAL_LABEL: Record<AnimalType, string> = {
  perro: 'Perro',
  gato: 'Gato',
  caballo: 'Caballo',
  vaca: 'Vaca',
  ave: 'Ave',
  otro: 'Otro',
}

export const ANIMAL_EMOJI: Record<AnimalType, string> = {
  perro: '🐕',
  gato: '🐈',
  caballo: '🐴',
  vaca: '🐄',
  ave: '🐦',
  otro: '🐾',
}

export const CONDITION_LABEL: Record<AnimalCondition, string> = {
  herido: 'Herido',
  sano: 'Sano',
  asustado: 'Asustado',
  debil: 'Débil',
  no_pude_acercarme: 'No me pude acercar',
}
