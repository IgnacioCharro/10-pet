import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useNotificationsStore } from '../stores/notificationsStore'
import { getMyCases } from '../services/users.service'
import { listContacts, updateContactStatus, type ContactItem } from '../services/contacts.service'
import { toast } from '../stores/toastStore'
import { Card } from '../components/ui'
import Button from '../components/ui/Button'
import type { CaseItem } from '../types/case'

type Tab = 'casos' | 'enviados' | 'recibidos'

const STATUS_LABELS: Record<string, string> = {
  abierto: 'Abierto',
  en_rescate: 'En rescate',
  resuelto: 'Resuelto',
  inactivo: 'Inactivo',
}

const CONTACT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  completed: 'Completado',
  rejected: 'Rechazado',
}

const CONTACT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-600',
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const decrementPending = useNotificationsStore((s) => s.decrementPending)
  const [tab, setTab] = useState<Tab>('casos')
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
        toast.success('Solicitud aceptada.')
      }
      if (status === 'rejected') {
        decrementPending()
        toast.info('Solicitud rechazada.')
      }
    } catch {
      toast.error('No se pudo actualizar. Intentá de nuevo.')
    }
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            {user && (
              <p className="text-sm text-gray-500 mt-0.5">
                Hola, <span className="font-medium">{user.name ?? 'Anónimo'}</span>
              </p>
            )}
          </div>
          <Link to="/cases/new">
            <Button size="sm">+ Reportar</Button>
          </Link>
        </div>

        <div className="flex border-b border-gray-200">
          {(['casos', 'enviados', 'recibidos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {t === 'casos' ? 'Mis casos' : t === 'enviados' ? 'Enviados' : 'Recibidos'}
            </button>
          ))}
        </div>

        {tab === 'casos' && (
          <>
            {loadingCases ? (
              <p className="text-sm text-gray-400">Cargando casos...</p>
            ) : cases.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 mb-3">Todavía no publicaste ningún caso.</p>
                <Link to="/cases/new">
                  <Button size="sm">Publicar mi primer caso</Button>
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {cases.map((c) => (
                  <CaseCard key={c.id} item={c} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'enviados' && (
          <>
            {loadingContacts ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : sent.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 mb-3">
                  Todavía no te ofreciste a ayudar en ningún caso.
                </p>
                <Link to="/cases">
                  <Button size="sm" variant="secondary">Ver casos cercanos</Button>
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {sent.map((c) => (
                  <SentContactCard key={c.id} item={c} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'recibidos' && (
          <>
            {loadingContacts ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : received.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 mb-3">
                  Nadie se ofreció a ayudar en tus casos aún.
                </p>
                <Link to="/cases/new">
                  <Button size="sm" variant="secondary">Publicar un caso</Button>
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {received.map((c) => (
                  <ReceivedContactCard
                    key={c.id}
                    item={c}
                    onAccept={() => handleUpdateStatus(c.id, 'active')}
                    onReject={() => handleUpdateStatus(c.id, 'rejected')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function CaseCard({ item }: { item: CaseItem }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{item.animalType}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {item.locationText ?? `${item.lat?.toFixed(3)}, ${item.lng?.toFixed(3)}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(item.createdAt).toLocaleDateString('es-AR')}
          </p>
        </div>
        <span
          className={[
            'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
            item.status === 'abierto'
              ? 'bg-green-100 text-green-700'
              : item.status === 'en_rescate'
              ? 'bg-blue-100 text-blue-700'
              : item.status === 'resuelto'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-yellow-100 text-yellow-700',
          ].join(' ')}
        >
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
    </Card>
  )
}

const ANIMAL_LABELS: Record<string, string> = {
  perro: 'Perro',
  gato: 'Gato',
  otro: 'Animal',
}

function caseSummary(item: ContactItem): string {
  const animal = ANIMAL_LABELS[item.caseAnimalType ?? ''] ?? 'Caso'
  const location = item.caseLocationText ?? ''
  return location ? `${animal} · ${location}` : animal
}

function SentContactCard({ item }: { item: ContactItem }) {
  const statusClass = CONTACT_STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-600'
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Solicitud enviada</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{caseSummary(item)}</p>
          {item.message && (
            <p className="text-xs text-gray-400 mt-0.5 italic truncate">"{item.message}"</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(item.createdAt).toLocaleDateString('es-AR')}
          </p>
        </div>
        <span className={['text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusClass].join(' ')}>
          {CONTACT_STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
    </Card>
  )
}

function ReceivedContactCard({
  item,
  onAccept,
  onReject,
}: {
  item: ContactItem
  onAccept: () => void
  onReject: () => void
}) {
  const statusClass = CONTACT_STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-600'
  const isPending = item.status === 'pending'

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Alguien quiere ayudar</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{caseSummary(item)}</p>
          {item.message && (
            <p className="text-xs text-gray-600 mt-1 italic">"{item.message}"</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(item.createdAt).toLocaleDateString('es-AR')}
          </p>
        </div>
        <span className={['text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusClass].join(' ')}>
          {CONTACT_STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
      {isPending && (
        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="flex-1 border border-gray-200 text-gray-600 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
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
    </Card>
  )
}
