import type { HTMLAttributes, ReactNode } from 'react'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

/**
 * Tarjeta del rail. Distinta de Card: radio 16 en vez de 8, y la sombra sale
 * de --card-shadow, que en oscuro es none (ahi las tarjetas se apoyan solo en
 * el borde, como pide la maqueta).
 */
export default function Panel({ children, padded = true, className = '', ...rest }: PanelProps) {
  return (
    <div
      {...rest}
      style={{ boxShadow: 'var(--card-shadow)', ...rest.style }}
      className={[
        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden',
        padded ? 'p-[18px]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
