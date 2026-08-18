interface UrgencyTagProps {
  level: number
  className?: string
}

export const URGENCY_LABEL: Record<number, string> = {
  1: 'Baja',
  2: 'Baja',
  3: 'Media',
  4: 'Alta',
  5: 'Critica',
}

// El 4 va naranja y no rojo: en rojo se confundia con el 5. El 5 si pesa mas a
// proposito, es el que encabeza la grilla de urgentes.
const URGENCY_CLS: Record<number, string> = {
  1: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  2: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  3: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  4: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  5: 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200 font-semibold',
}

/**
 * Chip de urgencia. Regla del handoff: el color va SIEMPRE con texto, nunca
 * color solo. Por eso el componente no acepta una variante "solo color".
 */
export default function UrgencyTag({ level, className = '' }: UrgencyTagProps) {
  const label = URGENCY_LABEL[level] ?? 'Media'
  const cls = URGENCY_CLS[level] ?? URGENCY_CLS[3]

  return (
    <span
      className={['text-xs px-2 py-0.5 rounded-full font-medium', cls, className]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  )
}
