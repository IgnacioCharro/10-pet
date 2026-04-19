import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getMyCases } from '../services/users.service'
import { api } from '../lib/api'
import { Card } from '../components/ui'
import Button from '../components/ui/Button'
import type { CaseItem } from '../types/case'

type Tab = 'casos' | 'contactos'

interface ContactItem {
  id: string
  caseId: string
  initiatorId: string
  responderId: string
  status: string
  message: string | null
  createdAt: string
}

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
  const [tab, setTab] = useState<Tab>('casos')
  const [cases, setCases] = useState<CaseItem[]>([])
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)

  useEffect(() => {
    getMyCases()
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoadingCases(false))
  }, [])

  useEffect(() => {
    if (tab !== 'contactos') return
    setLoadingContacts(true)
    api
      .get<{ contacts: ContactItem[] }>('/contacts', { params: { role: 'initiator' } })
      .then((r) => setContacts(r.data.contacts ?? []))
      .catch(() => {})
      .finally(() => setLoadingContacts(false))
  }, [tab])

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            {user && (
              <p className="text-sm text-gray-500 mt-0.5">
                Hola, <span className="font-medium">{user.name ?? user.email}</span>
              </p>
            )}
          </div>
          <Link to="/cases/new">
            <Button size="sm">+ Reportar</Button>
          </Link>
        </div>

        <div className="flex border-b border-gray-200">
          {(['casos', 'contactos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {t === 'casos' ? 'Mis casos' : 'Mis contactos'}
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

        {tab === 'contactos' && (
          <>
            {loadingContacts ? (
              <p className="text-sm text-gray-400">Cargando contactos...</p>
            ) : contacts.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500">
                  No te ofreciste a ayudar en ningún caso todavía.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {contacts.map((c) => (
                  <ContactCard key={c.id} item={c} userId={user?.id ?? ''} />
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

function ContactCard({ item, userId }: { item: ContactItem; userId: string }) {
  const isInitiator = item.initiatorId === userId
  const statusClass = CONTACT_STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-600'
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isInitiator ? 'Ofreciste ayuda' : 'Alguien quiere ayudar'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">Caso: {item.caseId}</p>
          {item.message && (
            <p className="text-xs text-gray-400 mt-0.5 italic truncate">"{item.message}"</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(item.createdAt).toLocaleDateString('es-AR')}
          </p>
        </div>
        <span
          className={['text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusClass].join(
            ' ',
          )}
        >
          {CONTACT_STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
    </Card>
  )
}
