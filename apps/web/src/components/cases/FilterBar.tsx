import { useState, useRef } from 'react'
import type { AnimalType, SortOrder } from '../../types/case'

const ANIMAL_OPTIONS: { value: AnimalType | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'perro', label: '🐕 Perro' },
  { value: 'gato', label: '🐈 Gato' },
  { value: 'otro', label: '🐾 Otro' },
]

const RADIUS_OPTIONS = [5, 10, 20, 50]

const URGENCY_OPTIONS: { value: number | 0; label: string }[] = [
  { value: 0, label: 'Todos' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 5, label: 'Critica' },
]

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'recent', label: 'Reciente' },
  { value: 'urgency', label: 'Urgencia' },
  { value: 'distance', label: 'Distancia' },
]

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
}

export interface FilterState {
  animalType: AnimalType | ''
  urgencyMin: number
  radius: number
  sort: SortOrder
}

interface Props {
  filters: FilterState
  view: 'map' | 'list'
  onFiltersChange: (f: FilterState) => void
  onViewChange: (v: 'map' | 'list') => void
  onLocationFound: (lat: number, lng: number, zoom: number) => void
  zoneLabel?: string | null
  onChangeZone?: () => void
}

function chip(active: boolean) {
  return [
    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
    active
      ? 'bg-primary-600 text-white border-primary-600'
      : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400',
  ].join(' ')
}

export default function FilterBar({ filters, view, onFiltersChange, onViewChange, onLocationFound, zoneLabel, onChangeZone }: Props) {
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = (patch: Partial<FilterState>) => onFiltersChange({ ...filters, ...patch })

  const handleSearchChange = (q: string) => {
    setSearch(q)
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
          { headers: { 'Accept-Language': 'es' } },
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
    setSearch(r.display_name.split(',').slice(0, 2).join(','))
    setSuggestions([])
    onLocationFound(parseFloat(r.lat), parseFloat(r.lon), 14)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3 z-10 relative">
      {zoneLabel && onChangeZone && (
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs text-gray-600 truncate flex-1">{zoneLabel}</span>
          <button
            type="button"
            onClick={onChangeZone}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
          >
            Cambiar zona
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar zona (ej: Pergamino, Tandil…)"
            className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searching && (
            <div className="absolute right-2 top-2.5 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          )}
          {suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
              {suggestions.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 truncate"
                  >
                    {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => onViewChange('map')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${view === 'map' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Mapa
          </button>
          <button
            type="button"
            onClick={() => onViewChange('list')}
            className={`px-3 py-2 text-xs font-medium transition-colors border-l border-gray-300 ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Lista
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-4 min-w-max">
          <div className="flex items-center gap-1.5">
            {ANIMAL_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set({ animalType: o.value as AnimalType | '' })}
                className={chip(filters.animalType === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="w-px bg-gray-200 self-stretch" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 flex-shrink-0">Urgencia:</span>
            {URGENCY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set({ urgencyMin: o.value })}
                className={chip(filters.urgencyMin === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="w-px bg-gray-200 self-stretch" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 flex-shrink-0">Radio:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set({ radius: r })}
                className={chip(filters.radius === r)}
              >
                {r} km
              </button>
            ))}
          </div>

          {view === 'list' && (
            <>
              <div className="w-px bg-gray-200 self-stretch" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 flex-shrink-0">Orden:</span>
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set({ sort: o.value })}
                    className={chip(filters.sort === o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
