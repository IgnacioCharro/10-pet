import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPasswordRequest } from '../services/auth.service'
import { Button, Card, Input } from '../components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await forgotPasswordRequest(email)
      setSent(true)
    } catch {
      setError('Hubo un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <main className="flex items-center justify-center flex-1 px-4 py-10">
        <Card className="w-full max-w-md text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-xl font-semibold mb-2">Revisá tu email</h1>
          <p className="text-gray-600 text-sm mb-6">
            Si tu email está registrado, vas a recibir un link para restablecer tu contraseña. El link expira en 1 hora.
          </p>
          <Link to="/login" className="text-primary-600 hover:underline text-sm">
            Volver al inicio de sesión
          </Link>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex items-center justify-center flex-1 px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2 text-center">Recuperar contraseña</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Ingresá tu email y te mandamos un link para crear una nueva contraseña.
        </p>

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
            error={error}
          />

          <Button type="submit" loading={loading} fullWidth>
            {loading ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          <Link to="/login" className="text-primary-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </Card>
    </main>
  )
}
