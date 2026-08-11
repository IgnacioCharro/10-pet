import { useState, useEffect } from 'react'
import { isSnoozed, snooze } from '../lib/snooze'

const SNOOZE_KEY = '10pet:install-banner-snooze'
const SNOOZE_DAYS = 30

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(() => isSnoozed(SNOOZE_KEY))

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    const installedHandler = () => setIsInstalled(true)

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setPrompt(null)
      setIsInstalled(true)
    }
  }

  const dismiss = () => {
    snooze(SNOOZE_KEY, SNOOZE_DAYS)
    setDismissed(true)
  }

  return { canInstall: !!prompt && !isInstalled && !dismissed, isInstalled, install, dismiss }
}
