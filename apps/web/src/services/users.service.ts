import { api } from '../lib/api'
import type { AuthUser } from '../stores/authStore'
import type { CaseItem } from '../types/case'

export const getMe = async (): Promise<AuthUser> => {
  const res = await api.get<AuthUser>('/users/me')
  return res.data
}

export const patchMe = async (input: { name?: string }): Promise<AuthUser> => {
  const res = await api.patch<AuthUser>('/users/me', input)
  return res.data
}

export const getMyCases = async (): Promise<CaseItem[]> => {
  const res = await api.get<{ cases: CaseItem[] }>('/users/me/cases')
  return res.data.cases
}
