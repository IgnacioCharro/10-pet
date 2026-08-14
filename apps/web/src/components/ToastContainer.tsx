import { useToastStore } from '../stores/toastStore'

const typeClasses = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-800 text-white',
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  /*
    Arriba en mobile, abajo en desktop. Abajo el toast caia justo sobre la
    botonera de CaseDetailSheet ("Editar" / "Marcar como resuelto"): confirmaba
    la accion tapando el boton que la habia disparado. Subirle el bottom no
    alcanzaba porque esa botonera cambia de alto segun el caso (uno, dos o el
    de WhatsApp). Arriba queda libre, debajo de la navbar sticky.

    El calc no es capricho: la navbar mide 4rem mas el safe-area-inset-top,
    asi que en un iPhone con notch un top fijo dejaba el toast pisandola.
    El 5rem es esa altura mas 1rem de aire; si cambia la navbar, cambia esto.
  */
  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)_+_5rem)] md:top-auto md:bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
            'pointer-events-auto min-w-[220px] max-w-[340px]',
            typeClasses[t.type],
          ].join(' ')}
        >
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
