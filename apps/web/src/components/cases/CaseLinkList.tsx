import { Link } from 'react-router-dom'
import type { CaseItem, CaseStatus } from '../../types/case'
import { ANIMAL_EMOJI } from '../../lib/animalType'
import { LISTING_TYPE } from '../../lib/listingType'
import { timeAgo } from '../../lib/time'

// Mismo catalogo que CaseCard, DashboardPage y compania. Ya vive en seis
// archivos: si hace falta un septimo, conviene extraerlo antes.
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
  inactivo: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  spam: 'bg-red-100 dark:bg-red-900/40 text-red-500',
}

interface Props {
  items: CaseItem[]
  title: string
  /** Que decir cuando la lista esta vacia. Sin esto la seccion desaparece sin explicar nada. */
  emptyText: string
}

/**
 * Los casos de una persona como lista de enlaces, para su perfil publico.
 *
 * El perfil tenia dos contadores y ningun modo de llegar a lo que contaban: se
 * podia leer "5 casos ayudados" sin poder abrir ninguno. Es la misma forma que
 * ConversationList, que resolvio lo mismo para el chat.
 */
export default function CaseLinkList({ items, title, emptyText }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                to={`/cases/${c.id}`}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-lg shrink-0" aria-hidden="true">{ANIMAL_EMOJI[c.animalType]}</span>
                <div className="min-w-0 flex flex-col flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {c.title}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLASS[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                    <span>{LISTING_TYPE[c.listingType].long}</span>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(c.createdAt)}</span>
                  </span>
                </div>
                <span className="text-gray-400 dark:text-gray-500 text-sm shrink-0" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
