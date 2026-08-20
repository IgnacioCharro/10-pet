import { useState, useEffect, useCallback, Suspense } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import FilterBar, { type FilterState } from '../components/cases/FilterBar'
import CaseDetailSheet from '../components/cases/CaseDetailSheet'
import LocalidadPicker, { loadPickedLocation, savePickedLocation, type PickedLocation } from '../components/cases/LocalidadPicker'
import { getNearbyCases } from '../services/cases.service'
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
  animalSex: '',
  animalSize: '',
  animalColor: '',
}

export default function CasesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const currentUserId = currentUser?.id

  const notificationZone =
    currentUser?.notificationLat != null && currentUser.notificationLng != null && currentUser.notificationRadiusKm != null
      ? {
          center: [currentUser.notificationLat, currentUser.notificationLng] as [number, number],
          radiusMeters: currentUser.notificationRadiusKm * 1000,
        }
      : null

  const [initialPublished] = useState<PublishedState | null>(() => {
    const s = location.state as PublishedState | null
    if (s && typeof s.lat === 'number' && typeof s.lng === 'number') return s
    return null
  })

  const [storedLoc] = useState<PickedLocation | null>(() => loadPickedLocation())

  const [showPicker, setShowPicker] = useState<boolean>(
    () => !initialPublished && !loadPickedLocation(),
  )

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
      const [lat, lng] = center
      const data = await getNearbyCases({
        lat,
        lng,
        radius: filters.radius,
      })
      const filtered = data.filter((c) => {
        if (filters.animalType && c.animalType !== filters.animalType) return false
        if (filters.urgencyMin && c.urgencyLevel < filters.urgencyMin) return false
        if (filters.animalSex && c.animalSex !== filters.animalSex) return false
        if (filters.animalSize && c.animalSize !== filters.animalSize) return false
        if (filters.animalColor && c.animalColor !== filters.animalColor) return false
        return true
      })
      setCases(filtered)
    } catch {
      // ignorar
    } finally {
      setLoading(false)
    }
  }, [center, filters])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

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
    // El header mide 64 en mobile y 68 desde lg. Si cambia alla, cambia aca.
    <div className="flex flex-col h-[calc(100vh-64px)] lg:h-[calc(100vh-68px)]">
      {showPicker && <LocalidadPicker onPick={handlePickerPick} />}

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onLocationFound={handleLocationFound}
        zoneLabel={zoneLabel}
        onChangeZone={handleChangeZone}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <div className="flex-1 relative overflow-hidden z-0">
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-white dark:bg-gray-800 rounded-full px-3 py-1.5 shadow-md flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            Cargando casos…
          </div>
        )}

        <Suspense fallback={<div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">Cargando mapa…</div>}>
          <LeafletMap
            center={center}
            cases={cases}
            userLocation={userLocation}
            onCaseClick={handleCaseClick}
            flyToTrigger={flyTo}
            currentUserId={currentUserId}
            notificationZone={notificationZone}
          />
        </Suspense>

        <div className="absolute bottom-3 right-3 z-20 bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow px-2.5 py-2 flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300">Buscado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-green-500 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300">Encontrado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-amber-500 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300">En riesgo</span>
          </div>
        </div>

        {cases.length === 0 && !loading && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 text-sm max-w-xs w-full mx-4">
            <span className="text-2xl">🐾</span>
            <div className="flex-1 min-w-0">
              <p className="text-gray-700 dark:text-gray-200 font-medium text-xs leading-tight">Sin casos en esta zona</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">¿Viste un animal en problema?</p>
            </div>
            <Link
              to="/cases/new"
              className="flex-shrink-0 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Publicar
            </Link>
          </div>
        )}
      </div>

      <CaseDetailSheet caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
    </div>
  )
}
