import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<string> | null = null

const refreshAccessToken = async (): Promise<string> => {
  const { refreshToken, setTokens, clearAuth } = useAuthStore.getState()
  if (!refreshToken) {
    clearAuth()
    throw new Error('No refresh token')
  }

  try {
    const res = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    )
    setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken })
    return res.data.accessToken
  } catch (err) {
    clearAuth()
    throw err
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequestConfig | undefined
    const status = error.response?.status
    const isRefreshCall = original?.url?.includes('/auth/refresh')

    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true
      try {
        refreshPromise ??= refreshAccessToken()
        const newToken = await refreshPromise
        refreshPromise = null
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`
        }
        return api(original)
      } catch (refreshErr) {
        refreshPromise = null
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(error)
  },
)
