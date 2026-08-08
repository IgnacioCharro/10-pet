import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = '10pet:theme'

// Verde de marca en claro, gris-900 en oscuro: es la barra de estado del
// navegador y de la PWA instalada.
const THEME_COLOR: Record<Theme, string> = { light: '#16a34a', dark: '#111827' }

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

const systemTheme = (): Theme => (darkQuery().matches ? 'dark' : 'light')

/** null = el usuario no fijo nada y manda el sistema. */
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    // modo privado / storage bloqueado
    return null
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme])
}

interface ThemeState {
  theme: Theme
  /** true cuando el usuario fijo un tema y el sistema ya no manda. */
  isPinned: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // El script inline de index.html ya puso la clase; esto solo lee lo mismo
  // para que React arranque en sintonia.
  theme: storedTheme() ?? systemTheme(),
  isPinned: storedTheme() !== null,

  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'

    // Volver al tema del sistema desancla en vez de fijarlo: asi el control
    // tiene dos estados reales (sistema / el opuesto) y no queda anclado para
    // siempre despues del primer click.
    const pinned = next !== systemTheme()
    try {
      if (pinned) localStorage.setItem(STORAGE_KEY, next)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // sin persistencia, el tema dura lo que la pestaña
    }

    applyTheme(next)
    set({ theme: next, isPinned: pinned })
  },
}))

// El SO puede cambiar de tema con la app abierta (los modos noche automaticos
// lo hacen solos). Solo obedecemos si el usuario no fijo nada.
darkQuery().addEventListener('change', (event) => {
  if (storedTheme() !== null) return
  const next: Theme = event.matches ? 'dark' : 'light'
  applyTheme(next)
  useThemeStore.setState({ theme: next, isPinned: false })
})
