import { useEffect } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt()

  /**
   * El banner es `fixed` y se monta fuera del router, asi que ninguna pagina
   * puede reservarle lugar: tapaba la franja inferior y llego a interceptar
   * clics reales (el boton "Editar" de la ficha de un caso). Empujar el fondo
   * del body le da al contenido a donde correrse, y se limpia solo cuando el
   * banner desaparece.
   */
  useEffect(() => {
    if (!canInstall) return
    document.body.style.paddingBottom = '5.5rem'
    return () => {
      document.body.style.paddingBottom = ''
    }
  }, [canInstall])

  if (!canInstall) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Instala 10Pet</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Accedé rápido y recibí notificaciones</p>
      </div>
      <button
        onClick={dismiss}
        className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
        aria-label="Cerrar"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <button
        onClick={install}
        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0 transition-colors"
      >
        Instalar
      </button>
    </div>
  )
}
