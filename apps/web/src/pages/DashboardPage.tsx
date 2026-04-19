import { useAuthStore } from '../stores/authStore'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-2">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      {user && <p className="text-gray-500">Bienvenido, {user.email}</p>}
    </main>
  )
}
