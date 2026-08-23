import { useState, useEffect, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useNotificationsStore } from '../stores/notificationsStore'
import { getMyCases } from '../services/users.service'
import { listContacts, updateContactStatus, type ContactItem } from '../services/contacts.service'
import { toast } from '../stores/toastStore'
import { Card } from '../components/ui'
import Button from '../components/ui/Button'
import CaseDetailSheet from '../components/cases/CaseDetailSheet'
import { useLastSeen } from '../hooks/useLastSeen'
import { caseSummary, esConversacionLegible } from '../lib/conversations'
import { displayLocation } from '../lib/location'
import type { CaseItem } from '../types/case'

type Tab = 'casos' | 'enviados' | 'recibidos'

// Sin marcador previo (primera visita a la pestaña) no se marca nada: resaltar
// la lista entera no distingue nada.
const isNewerThan = (iso: string, lastSeen: string | null): boolean =>
  lastSeen ? new Date(iso) > new Date(lastSeen) : false

const STATUS_LABELS: Record<string, string> = {
  abierto: 'Abierto',
  en_rescate: 'En rescate',
  resuelto: 'Resuelto',
  inactivo: 'Inactivo',
}

const ANIMAL_EMOJI: Record<string, string> = {
  perro: '🐕',
  gato: '🐈',
  caballo: '🐴',
  vaca: '🐄',
  otro: '🐾',
}

const RESOLUTION_LABELS: Record<string, string> = {
  adoptado:     'Adoptado',
  en_transito:  'En tránsito',
  zoonosis:     'Centro de zoonosis',
  derivado_ong: 'Derivado a ONG',
  fallecio:     'Falleció',
  sin_paradero: 'Sin paradero',
  otro:         'Otro',
}

const CONTACT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  completed: 'Completado',
  rejected: 'Rechazado',
}

const CONTACT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  active: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  completed: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  rejected: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300',
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const decrementPending = useNotificationsStore((s) => s.decrementPending)
  const clearVolunteerUpdates = useNotificationsStore((s) => s.clearVolunteerUpdates)
  const pendingContactsCount = useNotificationsStore((s) => s.pendingContactsCount)
  const [tab, setTab] = useState<Tab>('casos')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [sent, setSent] = useState<ContactItem[]>([])
  const [received, setReceived] = useState<ContactItem[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)

  useEffect(() => {
    getMyCases()
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoadingCases(false))
  }, [])

  const loadContacts = useCallback(() => {
    if (tab === 'casos') return
    setLoadingContacts(true)
    const role = tab === 'enviados' ? 'initiator' : 'responder'
    listContacts(role)
      .then((items) => {
        if (tab === 'enviados') setSent(items)
        else setReceived(items)
      })
      .catch(() => {})
      .finally(() => setLoadingContacts(false))
  }, [tab])

  // La clave de enviados la comparte el NavBar: es el "since" con el que pide
  // el contador de actualizaciones.
  const sentLastSeen = useLastSeen(
    user?.id ? `10pet:contacts:lastCheck:${user.id}` : null,
    tab === 'enviados',
  )
  const receivedLastSeen = useLastSeen(
    user?.id ? `10pet:contacts:lastSeen:received:${user.id}` : null,
    tab === 'recibidos',
  )

  useEffect(() => {
    if (tab === 'enviados') clearVolunteerUpdates()
  }, [tab, clearVolunteerUpdates])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const handleUpdateStatus = async (
    contactId: string,
    status: 'active' | 'rejected' | 'completed',
  ) => {
    try {
      const updated = await updateContactStatus(contactId, status)
      setReceived((prev) => prev.map((c) => (c.id === contactId ? { ...c, ...updated } : c)))
      if (status === 'active') {
        decrementPending()
        toast.success('Solicitud aceptada. Ya podés escribirle desde acá.')
      }
      if (status === 'rejected') {
        decrementPending()
        toast.info('Solicitud rechazada.')
      }
    } catch {
      toast.error('No se pudo actualizar. Intentá de nuevo.')
    }
  }

  // El pb-28 del main deja pasar la ultima tarjeta por debajo de los botones
  // flotantes, que antes la tapaban y la volvian imposible de tocar.
  return (
    <main className="flex-1 px-4 pt-8 pb-28">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Mis casos y solicitudes</h1>
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Hola, <span className="font-medium">{user.name ?? 'Anónimo'}</span>
            </p>
          )}
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['casos', 'enviados', 'recibidos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-primary-600 text-primary-600 dark:text-primary-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {t === 'casos' ? 'Mis casos' : t === 'enviados' ? 'Enviados' : (
                <span className="flex items-center gap-1.5">
                  Recibidos
                  {pendingContactsCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {pendingContactsCount}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'casos' && (
          <>
            {loadingCases ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando casos...</p>
            ) : cases.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Todavía no publicaste ningún caso.</p>
                <Link to="/cases/new">
                  <Button size="sm">Publicar mi primer caso</Button>
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {cases.map((c) => (
                  <CaseCard key={c.id} item={c} onClick={() => setSelectedCaseId(c.id)} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'enviados' && (
          <>
            {loadingContacts ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
            ) : sent.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Todavía no te ofreciste a ayudar en ningún caso.
                </p>
                <Link to="/cases">
                  <Button size="sm" variant="secondary">Ver casos cercanos</Button>
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {sent.map((c) => (
                  <SentContactCard
                    key={c.id}
                    item={c}
                    isNew={isNewerThan(c.updatedAt, sentLastSeen)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'recibidos' && (
          <>
            {loadingContacts ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
            ) : received.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Nadie se ofreció a ayudar en tus casos aún.
                </p>
                <Link to="/cases/new">
                  <Button size="sm" variant="secondary">Publicar un caso</Button>
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {[...received].sort((a, b) => (a.status === 'pending' ? -1 : b.status === 'pending' ? 1 : 0)).map((c) => (
                  <ReceivedContactCard
                    key={c.id}
                    item={c}
                    isNew={isNewerThan(c.createdAt, receivedLastSeen)}
                    onAccept={() => handleUpdateStatus(c.id, 'active')}
                    onReject={() => handleUpdateStatus(c.id, 'rejected')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <CaseDetailSheet caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
    </main>
  )
}

function CaseCard({ item, onClick }: { item: CaseItem; onClick?: () => void }) {
  // La tarjeta abre el detalle con el mouse, asi que tiene que abrirlo tambien
  // con el teclado: sin role ni tabindex el lector de pantalla la lee como texto
  // suelto y el foco la saltea.
  const interactive = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        },
      }
    : {}

  return (
    <Card
      className={[
        'p-4',
        onClick
          ? 'cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
          : '',
      ].join(' ')}
      {...interactive}
    >
      <div className="flex items-start gap-3">
        {item.heroUrl ? (
          <img
            src={item.heroUrl}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <span className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl flex-shrink-0">
            {ANIMAL_EMOJI[item.animalType] ?? '🐾'}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{item.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.animalType}</p>
          {/* Antes, si no habia direccion, caiamos a mostrar el par de coordenadas.
              A quien busca su perro "-34.171, -59.794" no le dice nada; "Sin
              direccion" al menos es honesto sobre lo que sabemos del caso. */}
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {displayLocation(item.locationText) ?? <span className="italic">Sin dirección</span>}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date(item.createdAt).toLocaleDateString('es-AR')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={[
              'text-xs px-2 py-0.5 rounded-full font-medium',
              item.status === 'abierto'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : item.status === 'en_rescate'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : item.status === 'resuelto'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
            ].join(' ')}
          >
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
          {item.status === 'resuelto' && item.resolutionType && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {RESOLUTION_LABELS[item.resolutionType] ?? item.resolutionType}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

// caseSummary y tieneHilo viven en lib/conversations: los comparten esta
// pantalla, la ficha del caso y el perfil publico.

function ThreadButton({ item }: { item: ContactItem }) {
  const unread = item.unreadCount ?? 0
  return (
    <Link
      to={`/contacts/${item.id}`}
      className="flex items-center justify-center gap-2 w-full border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold py-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
    >
      Abrir conversación
      {unread > 0 && (
        <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}

function SentContactCard({ item, isNew }: { item: ContactItem; isNew: boolean }) {
  const statusClass = CONTACT_STATUS_COLORS[item.status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  return (
    <Card className={['p-4', isNew ? 'border-l-4 border-primary-500' : ''].join(' ')}>
      {/* El enlace al caso envuelve solo la cabecera: antes envolvia la tarjeta
          entera, y un <Link> dentro de otro <Link> no es HTML valido. */}
      <Link to={`/cases/${item.caseId}`} className="block hover:opacity-90 transition-opacity">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Solicitud enviada</p>
              {isNew && (
                <span className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold px-1.5 py-0.5 rounded-full">
                  Actualizado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{caseSummary(item)}</p>
            {item.message && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic truncate">"{item.message}"</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date(item.createdAt).toLocaleDateString('es-AR')}
            </p>
          </div>
          <span className={['text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusClass].join(' ')}>
            {CONTACT_STATUS_LABELS[item.status] ?? item.status}
          </span>
        </div>
      </Link>
      {esConversacionLegible(item) && (
        <div className="mt-3">
          <ThreadButton item={item} />
        </div>
      )}
    </Card>
  )
}

function ReceivedContactCard({
  item,
  isNew,
  onAccept,
  onReject,
}: {
  item: ContactItem
  isNew: boolean
  onAccept: () => void
  onReject: () => void
}) {
  const statusClass = CONTACT_STATUS_COLORS[item.status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  const isPending = item.status === 'pending'

  return (
    <Card className={['p-4', isPending ? 'border-l-4 border-amber-400' : ''].join(' ')}>
      <Link to={`/cases/${item.caseId}`} className="block mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                <Link
                  to={`/users/${item.initiatorId}`}
                  className="text-primary-600 dark:text-primary-300 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.initiatorName ?? 'Alguien'}
                </Link>
                {' '}quiere ayudar
              </p>
              {/* No visto Y sin responder. Solo "pendiente" marcaba como nueva
                  una solicitud vista diez veces; solo "no visto" marcaria una
                  que ya aceptaste, y si la aceptaste es que la viste. */}
              {isNew && isPending && (
                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold px-1.5 py-0.5 rounded-full">
                  Nuevo
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{caseSummary(item)}</p>
            {item.message && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">"{item.message}"</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date(item.createdAt).toLocaleDateString('es-AR')}
            </p>
          </div>
          <span className={['text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusClass].join(' ')}>
            {CONTACT_STATUS_LABELS[item.status] ?? item.status}
          </span>
        </div>
      </Link>
      {isPending && (
        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={onAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            Aceptar
          </button>
        </div>
      )}
      {esConversacionLegible(item) && <ThreadButton item={item} />}
    </Card>
  )
}
