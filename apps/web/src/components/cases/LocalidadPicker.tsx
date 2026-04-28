import { useState, useRef } from 'react'
import Button from '../ui/Button'

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
}

export interface PickedLocation {
  center: [number, number]
  label: string
}

interface Props {
  onPick: (loc: PickedLocation) => void
}

const STORAGE_KEY = '10pet:mapa:centro'

export function savePickedLocation(loc: PickedLocation) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
  } catch {
    // ignorar si localStorage no está disponible
  }
}

export function loadPickedLocation(): PickedLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PickedLocation
  } catch {
    return null
  }
}

export default function LocalidadPicker({ onPick }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [geolocating, setGeolocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = (q: string) => {
    setQuery(q)
    setGeoError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=ar`,
          { headers: { 'Accept-Language': 'es', 'User-Agent': '10pet-web/1.0' } },
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  const handleSuggestionClick = (r: NominatimResult) => {
    const loc: PickedLocation = {
      center: [parseFloat(r.lat), parseFloat(r.lon)],
      label: r.display_name.split(',').slice(0, 2).join(',').trim(),
    }
    savePickedLocation(loc)
    onPick(loc)
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.')
      return
    }
    setGeolocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: PickedLocation = {
          center: [pos.coords.latitude, pos.coords.longitude],
          label: 'Mi ubicación',
        }
        savePickedLocation(loc)
        onPick(loc)
        setGeolocating(false)
      },
      () => {
        setGeoError('No se pudo obtener tu ubicación. Buscá tu localidad.')
        setGeolocating(false)
      },
      { timeout: 10000 },
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute left-0 right-0 top-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm bg-white shadow-xl rounded-b-2xl sm:rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">¿En qué zona buscás?</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Buscá tu localidad o usá tu ubicación actual.
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Ej: Pergamino, Tandil, Azul…"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searching && (
            <div className="absolute right-3 top-3 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          )}
          {suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {suggestions.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(r)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50"
                  >
                    <span className="block truncate">{r.display_name.split(',').slice(0, 2).join(',')}</span>
                    <span className="block text-xs text-gray-400 truncate">{r.display_name.split(',').slice(2).join(',')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">o usá tu ubicación</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <Button
          onClick={handleGeolocate}
          loading={geolocating}
          fullWidth
          variant="secondary"
        >
          Usar mi ubicación
        </Button>

        {geoError && (
          <p className="text-xs text-red-600 -mt-2">{geoError}</p>
        )}
      </div>
    </div>
  )
}
