import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getMe, patchMe, getMyCases, patchNotificationLocation, deleteNotificationLocation } from '../services/users.service'
import { toast } from '../stores/toastStore'
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
  const [vetEditing, setVetEditing] = useState(false)
  const [isVetInput, setIsVetInput] = useState(user?.isVet ?? false)
  const [vetLicenseInput, setVetLicenseInput] = useState(user?.vetLicense ?? '')
  const [vetSaving, setVetSaving] = useState(false)
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
      toast.success('Perfil actualizado.')
    } catch {
      setSaveError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const saveVet = async () => {
    setVetSaving(true)
    try {
      const updated = await patchMe({
        isVet: isVetInput,
        vetLicense: isVetInput ? vetLicenseInput.trim() || null : null,
      })
      setUser(updated)
      setVetEditing(false)
      toast.success('Perfil veterinario actualizado.')
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setVetSaving(false)
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

        <Card>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold">Perfil veterinario</h2>
            {!vetEditing && (
              <button
                onClick={() => {
                  setIsVetInput(user?.isVet ?? false)
                  setVetLicenseInput(user?.vetLicense ?? '')
                  setVetEditing(true)
                }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Editar
              </button>
            )}
          </div>

          {vetEditing ? (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVetInput}
                  onChange={(e) => setIsVetInput(e.target.checked)}
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-sm text-gray-700">Soy veterinario/a</span>
              </label>
              {isVetInput && (
                <Input
                  label="Matrícula (opcional)"
                  value={vetLicenseInput}
                  onChange={(e) => setVetLicenseInput(e.target.value)}
                  placeholder="Ej: MV 12345"
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveVet} loading={vetSaving}>
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setVetEditing(false)}
                  disabled={vetSaving}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : user?.isVet ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-200">
                Veterinario/a verificado/a
              </span>
              {user.vetLicense && (
                <span className="text-xs text-gray-500">Mat. {user.vetLicense}</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No declarado. Editá para indicar si sos veterinario/a.</p>
          )}
        </Card>

        <NotificationZoneCard />

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

const RADIUS_OPTIONS = [5, 10, 20, 50]

function NotificationZoneCard() {
  const { user, setUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [lat, setLat] = useState<number | null>(user?.notificationLat ?? null)
  const [lng, setLng] = useState<number | null>(user?.notificationLng ?? null)
  const [radiusKm, setRadiusKm] = useState<number>(user?.notificationRadiusKm ?? 10)

  const startEdit = () => {
    setLat(user?.notificationLat ?? null)
    setLng(user?.notificationLng ?? null)
    setRadiusKm(user?.notificationRadiusKm ?? 10)
    setEditing(true)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setLocating(false)
      },
      () => {
        toast.error('No se pudo obtener tu ubicación. Revisá los permisos del navegador.')
        setLocating(false)
      },
      { timeout: 10000 },
    )
  }

  const save = async () => {
    if (lat === null || lng === null) {
      toast.error('Primero obtené tu ubicación.')
      return
    }
    setSaving(true)
    try {
      await patchNotificationLocation({ lat, lng, radiusKm })
      const updated = await getMe()
      setUser(updated)
      setEditing(false)
      toast.success('Zona de notificaciones guardada.')
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const clearZone = async () => {
    setDeleting(true)
    try {
      await deleteNotificationLocation()
      const updated = await getMe()
      setUser(updated)
      toast.success('Zona eliminada. Recibirás todos los casos nuevamente.')
    } catch {
      toast.error('No se pudo eliminar la zona.')
    } finally {
      setDeleting(false)
    }
  }

  const configured = user?.notificationLat != null

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold">Zona de notificaciones</h2>
        {!editing && (
          <div className="flex gap-3">
            {configured && (
              <button
                onClick={clearZone}
                disabled={deleting}
                className="text-xs text-red-400 hover:text-red-600 underline disabled:opacity-50"
              >
                {deleting ? 'Borrando…' : 'Borrar'}
              </button>
            )}
            <button
              onClick={startEdit}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              {configured ? 'Editar' : 'Configurar'}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">
            Solo recibirás notificaciones de casos dentro del radio elegido.
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={useCurrentLocation}
            loading={locating}
          >
            Usar mi ubicación actual
          </Button>
          {lat !== null && (
            <p className="text-xs text-gray-400">
              Ubicación capturada: {lat.toFixed(4)}, {lng?.toFixed(4)}
            </p>
          )}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Radio</p>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    radiusKm === r
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-200 text-gray-600 hover:border-primary-400',
                  ].join(' ')}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} loading={saving} disabled={lat === null}>
              Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : configured ? (
        <p className="text-sm text-gray-600">
          Activa — casos dentro de{' '}
          <span className="font-medium">{user?.notificationRadiusKm} km</span> de tu ubicación.
        </p>
      ) : (
        <p className="text-sm text-gray-400">
          Sin configurar — recibís notificaciones de todos los casos nuevos.
        </p>
      )}
    </Card>
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
    <Link to={`/cases/${item.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium capitalize">{item.animalType}</p>
            <p className="text-xs text-gray-500 truncate">
              {item.locationText && !item.locationText.includes('undefined')
                ? item.locationText
                : item.lat != null && item.lng != null
                ? `${item.lat.toFixed(3)}, ${item.lng.toFixed(3)}`
                : <span className="italic">Sin direccion</span>}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString('es-AR')}</p>
          </div>
          <span className={['text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusClass].join(' ')}>
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
        </div>
      </Card>
    </Link>
  )
}
