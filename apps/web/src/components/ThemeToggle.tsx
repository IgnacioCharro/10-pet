import { useThemeStore } from '../stores/themeStore'

/**
 * Dos estados: el tema del sistema y el opuesto. Volver al del sistema
 * desancla, no fija — la logica vive en el store.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)

  const goingDark = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggle}
      title={goingDark ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      aria-label={goingDark ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      className={[
        'p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {goingDark ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        )}
      </svg>
    </button>
  )
}
