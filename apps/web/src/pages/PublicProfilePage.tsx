import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPublicProfile, type PublicProfile } from '../services/users.service'
import { Card } from '../components/ui'

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getPublicProfile(id)
      .then(setProfile)
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Usuario no encontrado.</p>
        <Link to="/" className="text-primary-600 dark:text-primary-300 text-sm hover:underline mt-2 inline-block">Volver al inicio</Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-2xl font-bold text-primary-600 dark:text-primary-300 shrink-0">
          {(profile.name ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{profile.name ?? 'Usuario'}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Miembro desde {memberSince(profile.createdAt)}</p>
        </div>
      </div>

      {profile.isVet && (
        <div className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-2.5">
          <span className="text-teal-600 dark:text-teal-400 text-base">🩺</span>
          <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Veterinario verificado</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-300">{profile.casesPublished}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Casos publicados</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-green-600 dark:text-green-300">{profile.casesVolunteered}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Casos ayudados</p>
        </Card>
      </div>
    </div>
  )
}
