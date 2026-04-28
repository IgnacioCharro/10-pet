import { useState, useEffect, useCallback, Suspense } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import FilterBar, { type FilterState } from '../components/cases/FilterBar'
import CaseCard from '../components/cases/CaseCard'
import CaseDetailSheet from '../components/cases/CaseDetailSheet'
import LocalidadPicker, { loadPickedLocation, savePickedLocation, type PickedLocation } from '../components/cases/LocalidadPicker'
import { listCases, getNearbyCases } from '../services/cases.service'
import { lazyWithRetry } from '../lib/lazyWithRetry'
import type { CaseItem } from '../types/case'

interface PublishedState {
  published?: string
  lat?: number
  lng?: number
}

const PUBLISHED_ZOOM = 16

const LeafletMap = lazyWithRetry(() => import('../components/map/LeafletMap'))

const FALLBACK_CENTER: [number, number] = [-34.6037, -58.3816]

const DEFAULT_FILTERS: FilterState = {
  animalType: '',
  urgencyMin: 0,
  radius: 10,
  sort: 'recent',
}

export default function CasesPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [initialPublished] = useState<PublishedState | null>(() => {
    const s = location.state as PublishedState | null
    if (s && typeof s.lat === 'number' && typeof s.lng === 'number') return s
    return null
  })

  const [storedLoc] = useState<PickedLocation | null>(() => loadPickedLocation())

  const [showPicker, setShowPicker] = useState<boolean>(
    () => !initialPublished && !loadPickedLocation(),
  )

  const [view, setView] = useState<'map' | 'list'>('map')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [center, setCenter] = useState<[number, number]>(() => {
    if (initialPublished) return [initialPublished.lat!, initialPublished.lng!]
    if (storedLoc) return storedLoc.center
    return FALLBACK_CENTER
  })
  const [zoneLabel, setZoneLabel] = useState<string | null>(() => storedLoc?.label ?? null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    initialPublished?.published ?? null,
  )
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(() =>
    initialPublished
      ? { center: [initialPublished.lat!, initialPublished.lng!], zoom: PUBLISHED_ZOOM }
      : null,
  )
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (initialPublished) {
      navigate(location.pathname, { replace: true, state: null })
      const t = setTimeout(() => setFlyTo(null), 1500)
      return () => clearTimeout(t)
    }
  }, [initialPublished, navigate, location.pathname])

  useEffect(() => {
    if (initialPublished) return
    if (showPicker) return
    if (storedLoc) return
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(loc)
        setCenter(loc)
      },
      () => {},
      { timeout: 5000 },
    )
  }, [initialPublished, showPicker, storedLoc])

  const handlePickerPick = useCallback((loc: PickedLocation) => {
    setCenter(loc.center)
    setZoneLabel(loc.label)
    setFlyTo({ center: loc.center, zoom: 13 })
    setTimeout(() => setFlyTo(null), 1500)
    if (loc.label !== 'Mi ubicación') {
      setUserLocation(null)
    } else {
      setUserLocation(loc.center)
    }
    setShowPicker(false)
  }, [])

  const handleChangeZone = useCallback(() => {
    setShowPicker(true)
  }, [])

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      if (view === 'map') {
        const [lat, lng] = center
        const data = await getNearbyCases({
          lat,
          lng,
          radius: filters.radius,
        })
        const filtered = data.filter((c) => {
          if (filters.animalType && c.animalType !== filters.animalType) return false
          if (filters.urgencyMin && c.urgencyLevel < filters.urgencyMin) return false
          return true
        })
        setCases(filtered)
      } else {
        const [lat, lng] = center
        const res = await listCases({
          lat,
          lng,
          radius: filters.radius,
          animalType: filters.animalType || undefined,
          urgencyMin: filters.urgencyMin || undefined,
          sort: filters.sort,
          page,
          limit: 20,
          status: 'abierto',
        })
        setCases(res.cases)
        setTotalPages(res.meta.pages)
      }
    } catch {
      // ignorar
    } finally {
      setLoading(false)
    }
  }, [view, center, filters, page])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  useEffect(() => {
    setPage(1)
  }, [filters, view, center])

  const handleLocationFound = useCallback((lat: number, lng: number, zoom: number, label?: string) => {
    const newCenter: [number, number] = [lat, lng]
    setCenter(newCenter)
    setFlyTo({ center: newCenter, zoom })
    setTimeout(() => setFlyTo(null), 1500)
    const loc: PickedLocation = { center: newCenter, label: label ?? 'Zona buscada' }
    savePickedLocation(loc)
    setZoneLabel(loc.label)
  }, [])

  const handleCaseClick = useCallback((c: CaseItem) => {
    setSelectedCaseId(c.id)
  }, [])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {showPicker && <LocalidadPicker onPick={handlePickerPick} />}

      <FilterBar
        filters={filters}
        view={view}
        onFiltersChange={setFilters}
        onViewChange={setView}
        onLocationFound={handleLocationFound}
        zoneLabel={zoneLabel}
        onChangeZone={handleChangeZone}
      />

      <div className="flex-1 relative overflow-hidden z-0">
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-white rounded-full px-3 py-1.5 shadow-md flex items-center gap-2 text-sm text-gray-600">
            <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            Cargando casos…
          </div>
        )}

        {view === 'map' && (
          <Suspense fallback={<div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Cargando mapa…</div>}>
            <LeafletMap
              center={center}
              cases={cases}
              userLocation={userLocation}
              onCaseClick={handleCaseClick}
              flyToTrigger={flyTo}
            />
          </Suspense>
        )}

        {view === 'map' && cases.length === 0 && !loading && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 text-sm max-w-xs w-full mx-4">
            <span className="text-2xl">🐾</span>
            <div className="flex-1 min-w-0">
              <p className="text-gray-700 font-medium text-xs leading-tight">Sin casos en esta zona</p>
              <p className="text-gray-400 text-xs mt-0.5">¿Viste un animal en problema?</p>
            </div>
            <Link
              to="/cases/new"
              className="flex-shrink-0 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Publicar
            </Link>
          </div>
        )}

        {view === 'list' && (
          <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
              {cases.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🐾</p>
                  <p className="text-sm mb-4">Sin casos en esta zona con los filtros actuales.</p>
                  <Link
                    to="/cases/new"
                    className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Publicar un caso
                  </Link>
                </div>
              )}
              {cases.map((c) => (
                <CaseCard key={c.id} caseItem={c} onClick={() => setSelectedCaseId(c.id)} />
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <span className="self-center text-sm text-gray-500">{page} / {totalPages}</span>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CaseDetailSheet caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
    </div>
  )
}
