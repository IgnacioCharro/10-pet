import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { api } from '../../lib/api'
import { listCases } from '../../services/cases.service'
import LocalidadPicker, {
  loadPickedLocation,
  savePickedLocation,
  type PickedLocation,
} from './LocalidadPicker'
import { Button } from '../ui'
import type { AnimalType, ListingType, CaseItem } from '../../types/case'

interface FeedRow {
  id: string
  listingType: ListingType
  animalType: AnimalType
  locationText: string | null
  urgencyLevel: number
  createdAt: string
  publisherName: string | null
  volunteerCount: number
  heroUrl: string | null
}

const ANIMAL_EMOJI: Record<AnimalType, string> = { perro: '🐕', gato: '🐈', caballo: '🐴', vaca: '🐄', otro: '🐾' }
const ANIMAL_LABEL: Record<AnimalType, string> = { perro: 'Perro', gato: 'Gato', caballo: 'Caballo', vaca: 'Vaca', otro: 'Otro' }

const URGENCY_CLS: Record<number, string> = {
  1: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  2: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  3: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  4: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  5: 'bg-red-200 text-red-800 dark:text-red-200 font-semibold',
}
const URGENCY_LABEL: Record<number, string> = {
  1: 'Baja', 2: 'Baja', 3: 'Media', 4: 'Alta', 5: 'Critica',
}

type Tab = 'all' | 'found' | 'lost'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'found', label: 'Encontrados' },
  { id: 'lost', label: 'Buscados' },
]

const ANIMAL_CHIPS: { value: AnimalType | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'perro', label: '🐕 Perro' },
  { value: 'gato', label: '🐈 Gato' },
  { value: 'caballo', label: '🐴 Caballo' },
  { value: 'vaca', label: '🐄 Vaca' },
  { value: 'otro', label: '🐾 Otro' },
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

function UrgentCard({ row, onClick }: { row: FeedRow; onClick: () => void }) {
  const urg = URGENCY_CLS[row.urgencyLevel] ?? URGENCY_CLS[1]
  const urgLabel = URGENCY_LABEL[row.urgencyLevel] ?? 'Media'
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 w-44 text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className="h-28 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
        {row.heroUrl ? (
          <img src={row.heroUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">{ANIMAL_EMOJI[row.animalType]}</span>
        )}
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-medium text-gray-800 dark:text-gray-100">{ANIMAL_LABEL[row.animalType]}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${urg}`}>{urgLabel}</span>
        </div>
        {row.locationText && !row.locationText.includes('undefined') && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.locationText}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(row.createdAt)}</p>
      </div>
    </button>
  )
}

function ListRow({ caseItem, onClick }: { caseItem: CaseItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm hover:border-primary-300 active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        {caseItem.heroUrl ? (
          <img src={caseItem.heroUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <span className="text-2xl flex-shrink-0 mt-0.5">{ANIMAL_EMOJI[caseItem.animalType]}</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{ANIMAL_LABEL[caseItem.animalType]}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              caseItem.listingType === 'lost' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
            }`}>
              {caseItem.listingType === 'lost' ? 'Busco' : 'Encontré'}
            </span>
          </div>
          {caseItem.locationText && !caseItem.locationText.includes('undefined') && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{caseItem.locationText}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span>{timeAgo(caseItem.createdAt)}</span>
            {caseItem.distanceKm != null && (
              <span>· {caseItem.distanceKm.toFixed(1)} km</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function HomeFeed() {
  const navigate = useNavigate()
  const [loc, setLoc] = useState<PickedLocation | null>(() => loadPickedLocation())
  const [showPicker, setShowPicker] = useState(() => !loadPickedLocation())

  // Urgentes section
  const [urgentRows, setUrgentRows] = useState<FeedRow[]>([])
  const [urgentLoading, setUrgentLoading] = useState(false)

  // Full list section
  const [tab, setTab] = useState<Tab>('all')
  const [animalType, setAnimalType] = useState<AnimalType | ''>('')
  const [listRows, setListRows] = useState<CaseItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch urgentes
  useEffect(() => {
    if (!loc) return
    const controller = new AbortController()
    setUrgentLoading(true)
    api
      .get<{ cases: FeedRow[] }>('/cases/feed', {
        params: { lat: loc.center[0], lng: loc.center[1], radius: 10 },
        signal: controller.signal,
      })
      .then((res) => setUrgentRows(res.data.cases))
      .catch((err) => { if (!axios.isCancel(err)) setUrgentRows([]) })
      .finally(() => setUrgentLoading(false))
    return () => controller.abort()
  }, [loc])

  // Fetch full list
  useEffect(() => {
    if (!loc) return
    const controller = new AbortController()
    setListLoading(true)
    listCases({
      lat: loc.center[0],
      lng: loc.center[1],
      radius: 10,
      status: 'abierto',
      listingType: tab === 'all' ? undefined : (tab === 'found' ? 'found' : 'lost'),
      animalType: animalType || undefined,
      sort: 'recent',
      page,
      limit: 20,
    })
      .then((res) => {
        setListRows(res.cases)
        setTotalPages(res.meta.pages)
      })
      .catch((err) => { if (!axios.isCancel(err)) setListRows([]) })
      .finally(() => setListLoading(false))
    return () => controller.abort()
  }, [loc, tab, animalType, page])

  useEffect(() => {
    setPage(1)
  }, [tab, animalType, loc])

  const handlePick = (picked: PickedLocation) => {
    savePickedLocation(picked)
    setLoc(picked)
    setShowPicker(false)
  }

  const urgentFiltered = urgentRows.filter((r) => r.urgencyLevel >= 3)

  return (
    <>
      {showPicker && <LocalidadPicker onPick={handlePick} />}

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Casos en tu zona</h1>
            {loc && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {loc.label}
                {' · '}
                <button
                  onClick={() => setShowPicker(true)}
                  className="text-primary-600 dark:text-primary-300 hover:underline"
                >
                  Cambiar zona
                </button>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/cases">
              <Button variant="secondary" size="sm">Ver mapa</Button>
            </Link>
            <Link to="/cases/new">
              <Button size="sm">Reportar</Button>
            </Link>
          </div>
        </div>

        {/* Urgentes */}
        {(urgentLoading || urgentFiltered.length > 0) && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">Casos urgentes</h2>
              {urgentFiltered.length > 0 && (
                <span className="text-xs text-gray-400">{urgentFiltered.length} en tu zona</span>
              )}
            </div>
            {urgentLoading ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Cargando…</div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {urgentFiltered.map((row) => (
                  <UrgentCard
                    key={row.id}
                    row={row}
                    onClick={() => navigate(`/cases/${row.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Lista completa */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-3">Todos los casos</h2>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Animal type chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
            {ANIMAL_CHIPS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setAnimalType(c.value as AnimalType | '')}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap flex-shrink-0',
                  animalType === c.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400',
                ].join(' ')}
              >
                {c.label}
              </button>
            ))}
          </div>

          {listLoading && (
            <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
          )}

          {!listLoading && listRows.length === 0 && loc && (
            <div className="text-center py-10 text-gray-400 text-sm">
              No hay casos en tu zona.{' '}
              <Link to="/cases/new" className="text-primary-600 dark:text-primary-300 hover:underline">
                Publicar uno
              </Link>
            </div>
          )}

          {!listLoading && listRows.length > 0 && (
            <div className="flex flex-col gap-2">
              {listRows.map((c) => (
                <ListRow
                  key={c.id}
                  caseItem={c}
                  onClick={() => navigate(`/cases/${c.id}`)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-3 pt-4">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Anterior
              </button>
              <span className="self-center text-sm text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Siguiente
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
