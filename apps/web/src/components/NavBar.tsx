import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useNotificationsStore } from '../stores/notificationsStore'
import { getPendingContactsCount } from '../services/contacts.service'
import { logoutRequest } from '../services/auth.service'
import Button from './ui/Button'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'px-3 py-2 rounded-md text-sm font-medium',
    isActive ? 'text-primary-700 bg-primary-50' : 'text-gray-600 hover:text-gray-900',
  ].join(' ')

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [open, setOpen] = useState(false)
  const pendingCount = useNotificationsStore((s) => s.pendingContactsCount)
  const setPendingContactsCount = useNotificationsStore((s) => s.setPendingContactsCount)

  useEffect(() => {
    if (!isAuthenticated) return
    getPendingContactsCount()
      .then(setPendingContactsCount)
      .catch(() => {})
  }, [isAuthenticated, location.pathname, setPendingContactsCount])

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken)
      } catch {
        // ignorar: limpiamos local igual
      }
    }
    clearAuth()
    setOpen(false)
    navigate('/', { replace: true })
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-lg">
          <span aria-hidden="true">🐾</span>
          10_Pet
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            Inicio
          </NavLink>
          <NavLink to="/cases" className={navLinkClass}>
            Mapa
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                <span className="relative inline-flex items-center">
                  Dashboard
                  {pendingCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Mi perfil
              </NavLink>
              {user?.isAdmin && (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link to="/cases/new">
                <Button variant="primary" size="sm">
                  + Reportar
                </Button>
              </Link>
              {user && <span className="text-sm text-gray-500 max-w-[140px] truncate">{user.name ?? user.email}</span>}
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Salir
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Ingresar
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Registrate
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 flex flex-col gap-2">
            <NavLink to="/" end className={navLinkClass} onClick={() => setOpen(false)}>
              Inicio
            </NavLink>
            <NavLink to="/cases" className={navLinkClass} onClick={() => setOpen(false)}>
              Mapa
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/dashboard" className={navLinkClass} onClick={() => setOpen(false)}>
                  <span className="relative inline-flex items-center">
                    Dashboard
                    {pendingCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </span>
                </NavLink>
                <NavLink to="/profile" className={navLinkClass} onClick={() => setOpen(false)}>
                  Mi perfil
                </NavLink>
                <NavLink to="/cases/new" className={navLinkClass} onClick={() => setOpen(false)}>
                  + Reportar
                </NavLink>
                {user?.isAdmin && (
                  <NavLink to="/admin" className={navLinkClass} onClick={() => setOpen(false)}>
                    Admin
                  </NavLink>
                )}
              </>
            )}
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <Button variant="secondary" size="sm" fullWidth onClick={handleLogout}>
                  Salir
                </Button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button variant="secondary" size="sm" fullWidth>
                      Ingresar
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)}>
                    <Button variant="primary" size="sm" fullWidth>
                      Registrate
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
