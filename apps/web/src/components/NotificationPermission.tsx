import { useState } from 'react'
import { requestPushPermission } from '../services/fcm.service'

export function NotificationPermission() {
  const [state, setState] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle')

  if (!('Notification' in window)) return null
  if (Notification.permission === 'granted') return null
  if (Notification.permission === 'denied') return null
  if (state === 'granted' || state === 'denied') return null

  const handleEnable = async () => {
    setState('loading')
    const ok = await requestPushPermission()
    setState(ok ? 'granted' : 'denied')
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 flex items-start gap-3">
        <span className="text-2xl shrink-0" role="img" aria-label="campana">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Activar notificaciones</p>
          <p className="text-xs text-gray-500 mt-0.5">Te avisamos cuando acepten tu solicitud de contacto.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={state === 'loading'}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {state === 'loading' ? 'Activando...' : 'Activar'}
            </button>
            <button
              onClick={() => setState('denied')}
              className="text-gray-500 hover:text-gray-700 text-xs px-3 py-1.5"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
