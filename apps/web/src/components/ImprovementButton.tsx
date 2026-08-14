import { useState } from 'react'
import { api } from '../lib/api'
import { toast } from '../stores/toastStore'
import { useAuthStore } from '../stores/authStore'

/**
 * Bandeja de mejoras: solo para admin. Es la libreta del que desarrolla, no el canal de
 * los testers — ese sigue siendo FeedbackButton, que manda mail y no toca esta tabla.
 * Lo que se escribe acá queda en la DB para triagearlo despues desde Claude Code.
 */
export default function ImprovementButton() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user?.isAdmin) return null

  const handleSubmit = async () => {
    if (!note.trim()) return
    setLoading(true)
    try {
      await api.post('/improvements', {
        note: note.trim(),
        // Contexto automatico: la idea es escribir la nota y seguir testeando.
        route: window.location.pathname + window.location.search,
        userAgent: navigator.userAgent,
      })
      toast.success('Anotado en la bandeja.')
      setNote('')
      setOpen(false)
    } catch {
      toast.error('No se pudo guardar la nota. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Al lado del boton de feedback y no encima: apilados ocupaban 192px de
          alto y tapaban los controles del pie de /cases/:id. Lado a lado son 48. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-20 z-30 bg-amber-500 hover:bg-amber-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-colors"
        style={{ bottom: 'calc(5rem + var(--install-banner-h, 0px))' }}
        aria-label="Anotar una mejora"
        title="Anotar una mejora (solo admin)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed z-50 bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Anotar mejora</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Queda guardado con la ruta donde estás. Se revisa después desde Claude Code.
            </p>
            <textarea
              rows={4}
              placeholder="Ej: el filtro de tamaño no se resetea al cambiar de zona"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !note.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
