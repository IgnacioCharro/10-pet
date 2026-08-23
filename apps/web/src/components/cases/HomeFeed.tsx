import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { api } from '../../lib/api'
import { listCases, getZoneStats, type ZoneStats } from '../../services/cases.service'
import LocalidadPicker, {
  loadPickedLocation,
  savePickedLocation,
  type PickedLocation,
} from './LocalidadPicker'
import { Button, Chip, Segmented, UrgencyTag, Rail } from '../ui'
import ZoneStatsPanel from './ZoneStatsPanel'
import UrgencyLegend from './UrgencyLegend'
import { displayLocation, displayDistance } from '../../lib/location'
import type { AnimalType, ListingType, CaseItem, SortOrder } from '../../types/case'
import { ANIMAL_LABEL, ANIMAL_EMOJI } from '../../lib/animalType'
import { LISTING_TYPE } from '../../lib/listingType'
import { timeAgo } from '../../lib/time'

interface FeedRow {
  id: string
  listingType: ListingType
  animalType: AnimalType
  title: string
  locationText: string | null
  urgencyLevel: number
  createdAt: string
  publisherName: string | null
  volunteerCount: number
  heroUrl: string | null
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
  { value: 'ave', label: '🐦 Ave' },
  { value: 'otro', label: '🐾 Otro' },
]

function UrgentCard({ row, onClick }: { row: FeedRow; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 w-44 lg:w-auto text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-primary-300 hover:shadow-sm transition-all"
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
          <UrgencyTag level={row.urgencyLevel} />
        </div>
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-0.5">{row.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {displayLocation(row.locationText) ?? <span className="italic">Sin dirección</span>}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{timeAgo(row.createdAt)}</p>
      </div>
    </button>
  )
}

function ListRow({ caseItem, onClick }: { caseItem: CaseItem; onClick: () => void }) {
  const distance = displayDistance(caseItem.distanceKm)
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
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${LISTING_TYPE[caseItem.listingType].chipClass}`}>
              {LISTING_TYPE[caseItem.listingType].short}
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-0.5">{caseItem.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {displayLocation(caseItem.locationText) ?? <span className="italic">Sin dirección</span>}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{timeAgo(caseItem.createdAt)}</span>
            {distance && <span>· {distance}</span>}
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

  // Rail de metricas de zona (solo escritorio)
  const [stats, setStats] = useState<ZoneStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Full list section
  const [tab, setTab] = useState<Tab>('all')
  const [animalType, setAnimalType] = useState<AnimalType | ''>('')
  const [sort, setSort] = useState<SortOrder>('recent')
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

  // Solo alimenta el rail, que no existe por debajo de lg. Se pide igual: el
  // breakpoint es CSS y el componente es el mismo, y una peticion de lectura
  // mas por cambio de zona no justifica meter logica de viewport en JS.
  //
  // Bandera y no AbortController como los efectos de arriba: getZoneStats no
  // recibe signal. Un controller aca seria una variable sin usar que ademas
  // mentiria sobre estar cancelando algo.
  useEffect(() => {
    if (!loc) return
    let cancelled = false
    setStatsLoading(true)
    getZoneStats({ lat: loc.center[0], lng: loc.center[1], radius: 10 })
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
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
      listingType: tab === 'all' ? undefined : tab,
      animalType: animalType || undefined,
      sort,
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
  }, [loc, tab, animalType, sort, page])

  useEffect(() => {
    setPage(1)
  }, [tab, animalType, sort, loc])

  const handlePick = (picked: PickedLocation) => {
    savePickedLocation(picked)
    setLoc(picked)
    setShowPicker(false)
  }

  const urgentFiltered = urgentRows.filter((r) => r.urgencyLevel >= 3)

  return (
    <>
      {showPicker && <LocalidadPicker onPick={handlePick} />}

      {/* pb-28 y no py-5: los botones flotantes (feedback, y mejoras si sos admin)
          viven en la esquina inferior derecha y tapaban la ultima tarjeta de la
          lista, que quedaba imposible de tocar. */}
      <div className="max-w-2xl lg:max-w-[1408px] mx-auto px-4 lg:px-10 pt-5 lg:pt-8 pb-28">
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
                <span className="text-xs text-gray-500 dark:text-gray-400">{urgentFiltered.length} en tu zona</span>
              )}
            </div>
            {urgentLoading ? (
              <div className="h-40 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">Cargando…</div>
            ) : (
              // En mobile scrollea; desde lg es grilla de 4. El handoff
              // prohibe carruseles cortados en escritorio.
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:grid lg:grid-cols-4 lg:gap-[18px] lg:overflow-visible lg:mx-0 lg:px-0">
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

        <div className="lg:grid lg:grid-cols-[1fr_392px] lg:gap-8 lg:items-start">
          {/* Lista completa */}
          <section>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-3">Todos los casos</h2>

            {/* Barra de filtros */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <Segmented
                options={TABS.map((t) => ({ id: t.id, label: t.label }))}
                value={tab}
                onChange={(id) => setTab(id as Tab)}
              />

              {/* Excepcion consciente al piso de 44px de toque: este control
                  solo existe desde lg (hidden lg:flex), donde el puntero es
                  mouse. Es un <select> nativo, y los navegadores no pintan
                  ::after sobre elementos reemplazados, asi que el
                  pseudo-elemento de Chip/Segmented no aplica aca; envolver
                  el toque en el <label> tampoco sirve porque un click ahi no
                  abre el desplegable de forma consistente entre navegadores.
                  Subirlo a 44px de verdad lo desalinearia ~12px del
                  Segmented de al lado. A 32px sigue cumpliendo el minimo de
                  WCAG 2.5.8 (24x24) y es alcanzable por teclado. */}
              <label className="hidden lg:flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400">
                Ordenar por
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5"
                >
                  <option value="distance">Mas cercanos</option>
                  <option value="recent">Mas recientes</option>
                  <option value="urgency">Mas urgentes</option>
                </select>
              </label>
            </div>

            {/* Animal type chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 lg:flex-wrap lg:overflow-visible">
              {ANIMAL_CHIPS.map((c) => (
                <Chip
                  key={c.value}
                  active={animalType === c.value}
                  onClick={() => setAnimalType(c.value as AnimalType | '')}
                >
                  {c.label}
                </Chip>
              ))}
            </div>

            {listLoading && (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Cargando...</div>
            )}

            {!listLoading && listRows.length === 0 && loc && (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
                No hay casos en tu zona.{' '}
                <Link to="/cases/new" className="text-primary-600 dark:text-primary-300 hover:underline">
                  Publicar uno
                </Link>
              </div>
            )}

            {!listLoading && listRows.length > 0 && (
              <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-4">
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

          <Rail>
            <ZoneStatsPanel stats={stats} loading={statsLoading} />
            <UrgencyLegend stats={stats} />
          </Rail>
        </div>
      </div>
    </>
  )
}
