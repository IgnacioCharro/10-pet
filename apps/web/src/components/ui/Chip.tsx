import type { ReactNode } from 'react'

interface ChipProps {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}

export default function Chip({ active, onClick, children, className = '' }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        // min-h-[36px] y no menos: el handoff pide 44px de toque, que se
        // completa con el gap vertical de la fila de chips.
        'px-3.5 py-2 min-h-[36px] rounded-full text-[13px] font-medium border transition-colors whitespace-nowrap',
        active
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
