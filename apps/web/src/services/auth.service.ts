import { api } from '../lib/api'
import type { AuthUser } from '../stores/authStore'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface RegisterInput {
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export const registerRequest = async (input: RegisterInput): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/register', input)
  return res.data
}

export const loginRequest = async (input: LoginInput): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/login', input)
  return res.data
}

export const logoutRequest = async (refreshToken: string): Promise<void> => {
  await api.post('/auth/logout', { refreshToken })
}
