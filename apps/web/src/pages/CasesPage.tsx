import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import FilterBar, { type FilterState } from '../components/cases/FilterBar'
import CaseCard from '../components/cases/CaseCard'
import CaseDetailSheet from '../components/cases/CaseDetailSheet'
import { listCases, getNearbyCases } from '../services/cases.service'
import type { CaseItem } from '../types/case'

const LeafletMap = lazy(() => import('../components/map/LeafletMap'))

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816] // Buenos Aires

const DEFAULT_FILTERS: FilterState = {
  animalType: '',
  urgencyMin: 0,
  radius: 10,
  sort: 'recent',
}

export default function CasesPage() {
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(loc)
        setCenter(loc)
      },
      () => {},
      { timeout: 5000 },
    )
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

  const handleLocationFound = useCallback((lat: number, lng: number, zoom: number) => {
    const newCenter: [number, number] = [lat, lng]
    setCenter(newCenter)
    setFlyTo({ center: newCenter, zoom })
    setTimeout(() => setFlyTo(null), 1500)
  }, [])

  const handleCaseClick = useCallback((c: CaseItem) => {
    setSelectedCaseId(c.id)
  }, [])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <FilterBar
        filters={filters}
        view={view}
        onFiltersChange={setFilters}
        onViewChange={setView}
        onLocationFound={handleLocationFound}
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

        {view === 'list' && (
          <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
              {cases.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🐾</p>
                  <p className="text-sm">Sin casos en esta zona con los filtros actuales.</p>
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
