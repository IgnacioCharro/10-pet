import type { ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button, Card } from '../components/ui'

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
      <Link to="/dashboard">
        <Button>Continuar al dashboard</Button>
      </Link>
    </AuthCard>
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
