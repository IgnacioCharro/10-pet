import { useState, useEffect, useCallback } from 'react'
import { Card } from '../components/ui'
import Button from '../components/ui/Button'
import {
  getAdminStats,
  listAdminUsers,
  banAdminUser,
  listAdminReports,
  updateAdminReport,
  patchAdminCase,
  type AdminStats,
  type AdminUser,
  type AdminReport,
} from '../services/admin.service'

type Tab = 'stats' | 'reports' | 'users'

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  fake: 'Caso falso',
  offensive: 'Contenido ofensivo',
  duplicate: 'Duplicado',
  other: 'Otro',
}

const STATUS_LABELS: Record<string, string> = {
  abierto: 'Abierto',
  en_rescate: 'En rescate',
  resuelto: 'Resuelto',
  inactivo: 'Inactivo',
  spam: 'Spam',
  eliminado: 'Eliminado',
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <span className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</span>
      <span className="text-sm font-medium text-gray-600">{label}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </Card>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('stats')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const [reports, setReports] = useState<AdminReport[]>([])
  const [reportsTotal, setReportsTotal] = useState(0)
  const [reportsPage, setReportsPage] = useState(1)
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportsStatusFilter, setReportsStatusFilter] = useState<string>('pending')

  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  const loadReports = useCallback(() => {
    if (tab !== 'reports') return
    setLoadingReports(true)
    listAdminReports({ page: reportsPage, limit: 20, status: reportsStatusFilter || undefined })
      .then((r) => {
        setReports(r.reports)
        setReportsTotal(r.total)
      })
      .catch(() => {})
      .finally(() => setLoadingReports(false))
  }, [tab, reportsPage, reportsStatusFilter])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const loadUsers = useCallback(() => {
    if (tab !== 'users') return
    setLoadingUsers(true)
    listAdminUsers({ page: usersPage, limit: 20, search: usersSearch || undefined })
      .then((r) => {
        setUsers(r.users)
        setUsersTotal(r.total)
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
  }, [tab, usersPage, usersSearch])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleDismissReport = async (report: AdminReport) => {
    await updateAdminReport(report.id, 'dismissed')
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'dismissed' } : r)))
  }

  const handleDeleteCase = async (report: AdminReport) => {
    if (!report.targetCaseId) return
    await patchAdminCase(report.targetCaseId, 'delete')
    await updateAdminReport(report.id, 'resolved')
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'resolved' } : r)))
  }

  const handleToggleBan = async (user: AdminUser) => {
    const action = user.bannedAt ? 'unban' : 'ban'
    await banAdminUser(user.id, action)
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, bannedAt: action === 'ban' ? new Date().toISOString() : null } : u,
      ),
    )
  }

  const tabClass = (t: Tab) =>
    [
      'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
      tab === t
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-500 hover:text-gray-700',
    ].join(' ')

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de administracion</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion de usuarios, reportes y casos</p>
        </div>

        <div className="flex border-b border-gray-200">
          <button className={tabClass('stats')} onClick={() => setTab('stats')}>
            Estadisticas
          </button>
          <button className={tabClass('reports')} onClick={() => setTab('reports')}>
            Reportes
            {stats && stats.pendingReports > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {stats.pendingReports}
              </span>
            )}
          </button>
          <button className={tabClass('users')} onClick={() => setTab('users')}>
            Usuarios
          </button>
        </div>

        {tab === 'stats' && (
          <div className="flex flex-col gap-6">
            {loadingStats ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Usuarios" value={stats.totalUsers} sub={`+${stats.newUsersLast7d} esta semana`} />
                  <StatCard label="Casos" value={stats.totalCases} sub={`+${stats.newCasesLast7d} esta semana`} />
                  <StatCard
                    label="Casos activos"
                    value={(stats.casesByStatus['abierto'] ?? 0) + (stats.casesByStatus['en_rescate'] ?? 0)}
                  />
                  <StatCard label="Reportes pendientes" value={stats.pendingReports} />
                </div>

                <Card className="p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Casos por estado</h2>
                  <div className="flex flex-col gap-2">
                    {Object.entries(stats.casesByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{STATUS_LABELS[status] ?? status}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <p className="text-sm text-red-500">Error al cargar estadisticas</p>
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <select
                className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white"
                value={reportsStatusFilter}
                onChange={(e) => {
                  setReportsStatusFilter(e.target.value)
                  setReportsPage(1)
                }}
              >
                <option value="pending">Pendientes</option>
                <option value="dismissed">Descartados</option>
                <option value="resolved">Resueltos</option>
                <option value="">Todos</option>
              </select>
              <span className="text-sm text-gray-500">{reportsTotal} total</span>
            </div>

            {loadingReports ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-gray-400">Sin reportes.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {reports.map((r) => (
                  <Card key={r.id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {REASON_LABELS[r.reason] ?? r.reason}
                        </span>
                        {r.description && (
                          <p className="text-sm text-gray-700">{r.description}</p>
                        )}
                        <span className="text-xs text-gray-400">
                          {r.targetCaseId ? `Caso: ${r.targetCaseId.slice(0, 8)}...` : ''}
                          {' · '}
                          {new Date(r.createdAt).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                      <span
                        className={[
                          'text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
                          r.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : r.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600',
                        ].join(' ')}
                      >
                        {r.status === 'pending' ? 'Pendiente' : r.status === 'resolved' ? 'Resuelto' : 'Descartado'}
                      </span>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="secondary" size="sm" onClick={() => handleDismissReport(r)}>
                          Descartar
                        </Button>
                        {r.targetCaseId && (
                          <Button variant="danger" size="sm" onClick={() => handleDeleteCase(r)}>
                            Eliminar caso
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {reportsTotal > 20 && (
              <div className="flex items-center gap-2 justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={reportsPage === 1}
                  onClick={() => setReportsPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-500">
                  Pag {reportsPage} / {Math.ceil(reportsTotal / 20)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={reportsPage >= Math.ceil(reportsTotal / 20)}
                  onClick={() => setReportsPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Buscar por email o nombre..."
                className="text-sm border border-gray-200 rounded-md px-3 py-1.5 flex-1 max-w-xs"
                value={usersSearch}
                onChange={(e) => {
                  setUsersSearch(e.target.value)
                  setUsersPage(1)
                }}
              />
              <span className="text-sm text-gray-500">{usersTotal} usuarios</span>
            </div>

            {loadingUsers ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-400">Sin resultados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {users.map((u) => (
                  <Card key={u.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {u.name ?? u.email}
                        </span>
                        {u.name && (
                          <span className="text-xs text-gray-500 truncate">{u.email}</span>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          {!u.emailVerified && (
                            <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                              Sin verificar
                            </span>
                          )}
                          {u.bannedAt && (
                            <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              Baneado
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{u.casesCount} casos</span>
                          <span className="text-xs text-gray-400">
                            {new Date(u.createdAt).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant={u.bannedAt ? 'secondary' : 'danger'}
                        size="sm"
                        onClick={() => handleToggleBan(u)}
                      >
                        {u.bannedAt ? 'Desbanear' : 'Banear'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {usersTotal > 20 && (
              <div className="flex items-center gap-2 justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={usersPage === 1}
                  onClick={() => setUsersPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-500">
                  Pag {usersPage} / {Math.ceil(usersTotal / 20)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={usersPage >= Math.ceil(usersTotal / 20)}
                  onClick={() => setUsersPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
