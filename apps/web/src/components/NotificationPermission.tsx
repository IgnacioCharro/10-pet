import { useState } from 'react'
import { requestPushPermission } from '../services/fcm.service'
import { isSnoozed, snooze } from '../lib/snooze'

const SNOOZE_KEY = '10pet:push-banner-snooze'
const SNOOZE_DAYS = 7

export function NotificationPermission() {
  const [state, setState] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle')
  const [snoozed, setSnoozed] = useState(() => isSnoozed(SNOOZE_KEY))

  if (!('Notification' in window)) return null
  if (Notification.permission === 'granted') return null
  if (Notification.permission === 'denied') return null
  if (state === 'granted' || state === 'denied') return null
  if (snoozed) return null

  const handleEnable = async () => {
    setState('loading')
    const ok = await requestPushPermission()
    setState(ok ? 'granted' : 'denied')
  }

  const handleDismiss = () => {
    snooze(SNOOZE_KEY, SNOOZE_DAYS)
    setSnoozed(true)
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-3">
        <span className="text-2xl shrink-0" role="img" aria-label="campana">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Activar notificaciones</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Te avisamos cuando acepten tu solicitud de contacto.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={state === 'loading'}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {state === 'loading' ? 'Activando...' : 'Activar'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs px-3 py-1.5"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
