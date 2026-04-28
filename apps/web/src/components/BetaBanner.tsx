import { useState } from 'react'

const STORAGE_KEY = '10pet:beta-banner-dismissed'

export default function BetaBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem(STORAGE_KEY) !== '1')

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4 text-sm text-amber-800">
      <p className="flex-1 text-center">
        <span className="font-semibold">Beta</span> — Esta app está en desarrollo activo.
        Los datos que ingresás son reales pero la plataforma puede cambiar sin aviso.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="shrink-0 text-amber-600 hover:text-amber-800 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
