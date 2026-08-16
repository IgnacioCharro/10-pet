import { api } from '../lib/api'
import type { AuthUser } from '../stores/authStore'
import type { CaseItem } from '../types/case'

export const getMe = async (): Promise<AuthUser> => {
  const res = await api.get<AuthUser>('/users/me')
  return res.data
}

// isVet y vetLicense salieron del payload: el API los ignora, los otorga el
// panel de admin.
export const patchMe = async (input: { name?: string }): Promise<AuthUser> => {
  const res = await api.patch<AuthUser>('/users/me', input)
  return res.data
}

export const getMyCases = async (): Promise<CaseItem[]> => {
  const res = await api.get<{ cases: CaseItem[] }>('/users/me/cases')
  return res.data.cases
}

export const patchNotificationLocation = async (input: {
  lat: number
  lng: number
  radiusKm: number
}): Promise<void> => {
  await api.patch('/users/me/notification-location', input)
}

export const deleteNotificationLocation = async (): Promise<void> => {
  await api.delete('/users/me/notification-location')
}

export interface PublicProfile {
  id: string
  name: string | null
  isVet: boolean
  createdAt: string
  casesPublished: number
  casesVolunteered: number
}

export const getPublicProfile = async (userId: string): Promise<PublicProfile> => {
  const res = await api.get<PublicProfile>(`/users/${userId}`)
  return res.data
}
