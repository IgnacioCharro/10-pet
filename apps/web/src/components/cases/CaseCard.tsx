import { displayLocation, displayDistance } from '../../lib/location'
import type { CaseItem, AnimalType, CaseStatus } from '../../types/case'

const ANIMAL_LABEL: Record<AnimalType, string> = { perro: 'Perro', gato: 'Gato', caballo: 'Caballo', vaca: 'Vaca', otro: 'Otro' }
const ANIMAL_EMOJI: Record<AnimalType, string> = { perro: '🐕', gato: '🐈', caballo: '🐴', vaca: '🐄', otro: '🐾' }

const STATUS_LABEL: Record<CaseStatus, string> = {
  abierto: 'Abierto',
  en_rescate: 'En rescate',
  resuelto: 'Resuelto',
  inactivo: 'Inactivo',
  spam: 'Spam',
}

const STATUS_CLASS: Record<CaseStatus, string> = {
  abierto: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  en_rescate: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  resuelto: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  inactivo: 'bg-gray-100 dark:bg-gray-700 text-gray-400',
  spam: 'bg-red-100 dark:bg-red-900/40 text-red-500',
}

const URGENCY_CLASS: Record<number, string> = {
  1: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  2: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  3: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  4: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  5: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
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
  const urgencyClass = URGENCY_CLASS[c.urgencyLevel] ?? 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  const urgencyLabel = URGENCY_LABEL[c.urgencyLevel] ?? `Urgencia ${c.urgencyLevel}`
  const distance = displayDistance(c.distanceKm)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        {c.heroUrl ? (
          <img
            src={c.heroUrl}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <span className="text-2xl flex-shrink-0 mt-0.5">{ANIMAL_EMOJI[c.animalType]}</span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-base leading-none">{ANIMAL_EMOJI[c.animalType]}</span>
            <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{ANIMAL_LABEL[c.animalType]}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.listingType === 'lost' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'}`}>
              {c.listingType === 'lost' ? 'Busco' : 'Encontré'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[c.status]}`}>
              {STATUS_LABEL[c.status]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyClass}`}>
              {urgencyLabel}
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">{c.description}</p>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1 truncate">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {displayLocation(c.locationText) ?? <span className="italic">Sin dirección</span>}
            </span>
            {distance && <span className="flex-shrink-0">{distance}</span>}
            <span className="flex-shrink-0 ml-auto cursor-help" title={formatExact(c.createdAt)}>{timeAgo(c.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
