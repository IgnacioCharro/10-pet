import { useState, useRef, useEffect, useCallback } from 'react'
import { type Localidad, type NominatimRaw, parseLocalidad, buildLocalidadUrl } from '../../lib/geocoding'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (loc: Localidad) => void
  placeholder?: string
  className?: string
}

export default function LocalidadAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Ej: Pehuajo, Junin...',
  className = '',
}: Props) {
  const [suggestions, setSuggestions] = useState<Localidad[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Buffer local del texto tipeado, separado del prop `value`. Un input
  // controlado que dependiera solo de `value` pierde tecleo cuando el padre
  // no lo re-sincroniza en el mismo tick (React repone el DOM al ultimo
  // `value` recibido despues de cada evento); este buffer evita esa perdida
  // y solo se resincroniza cuando `value` cambia por una razon externa.
  const [query, setQuery] = useState(value)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const url = buildLocalidadUrl(q)
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data: NominatimRaw[] = await res.json()
      const parsed = data.map(parseLocalidad).filter((l): l is Localidad => l !== null)
      setSuggestions(parsed)
      setOpen(parsed.length > 0)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 400)
  }

  const handleSelect = (loc: Localidad) => {
    setQuery(loc.name)
    onChange(loc.name)
    setOpen(false)
    setSuggestions([])
    onSelect(loc)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={[
            'w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            className,
          ].join(' ')}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">...</span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 truncate"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(s)
                }}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
