import type { ReactNode } from 'react'

interface RailProps {
  children: ReactNode
  className?: string
}

/**
 * Columna derecha de escritorio. Sticky en top 100px, como fija el handoff.
 * Regla que hay que respetar al llenarlo: el rail nunca contiene acciones
 * unicas — todo lo que vive aca existe tambien en el flujo principal.
 *
 * El "hidden lg:flex" vive ACA y no en quien lo usa: si el consumidor pasara
 * "hidden" por className contra un "flex" de esta base, ganaria el que Tailwind
 * emite ultimo en el CSS, no el que aparece ultimo en el string. El rail
 * quedaria visible en mobile de forma intermitente segun el orden de las
 * utilidades. Decidiendolo aca no hay conflicto posible.
 */
export default function Rail({ children, className = '' }: RailProps) {
  return (
    <aside
      className={['sticky top-[100px] hidden lg:flex lg:flex-col gap-5', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </aside>
  )
}
