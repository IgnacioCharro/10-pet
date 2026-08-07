import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { resendVerificationRequest } from '../services/auth.service'
import { useAuthStore } from '../stores/authStore'
import { Button, Card, Input } from '../components/ui'

const errorMessages: Record<string, string> = {
  INVALID_TOKEN: 'El enlace de verificación es inválido o ya fue usado.',
  TOKEN_EXPIRED: 'El enlace de verificación expiró. Pedí uno nuevo.',
}

export default function VerifyEmailPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)

  const isResultPage = location.pathname === '/auth/verified'
  const errorCode = searchParams.get('error')
  const justRegistered = (location.state as { emailSent?: boolean } | null)?.emailSent

  if (isResultPage) {
    if (errorCode) {
      return (
        <AuthCard title="No pudimos verificar tu email">
          <p className="text-sm text-gray-600 mb-4">
            {errorMessages[errorCode] ?? 'Ocurrió un error al verificar tu email.'}
          </p>
          <ResendVerification defaultEmail={user?.email} />
          <Link to="/login" className="text-primary-600 hover:underline text-sm">
            Volver al login
          </Link>
        </AuthCard>
      )
    }
    return (
      <AuthCard title="Email verificado">
        <p className="text-sm text-gray-600 mb-4">
          Tu email fue verificado correctamente. Ya podés publicar casos.
        </p>
        <Link to="/dashboard">
          <Button>Ir al dashboard</Button>
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Verificá tu email">
      {justRegistered ? (
        <p className="text-sm text-gray-600 mb-4">
          Tu cuenta fue creada. Te enviamos un email
          {user?.email ? (
            <>
              {' '}a <strong>{user.email}</strong>
            </>
          ) : null}{' '}
          con un enlace para activar tu cuenta.
        </p>
      ) : (
        <p className="text-sm text-gray-600 mb-4">
          Revisá tu casilla y hacé clic en el enlace para activar tu cuenta antes de publicar casos.
        </p>
      )}
      <p className="text-xs text-gray-400 mb-4">
        Si no lo ves, revisá la carpeta de spam o promociones.
      </p>
      <ResendVerification defaultEmail={user?.email} />
      <Link to="/dashboard">
        <Button>Continuar al dashboard</Button>
      </Link>
    </AuthCard>
  )
}

function ResendVerification({ defaultEmail }: { defaultEmail?: string }) {
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
      <p className="text-sm text-gray-600 border-t border-gray-100 pt-4 mb-4">
        Listo, te mandamos un enlace nuevo. Puede tardar un par de minutos en llegar —
        acordate de mirar spam.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-gray-100 pt-4 mb-4">
      {defaultEmail ? (
        <p className="text-sm text-gray-600">
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

      {defaultEmail && error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  )
}

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex items-center justify-center flex-1 px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">{title}</h1>
        {children}
      </Card>
    </main>
  )
}
