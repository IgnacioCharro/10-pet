import { useState, type FormEvent } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { registerRequest } from '../services/auth.service'
import { useAuthStore } from '../stores/authStore'
import { Button, Card, Input } from '../components/ui'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)
    try {
      const res = await registerRequest({ email, password })
      setAuth(res)
      navigate('/verify-email', { replace: true, state: { emailSent: true } })
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'No se pudo crear la cuenta'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex items-center justify-center flex-1 px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">Crear cuenta</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Contraseña"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Mínimo 8 caracteres"
          />

          <Input
            label="Repetir contraseña"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            error={error}
          />

          <Button type="submit" loading={loading} fullWidth>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
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
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-primary-600 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </Card>
    </main>
  )
}
