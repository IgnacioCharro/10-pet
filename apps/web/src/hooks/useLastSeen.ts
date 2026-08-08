import { useEffect, useState } from 'react'

/**
 * Marca una pestaña como vista y devuelve el marcador *anterior*, congelado
 * al momento de abrirla.
 *
 * El valor viejo hay que guardarlo en estado: leer localStorage directo en el
 * render no sirve, porque para cuando llegan los datos del server el efecto ya
 * estampo la visita y entonces nada se ve nunca como nuevo.
 *
 * Devuelve null la primera vez que se abre la pestaña (nunca hubo visita, asi
 * que no hay con que comparar) y mientras el efecto no corrio todavia.
 */
export function useLastSeen(key: string | null, active: boolean): string | null {
  const [previous, setPrevious] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !key) return
    setPrevious(localStorage.getItem(key))
    localStorage.setItem(key, new Date().toISOString())
  }, [active, key])

  return previous
}
