import { api } from '../lib/api'
import type { AuthUser } from '../stores/authStore'

export const getMe = async (): Promise<AuthUser> => {
  const res = await api.get<AuthUser>('/users/me')
  return res.data
}
