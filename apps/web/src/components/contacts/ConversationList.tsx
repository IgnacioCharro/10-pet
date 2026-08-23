import { Link } from 'react-router-dom'
import type { ContactItem } from '../../services/contacts.service'
import { caseSummary } from '../../lib/conversations'
import { timeAgo } from '../../lib/time'

interface Props {
  items: ContactItem[]
  /** Encabezado de la seccion. Sin el, la lista se monta desnuda. */
  title?: string
  /**
   * Que rotula cada fila. En el perfil de una persona el caso es lo que
   * distingue una conversacion de otra; dentro de un caso, todas comparten el
   * caso y lo que distingue es con quien se habla.
   */
  label: 'caso' | 'persona'
  /** Solo hace falta para `label="persona"`: de quien es el punto de vista. */
  currentUserId?: string
}

/**
 * Las conversaciones como lista de enlaces. La usan el perfil publico de una
 * persona y la ficha de un caso, que hasta ahora no tenian ninguna forma de
 * llegar al chat: la unica puerta estaba en el dashboard.
 */
export default function ConversationList({ items, title, label, currentUserId }: Props) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {title && (
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const unread = item.unreadCount ?? 0
          const otro = currentUserId
            ? (item.initiatorId === currentUserId ? item.responderName : item.initiatorName)
            : null
          return (
            <li key={item.id}>
              <Link
                to={`/contacts/${item.id}`}
                className="flex items-center justify-between gap-3 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="min-w-0 flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {label === 'caso' ? caseSummary(item) : (otro ?? 'Conversación')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.lastMessageAt
                      ? timeAgo(item.lastMessageAt)
                      : (item.status === 'completed' ? 'Cerrada' : 'Sin mensajes')}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {unread > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  <span className="text-gray-400 dark:text-gray-500 text-sm" aria-hidden="true">›</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
