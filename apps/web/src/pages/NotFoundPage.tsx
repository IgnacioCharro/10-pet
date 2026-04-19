import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 gap-4 px-4 py-10">
      <h2 className="text-3xl font-bold">404</h2>
      <p className="text-gray-500">Página no encontrada</p>
      <Link to="/">
        <Button variant="secondary">Volver al inicio</Button>
      </Link>
    </main>
  )
}
