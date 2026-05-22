import { useState, useRef, useEffect, useCallback } from 'react'

interface StreetSuggestion {
  display_name: string
  name: string
  class: string
  type: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  localidad: string
  placeholder?: string
  label?: string
}

export default function CalleAutocomplete({ value, onChange, localidad, placeholder = 'Ej: San Martin', label }: Props) {
  const [suggestions, setSuggestions] = useState<StreetSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2 || !localidad.trim()) {
        setSuggestions([])
        setOpen(false)
        return
      }
      setLoading(true)
      try {
        const query = `${q.trim()}, ${localidad.trim()}, Argentina`
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ar&addressdetails=0&limit=8`
        const res = await fetch(url, { headers: { 'Accept-Language': 'es', 'User-Agent': '10pet-web/1.0' } })
        const data: StreetSuggestion[] = await res.json()
        const streets = data.filter((s) => s.class === 'highway' || s.type === 'residential' || s.type === 'primary' || s.type === 'secondary' || s.type === 'tertiary' || s.type === 'unclassified')
        const seen = new Set<string>()
        const unique = (streets.length > 0 ? streets : data).filter((s) => {
          const name = s.name || s.display_name.split(',')[0].trim()
          if (seen.has(name)) return false
          seen.add(name)
          return true
        }).slice(0, 5)
        setSuggestions(unique)
        setOpen(unique.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    },
    [localidad],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 450)
  }

  const handleSelect = (s: StreetSuggestion) => {
    const name = s.name || s.display_name.split(',')[0].trim()
    onChange(name)
    setOpen(false)
    setSuggestions([])
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
    <div ref={containerRef} className="relative flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => {
            const name = s.name || s.display_name.split(',')[0].trim()
            return (
              <li key={i}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 truncate"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(s)
                  }}
                >
                  {name}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
