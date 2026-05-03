import { useState, useRef } from 'react'
import type { AnimalType, AnimalSex, AnimalSize, AnimalColor, SortOrder } from '../../types/case'

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

const SEX_OPTIONS: { value: AnimalSex | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
  { value: 'desconocido', label: 'No se' },
]

const SIZE_OPTIONS: { value: AnimalSize | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'chico', label: 'Chico' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande', label: 'Grande' },
]

const COLOR_OPTIONS: { value: AnimalColor | ''; label: string; hex?: string; border?: boolean }[] = [
  { value: '', label: 'Todos' },
  { value: 'negro', label: 'Negro', hex: '#1f2937' },
  { value: 'blanco', label: 'Blanco', hex: '#f9fafb', border: true },
  { value: 'marron', label: 'Marron', hex: '#92400e' },
  { value: 'gris', label: 'Gris', hex: '#9ca3af' },
  { value: 'dorado', label: 'Dorado', hex: '#d97706' },
  { value: 'manchado', label: 'Manchado', hex: '#6366f1' },
  { value: 'tricolor', label: 'Tricolor', hex: '#10b981' },
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
  animalSex: AnimalSex | ''
  animalSize: AnimalSize | ''
  animalColor: AnimalColor | ''
}

interface Props {
  filters: FilterState
  view: 'map' | 'list'
  onFiltersChange: (f: FilterState) => void
  onViewChange: (v: 'map' | 'list') => void
  onLocationFound: (lat: number, lng: number, zoom: number, label?: string) => void
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
  const [showMore, setShowMore] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = (patch: Partial<FilterState>) => onFiltersChange({ ...filters, ...patch })

  const hasExtraFilters = filters.animalSex !== '' || filters.animalSize !== '' || filters.animalColor !== ''

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
    const label = r.display_name.split(',').slice(0, 2).join(',').trim()
    setSearch(label)
    setSuggestions([])
    onLocationFound(parseFloat(r.lat), parseFloat(r.lon), 14, label)
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
            Explorar
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

          <div className="w-px bg-gray-200 self-stretch" />

          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
              hasExtraFilters
                ? 'bg-primary-600 text-white border-primary-600'
                : showMore
                ? 'bg-gray-100 text-gray-700 border-gray-300'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400',
            ].join(' ')}
          >
            {hasExtraFilters && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />}
            Mas filtros
            <svg
              className={['w-3 h-3 transition-transform', showMore || hasExtraFilters ? 'rotate-180' : ''].join(' ')}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {(showMore || hasExtraFilters) && (
        <div className="overflow-x-auto pb-1 border-t border-gray-100 pt-3">
          <div className="flex gap-4 min-w-max">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 flex-shrink-0">Sexo:</span>
              {SEX_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set({ animalSex: o.value as AnimalSex | '' })}
                  className={chip(filters.animalSex === o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="w-px bg-gray-200 self-stretch" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 flex-shrink-0">Tamaño:</span>
              {SIZE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set({ animalSize: o.value as AnimalSize | '' })}
                  className={chip(filters.animalSize === o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="w-px bg-gray-200 self-stretch" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 flex-shrink-0">Color:</span>
              {COLOR_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set({ animalColor: o.value as AnimalColor | '' })}
                  className={chip(filters.animalColor === o.value)}
                >
                  {o.hex ? (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={['w-3 h-3 rounded-full inline-block flex-shrink-0', o.border ? 'border border-gray-400' : ''].join(' ')}
                        style={{ background: o.hex }}
                      />
                      {o.label}
                    </span>
                  ) : o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
