import { useState, type FormEvent } from 'react'
import { resendVerificationRequest } from '../services/auth.service'
import { Button, Input } from './ui'

interface ResendVerificationProps {
  /** Si viene, se reenvia a esa direccion sin pedirla. Si no, se muestra un input. */
  defaultEmail?: string
}

export default function ResendVerification({ defaultEmail }: ResendVerificationProps) {
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resendVerificationRequest(email)
      setSent(true)
    } catch {
      setError('No pudimos reenviar el email. Intentá de nuevo en un minuto.')
    } finally {
      setLoading(false)
    }
  }

  // Una sola vez por visita: el endpoint es una mutation (10 req/min) y reenviar
  // en loop solo cambia el token, no acelera nada.
  if (sent) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
        Listo, te mandamos un enlace nuevo. Puede tardar un par de minutos en llegar —
        acordate de mirar spam.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
      {defaultEmail ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          ¿No te llegó? Te lo reenviamos a <strong>{defaultEmail}</strong>.
        </p>
      ) : (
        <Input
          label="Tu email"
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
      )}

      <Button type="submit" variant="secondary" loading={loading} fullWidth>
        {loading ? 'Enviando…' : 'Reenviar email de verificación'}
      </Button>

      {defaultEmail && error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
    </form>
  )
}
