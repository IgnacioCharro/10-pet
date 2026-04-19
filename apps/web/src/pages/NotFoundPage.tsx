import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-3xl font-bold">404</h2>
      <p className="text-gray-500">Página no encontrada</p>
      <Link to="/" className="text-primary-600 underline">Volver al inicio</Link>
    </main>
  )
}
