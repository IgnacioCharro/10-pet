import type { CaseItem, AnimalType, CaseStatus } from '../../types/case'

const ANIMAL_LABEL: Record<AnimalType, string> = { perro: 'Perro', gato: 'Gato', otro: 'Otro' }
const ANIMAL_EMOJI: Record<AnimalType, string> = { perro: '🐕', gato: '🐈', otro: '🐾' }

const STATUS_LABEL: Record<CaseStatus, string> = {
  abierto: 'Abierto',
  en_rescate: 'En rescate',
  resuelto: 'Resuelto',
  inactivo: 'Inactivo',
  spam: 'Spam',
}

const STATUS_CLASS: Record<CaseStatus, string> = {
  abierto: 'bg-green-100 text-green-700',
  en_rescate: 'bg-blue-100 text-blue-700',
  resuelto: 'bg-gray-100 text-gray-500',
  inactivo: 'bg-gray-100 text-gray-400',
  spam: 'bg-red-100 text-red-500',
}

const URGENCY_CLASS: Record<number, string> = {
  1: 'bg-green-50 text-green-700',
  2: 'bg-green-50 text-green-700',
  3: 'bg-amber-50 text-amber-700',
  4: 'bg-orange-50 text-orange-700',
  5: 'bg-red-50 text-red-700',
}

const URGENCY_LABEL: Record<number, string> = {
  1: 'Urgencia baja',
  2: 'Urgencia baja',
  3: 'Urgencia media',
  4: 'Urgencia alta',
  5: 'Urgencia critica',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'hace unos minutos'
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d}d`
  return `hace ${Math.floor(d / 30)}m`
}

function formatExact(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  caseItem: CaseItem
  onClick: () => void
}

export default function CaseCard({ caseItem: c, onClick }: Props) {
  const urgencyClass = URGENCY_CLASS[c.urgencyLevel] ?? 'bg-gray-50 text-gray-600'
  const urgencyLabel = URGENCY_LABEL[c.urgencyLevel] ?? `Urgencia ${c.urgencyLevel}`

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{ANIMAL_EMOJI[c.animalType]}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-gray-800 text-sm">{ANIMAL_LABEL[c.animalType]}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.listingType === 'lost' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
              {c.listingType === 'lost' ? 'Busco' : 'Encontré'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[c.status]}`}>
              {STATUS_LABEL[c.status]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyClass}`}>
              {urgencyLabel}
            </span>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{c.description}</p>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            {c.locationText && !c.locationText.includes('undefined') && (
              <span className="flex items-center gap-1 truncate">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {c.locationText}
              </span>
            )}
            {c.distanceKm != null && (
              <span className="flex-shrink-0">{c.distanceKm.toFixed(1)} km</span>
            )}
            <span className="flex-shrink-0 ml-auto cursor-help" title={formatExact(c.createdAt)}>{timeAgo(c.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
