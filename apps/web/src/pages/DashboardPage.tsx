import { useAuthStore } from '../stores/authStore'
import { Card } from '../components/ui'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <main className="flex-1 px-4 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              Bienvenido, <span className="font-medium">{user.email}</span>
            </p>
          )}
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="text-base font-semibold mb-2">Mis casos</h2>
            <p className="text-sm text-gray-500">
              Todavía no publicaste ningún caso. Próximamente podrás crearlos desde acá.
            </p>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-2">Mis contactos</h2>
            <p className="text-sm text-gray-500">
              Cuando alguien ofrezca ayuda en uno de tus casos, lo verás listado acá.
            </p>
          </Card>
        </div>
      </div>
    </main>
  )
}
