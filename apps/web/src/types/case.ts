export type AnimalType = 'perro' | 'gato' | 'caballo' | 'vaca' | 'ave' | 'otro'
export type AnimalCondition = 'herido' | 'sano' | 'asustado' | 'debil' | 'no_pude_acercarme'
export type AnimalSex = 'macho' | 'hembra' | 'desconocido'
export type AnimalSize = 'chico' | 'mediano' | 'grande'
export type AnimalColor = 'negro' | 'blanco' | 'marron' | 'gris' | 'dorado' | 'manchado' | 'tricolor'
export type CaseStatus = 'abierto' | 'en_rescate' | 'resuelto' | 'inactivo' | 'spam'
export type SortOrder = 'recent' | 'urgency' | 'distance'
export type ListingType = 'found' | 'lost'

export interface CaseItem {
  id: string
  userId: string
  listingType: ListingType
  animalType: AnimalType
  title: string
  publicCode: string
  description: string
  status: CaseStatus
  resolutionType: string | null
  urgencyLevel: number
  lat: number
  lng: number
  locationText: string | null
  referenceNote: string | null
  animalCondition: AnimalCondition | null
  animalSex: AnimalSex | null
  animalSize: AnimalSize | null
  animalColor: AnimalColor | null
  seenAt: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  distanceKm?: number
  heroUrl?: string | null
}

export interface CaseImageItem {
  id: string
  cloudinaryUrl: string
  cloudinaryPublicId: string
  position: number
}

// Los cuatro primeros son legacy: hay filas viejas y se siguen renderizando, pero no
// se ofrecen al crear. 'medicacion' se dio de baja, absorbido por 'veterinario'.
export type CaseUpdateType =
  | 'status_change' | 'comment' | 'photo_added' | 'reactivated'
  | 'avistamiento' | 'alojamiento' | 'salud' | 'veterinario' | 'comentario'

export interface CaseUpdateItem {
  id: string
  userId: string
  updateType: CaseUpdateType
  content: string | null
  /** Quien aloja al animal. Solo lo traen las novedades de tipo 'alojamiento'. */
  hostName: string | null
  createdAt: string
}

export interface CaseVolunteer {
  userId: string
  userName: string | null
  status: 'active' | 'completed'
}

export interface CaseDetail extends CaseItem {
  images: CaseImageItem[]
  updates: CaseUpdateItem[]
  phoneContact?: string
  publisherName?: string | null
  volunteers?: CaseVolunteer[]
}

export interface ListCasesQuery {
  lat?: number
  lng?: number
  radius?: number
  status?: CaseStatus
  animalType?: AnimalType
  listingType?: ListingType
  urgencyMin?: number
  page?: number
  limit?: number
  sort?: SortOrder
  animalSex?: AnimalSex
  animalSize?: AnimalSize
  animalColor?: AnimalColor
}

export interface CreateCaseInput {
  listingType: ListingType
  animalType: AnimalType
  title: string
  description: string
  location: { lat: number; lng: number }
  locationText?: string
  referenceNote?: string
  animalCondition?: AnimalCondition
  urgencyLevel?: number
  phoneContact?: string
  imageIds?: string[]
  animalSex?: AnimalSex
  animalSize?: AnimalSize
  animalColor?: AnimalColor
  seenAt?: string
}

export interface PaginatedCasesResponse {
  cases: CaseItem[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}
