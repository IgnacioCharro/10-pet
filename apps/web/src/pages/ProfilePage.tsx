import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { getMe, patchMe, getMyCases } from '../services/users.service'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Card } from '../components/ui'
import type { CaseItem } from '../types/case'

const STATUS_LABELS: Record<string, string> = {
  abierto: 'Abierto',
  en_rescate: 'En rescate',
  resuelto: 'Resuelto',
  inactivo: 'Inactivo',
  spam: 'Spam',
}

const STATUS_COLORS: Record<string, string> = {
  abierto: 'bg-green-100 text-green-700',
  en_rescate: 'bg-blue-100 text-blue-700',
  resuelto: 'bg-gray-100 text-gray-600',
  inactivo: 'bg-yellow-100 text-yellow-700',
  spam: 'bg-red-100 text-red-600',
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loadingCases, setLoadingCases] = useState(true)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
    getMyCases()
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoadingCases(false))
  }, [setUser])

  const startEdit = () => {
    setNameInput(user?.name ?? '')
    setSaveError(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setSaveError(null)
  }

  const saveEdit = async () => {
    if (!nameInput.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await patchMe({ name: nameInput.trim() })
      setUser(updated)
      setEditing(false)
    } catch {
      setSaveError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const resolvedCount = cases.filter((c) => c.status === 'resuelto').length

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Card>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-semibold text-primary-600 shrink-0">
              {(user?.name ?? user?.email ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex flex-col gap-2">
                  <Input
                    label="Nombre"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    autoFocus
                  />
                  {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} loading={saving}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold truncate">
                      {user?.name ?? 'Sin nombre'}
                    </h1>
                    <button
                      onClick={startEdit}
                      className="text-xs text-gray-400 hover:text-gray-600 underline shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  {user?.createdAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Miembro desde {new Date(user.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Casos reportados" value={cases.length} />
          <StatCard label="Resueltos" value={resolvedCount} />
          <StatCard label="Activos" value={cases.filter((c) => c.status === 'abierto').length} />
        </div>

        <div>
          <h2 className="text-base font-semibold mb-3">Mis casos</h2>
          {loadingCases ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : cases.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-500">
                Todavía no publicaste ningún caso.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {cases.map((c) => (
                <CaseRow key={c.id} item={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-2xl font-bold text-primary-600">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </Card>
  )
}

function CaseRow({ item }: { item: CaseItem }) {
  const statusClass = STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-600'
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{item.animalType}</p>
          <p className="text-xs text-gray-500 truncate">{item.locationText ?? `${item.lat?.toFixed(3)}, ${item.lng?.toFixed(3)}`}</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString('es-AR')}</p>
        </div>
        <span className={['text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusClass].join(' ')}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
    </Card>
  )
}
