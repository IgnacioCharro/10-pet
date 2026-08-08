import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPasswordRequest } from '../services/auth.service'
import { Button, Card, Input } from '../components/ui'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <main className="flex items-center justify-center flex-1 px-4 py-10">
        <Card className="w-full max-w-md text-center">
          <p className="text-red-600 dark:text-red-300 mb-4">Link inválido o expirado.</p>
          <Link to="/forgot-password" className="text-primary-600 dark:text-primary-300 hover:underline text-sm">
            Solicitar un nuevo link
          </Link>
        </Card>
      </main>
    )
  }

  if (done) {
    return (
      <main className="flex items-center justify-center flex-1 px-4 py-10">
        <Card className="w-full max-w-md text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-semibold mb-2">Contraseña actualizada</h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
            Ya podés iniciar sesión con tu nueva contraseña.
          </p>
          <Button fullWidth onClick={() => navigate('/login')}>
            Ir al inicio de sesión
          </Button>
        </Card>
      </main>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await resetPasswordRequest(token, password)
      setDone(true)
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code
      if (code === 'INVALID_RESET_TOKEN') {
        setError('El link expiró o ya fue usado. Solicitá uno nuevo.')
      } else {
        setError('Hubo un error. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex items-center justify-center flex-1 px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2 text-center">Nueva contraseña</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
          Ingresá tu nueva contraseña. Debe tener al menos 8 caracteres.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nueva contraseña"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError(null)
            }}
          />

          <Input
            label="Repetir contraseña"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              if (error) setError(null)
            }}
            error={error}
          />

          <Button type="submit" loading={loading} fullWidth>
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
