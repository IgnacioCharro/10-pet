import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getMe } from '../services/users.service'
import { Card } from '../components/ui'

const errorMessages: Record<string, string> = {
  GOOGLE_OAUTH_ERROR: 'No pudimos completar el login con Google. Intentá de nuevo.',
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)

  const accessToken = searchParams.get('accessToken')
  const refreshToken = searchParams.get('refreshToken')
  const errorCode = searchParams.get('error')

  useEffect(() => {
    if (errorCode) {
      setError(errorMessages[errorCode] ?? 'Error en el login con Google.')
      return
    }
    if (!accessToken || !refreshToken) {
      setError('Faltan credenciales en la respuesta.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        useAuthStore.setState({ accessToken, refreshToken })
        const user = await getMe()
        if (cancelled) return
        setAuth({ user, accessToken, refreshToken })
        navigate('/dashboard', { replace: true })
      } catch {
        if (cancelled) return
        useAuthStore.getState().clearAuth()
        setError('No pudimos cargar tu perfil. Intentá de nuevo.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, refreshToken, errorCode, navigate, setAuth])

  return (
    <main className="flex items-center justify-center flex-1 px-4 py-10">
      <Card className="w-full max-w-md text-center">
        {error ? (
          <>
            <h1 className="text-xl font-semibold mb-3">No pudimos iniciar sesión</h1>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Link to="/login" className="text-primary-600 hover:underline text-sm">
              Volver al login
            </Link>
          </>
        ) : (
          <p className="text-gray-500">Iniciando sesión…</p>
        )}
      </Card>
    </main>
  )
}
