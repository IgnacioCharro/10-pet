import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { loginRequest } from '../services/auth.service'
import { getMe } from '../services/users.service'
import { useAuthStore } from '../stores/authStore'
import { Button, Card, Input } from '../components/ui'

interface LocationState {
  from?: { pathname: string }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setUser = useAuthStore((s) => s.setUser)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await loginRequest({ email, password })
      setAuth(res)
      getMe().then(setUser).catch(() => {})
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'No se pudo iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex items-center justify-center flex-1 px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">Iniciar sesión</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError(null)
            }}
          />

          <Input
            label="Contraseña"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError(null)
            }}
            error={error}
          />

          <Button type="submit" loading={loading} fullWidth>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" />
          <span>o</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <a href={`${import.meta.env.VITE_API_BASE_URL}/auth/google`} className="block">
          <Button variant="secondary" fullWidth type="button">
            Continuar con Google
          </Button>
        </a>

        <p className="text-sm text-gray-500 text-center mt-6">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-primary-600 hover:underline">
            Registrate
          </Link>
        </p>
      </Card>
    </main>
  )
}
