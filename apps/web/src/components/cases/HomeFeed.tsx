import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import LocalidadPicker, {
  loadPickedLocation,
  savePickedLocation,
  type PickedLocation,
} from './LocalidadPicker'
import CaseDetailSheet from './CaseDetailSheet'
import CasePopup from './CasePopup'
import { Button } from '../ui'
import type { AnimalType, ListingType } from '../../types/case'

interface FeedRow {
  id: string
  listingType: ListingType
  animalType: AnimalType
  locationText: string | null
  urgencyLevel: number
  createdAt: string
  publisherName: string | null
  volunteerCount: number
}

const ANIMAL_EMOJI: Record<AnimalType, string> = { perro: '🐕', gato: '🐈', otro: '🐾' }
const ANIMAL_LABEL: Record<AnimalType, string> = { perro: 'Perro', gato: 'Gato', otro: 'Otro' }

const URGENCY: Record<number, { label: string; cls: string }> = {
  1: { label: 'Baja', cls: 'bg-green-100 text-green-700' },
  2: { label: 'Baja', cls: 'bg-green-100 text-green-700' },
  3: { label: 'Media', cls: 'bg-amber-100 text-amber-700' },
  4: { label: 'Alta', cls: 'bg-red-100 text-red-700' },
  5: { label: 'Critica', cls: 'bg-red-200 text-red-800 font-semibold' },
}

type Tab = 'all' | 'found' | 'lost'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'found', label: 'Encontrados' },
  { id: 'lost', label: 'Buscados' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export default function HomeFeed() {
  const [loc, setLoc] = useState<PickedLocation | null>(() => loadPickedLocation())
  const [showPicker, setShowPicker] = useState(() => !loadPickedLocation())
  const [tab, setTab] = useState<Tab>('all')
  const [rows, setRows] = useState<FeedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [popupCaseId, setPopupCaseId] = useState<string | null>(null)
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null)

  useEffect(() => {
    if (!loc) return
    setLoading(true)
    const params: Record<string, unknown> = { lat: loc.center[0], lng: loc.center[1], radius: 10 }
    if (tab !== 'all') params.listingType = tab
    api
      .get<{ cases: FeedRow[] }>('/cases/feed', { params })
      .then((res) => setRows(res.data.cases))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [loc, tab])

  const handlePick = (picked: PickedLocation) => {
    savePickedLocation(picked)
    setLoc(picked)
    setShowPicker(false)
  }

  const emptyMessage =
    tab === 'lost'
      ? 'No hay mascotas buscadas en tu zona.'
      : tab === 'found'
        ? 'No hay animales encontrados en tu zona.'
        : 'No hay casos activos en tu zona.'

  return (
    <>
      {showPicker && <LocalidadPicker onPick={handlePick} />}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header: Reportar + zona */}
        <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {tab === 'lost' ? 'Mascotas buscadas' : tab === 'found' ? 'Animales encontrados' : 'Casos en tu zona'}
            </h1>
            {loc && (
              <p className="text-sm text-gray-500 mt-0.5">
                Zona: <span className="font-medium text-gray-700">{loc.label}</span>
                {' · '}
                <button
                  onClick={() => setShowPicker(true)}
                  className="text-primary-600 hover:underline"
                >
                  Cambiar
                </button>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link to="/cases">
              <Button variant="secondary" size="sm">Ver en mapa</Button>
            </Link>
            <Link to="/cases/new">
              <Button size="sm">Reportar caso</Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
        )}

        {!loading && rows.length === 0 && loc && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {emptyMessage}{' '}
            <Link to="/cases/new" className="text-primary-600 hover:underline">
              Publicar uno
            </Link>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Animal</th>
                    <th className="px-4 py-3 font-medium">Ubicacion</th>
                    {tab !== 'lost' && <th className="px-4 py-3 font-medium">Urgencia</th>}
                    <th className="px-4 py-3 font-medium">Publicado</th>
                    <th className="px-4 py-3 font-medium">Por</th>
                    <th className="px-4 py-3 font-medium text-center">Voluntarios</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const urg = URGENCY[row.urgencyLevel] ?? URGENCY[1]
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setPopupCaseId(row.id)}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            row.listingType === 'lost'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {row.listingType === 'lost' ? 'Busco' : 'Encontré'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <span className="mr-1.5" aria-hidden="true">
                            {ANIMAL_EMOJI[row.animalType]}
                          </span>
                          {ANIMAL_LABEL[row.animalType]}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                          {row.locationText ?? (
                            <span className="text-gray-400 italic">Sin direccion</span>
                          )}
                        </td>
                        {tab !== 'lost' && (
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs ${urg.cls}`}>
                              {urg.label}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {timeAgo(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">
                          {row.publisherName ?? (
                            <span className="text-gray-400 italic">Anonimo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.volunteerCount > 0 ? (
                            <span className="font-semibold text-primary-600">
                              {row.volunteerCount}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {rows.map((row) => {
                const urg = URGENCY[row.urgencyLevel] ?? URGENCY[1]
                return (
                  <button
                    key={row.id}
                    onClick={() => setPopupCaseId(row.id)}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm hover:border-primary-300 active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {ANIMAL_EMOJI[row.animalType]} {ANIMAL_LABEL[row.animalType]}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                          row.listingType === 'lost'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {row.listingType === 'lost' ? 'Busco' : 'Encontré'}
                        </span>
                      </div>
                      {row.listingType !== 'lost' && (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs ${urg.cls}`}>
                          {urg.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {row.locationText && !row.locationText.includes('undefined') ? row.locationText : (
                        <span className="text-gray-400 italic">Sin direccion</span>
                      )}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span>{timeAgo(row.createdAt)}</span>
                      {row.publisherName && (
                        <span>· {row.publisherName}</span>
                      )}
                      {row.volunteerCount > 0 && (
                        <span className="text-primary-600 font-medium">
                          · {row.volunteerCount} voluntario{row.volunteerCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <CasePopup
        caseId={popupCaseId}
        onClose={() => setPopupCaseId(null)}
        onViewFull={() => { setDetailCaseId(popupCaseId); setPopupCaseId(null) }}
      />
      <CaseDetailSheet caseId={detailCaseId} onClose={() => setDetailCaseId(null)} />
    </>
  )
}
