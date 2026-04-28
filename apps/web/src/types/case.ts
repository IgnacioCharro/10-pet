export type AnimalType = 'perro' | 'gato' | 'otro'
export type CaseStatus = 'abierto' | 'en_rescate' | 'resuelto' | 'inactivo' | 'spam'
export type SortOrder = 'recent' | 'urgency' | 'distance'

export interface CaseItem {
  id: string
  userId: string
  animalType: AnimalType
  description: string
  status: CaseStatus
  resolutionType: string | null
  urgencyLevel: number
  lat: number
  lng: number
  locationText: string | null
  condition: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  distanceKm?: number
}

export interface CaseImageItem {
  id: string
  cloudinaryUrl: string
  cloudinaryPublicId: string
  position: number
}

export type CaseUpdateType =
  | 'status_change' | 'comment' | 'photo_added' | 'reactivated'
  | 'avistamiento' | 'medicacion' | 'veterinario' | 'comentario'

export interface CaseUpdateItem {
  id: string
  userId: string
  updateType: CaseUpdateType
  content: string | null
  createdAt: string
}

export interface CaseDetail extends CaseItem {
  images: CaseImageItem[]
  updates: CaseUpdateItem[]
  phoneContact?: string
}

export interface ListCasesQuery {
  lat?: number
  lng?: number
  radius?: number
  status?: CaseStatus
  animalType?: AnimalType
  urgencyMin?: number
  page?: number
  limit?: number
  sort?: SortOrder
}

export interface CreateCaseInput {
  animalType: AnimalType
  description: string
  location: { lat: number; lng: number }
  locationText?: string
  condition?: string
  urgencyLevel?: number
  phoneContact?: string
  imageIds?: string[]
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
