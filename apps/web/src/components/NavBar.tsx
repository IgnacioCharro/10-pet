import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useNotificationsStore } from '../stores/notificationsStore'
import {
  getPendingContactsCount,
  getContactUpdatesCount,
  getUnreadMessagesCount,
} from '../services/contacts.service'
import { logoutRequest } from '../services/auth.service'
import Button from './ui/Button'
import ThemeToggle from './ThemeToggle'

/*
  El activo se marca con un punto neon, no con un pill de fondo. En una lista
  vertical el pill pesa demasiado y compite con el boton "Reportar", que es del
  mismo violeta. El punto dice lo mismo con menos tinta.

  Los inactivos reservan el ancho del punto para que el label no salte al
  cambiar de seccion: por eso el <span> del punto existe siempre y solo cambia
  su color.
*/
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'font-nav font-medium tracking-[-0.005em] flex items-center gap-3 transition-colors',
    'text-[17px] h-12 px-3.5 rounded-xl lg:text-[15.5px] lg:h-auto lg:px-0 lg:rounded-none',
    isActive
      ? 'text-gray-900 dark:text-gray-100'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
  ].join(' ')

function NavDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="w-1.5 h-1.5 lg:w-[7px] lg:h-[7px] rounded-full flex-shrink-0"
      style={
        active
          ? {
              background: 'var(--nav-active)',
              boxShadow: '0 0 0 4px rgba(168,85,255,.22)',
            }
          : undefined
      }
    />
  )
}

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
  const volunteerUpdatesCount = useNotificationsStore((s) => s.volunteerUpdatesCount)
  const setVolunteerUpdatesCount = useNotificationsStore((s) => s.setVolunteerUpdatesCount)
  const unreadMessagesCount = useNotificationsStore((s) => s.unreadMessagesCount)
  const setUnreadMessagesCount = useNotificationsStore((s) => s.setUnreadMessagesCount)

  useEffect(() => {
    if (!isAuthenticated) return
    getPendingContactsCount()
      .then(setPendingContactsCount)
      .catch(() => {})
    const since = user?.id
      ? (localStorage.getItem(`10pet:contacts:lastCheck:${user.id}`) ?? undefined)
      : undefined
    getContactUpdatesCount(since)
      .then(setVolunteerUpdatesCount)
      .catch(() => {})
    // Sin marcador local: los mensajes se dan por vistos al abrir el hilo, y esa
    // marca la guarda el servidor por solicitud y por persona. Se vuelve a pedir
    // en cada cambio de ruta, que es lo que baja el globo al salir de un hilo.
    getUnreadMessagesCount()
      .then(setUnreadMessagesCount)
      .catch(() => {})
  }, [
    isAuthenticated,
    location.pathname,
    setPendingContactsCount,
    setVolunteerUpdatesCount,
    setUnreadMessagesCount,
    user?.id,
  ])

  // Un solo numero en el globo: solicitudes por responder, cambios de estado de
  // las que envie, y mensajes sin leer. Tres cosas distintas, pero para quien
  // mira la barra es "tengo algo pendiente en Mis casos".
  const badgeCount = pendingCount + volunteerUpdatesCount + unreadMessagesCount

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
    <header
      className="border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 backdrop-blur-[14px]"
      style={{ paddingTop: 'env(safe-area-inset-top)', background: 'var(--header-bg)' }}
    >
      {/* h-16 en mobile, h-[68px] desde lg, como fija el handoff. Si cambia,
          mover tambien el calc de CasesPage, que depende de esta altura.
          ToastContainer NO depende: en desktop el toast va abajo (md:bottom-4)
          y su calc de arriba solo corre por debajo de md, donde el header
          sigue midiendo 64. */}
      <div className="max-w-6xl lg:max-w-[1408px] mx-auto px-4 lg:px-10 h-16 lg:h-[68px] flex items-center justify-between">
        {/* font-semibold y no font-bold: del woff2 de Lora solo cargamos el peso 600
            (ver el @font-face de index.css). Pedirle 700 haria que el browser fabrique
            la negrita engordando los trazos. */}
        <Link to="/" className="flex items-center gap-2.5 text-primary-600 dark:text-primary-300 font-brand font-semibold text-[22px]">
          {/* El mismo archivo en los dos temas: el escudo violeta con huella crema se sostiene
              sobre claro y sobre oscuro, y asi la marca no cambia de identidad al togglear.
              La version negativo es para fotos, no para dark. Va como <img> porque es de dos
              colores; la version de una tinta necesitaria el SVG inline. */}
          <img src="/brand/10_pet-logo.svg" alt="" aria-hidden="true" className="w-[34px] h-[34px]" />
          10_Pet
        </Link>

        <nav className="hidden md:flex items-center gap-[30px]">
          <NavLink to="/" end className={navLinkClass}>
            {({ isActive }) => (
              <>
                <NavDot active={isActive} />
                Inicio
              </>
            )}
          </NavLink>
          <NavLink to="/cases" end className={navLinkClass}>
            {({ isActive }) => (
              <>
                <NavDot active={isActive} />
                Mapa
              </>
            )}
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                {({ isActive }) => (
                  <>
                    <NavDot active={isActive} />
                    <span className="relative inline-flex items-center">
                      Mis casos
                      {badgeCount > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                {({ isActive }) => (
                  <>
                    <NavDot active={isActive} />
                    Mi perfil
                  </>
                )}
              </NavLink>
              {user?.isAdmin && (
                <NavLink to="/admin" className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      <NavDot active={isActive} />
                      Admin
                    </>
                  )}
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Link to="/cases/new">
                <Button variant="primary" size="sm">
                  + Reportar
                </Button>
              </Link>
              {user && (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(user.name ?? 'A').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200 max-w-[120px] truncate">{user.name ?? 'Anonimo'}</span>
                </div>
              )}
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

        {isAuthenticated && (
          <Link
            to="/cases/new"
            className="md:hidden flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Reportar
          </Link>
        )}

        <button
          type="button"
          className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-4 py-3 flex flex-col gap-2">
            <NavLink to="/" end className={navLinkClass} onClick={() => setOpen(false)}>
              {({ isActive }) => (
                <>
                  <NavDot active={isActive} />
                  Inicio
                </>
              )}
            </NavLink>
            <NavLink to="/cases" end className={navLinkClass} onClick={() => setOpen(false)}>
              {({ isActive }) => (
                <>
                  <NavDot active={isActive} />
                  Mapa
                </>
              )}
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/dashboard" className={navLinkClass} onClick={() => setOpen(false)}>
                  {({ isActive }) => (
                    <>
                      <NavDot active={isActive} />
                      <span className="relative inline-flex items-center">
                        Mis casos
                        {badgeCount > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                            {badgeCount > 9 ? '9+' : badgeCount}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </NavLink>
                <NavLink to="/profile" className={navLinkClass} onClick={() => setOpen(false)}>
                  {({ isActive }) => (
                    <>
                      <NavDot active={isActive} />
                      Mi perfil
                    </>
                  )}
                </NavLink>
                {user?.isAdmin && (
                  <NavLink to="/admin" className={navLinkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <NavDot active={isActive} />
                        Admin
                      </>
                    )}
                  </NavLink>
                )}
                <Link to="/cases/new" onClick={() => setOpen(false)} className="mt-2">
                  <Button variant="primary" size="md" fullWidth>
                    + Reportar un caso
                  </Button>
                </Link>
              </>
            )}
            <a
              href="/#como-funciona"
              onClick={() => setOpen(false)}
              className="font-nav text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3"
            >
              Como funciona
            </a>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 dark:border-gray-700 flex items-center justify-between">
              <span className="px-3 text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-300">
                Modo oscuro
              </span>
              <ThemeToggle />
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 dark:border-gray-700 flex flex-col gap-2">
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
