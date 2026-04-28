import { lazy, type ComponentType } from 'react'

const RELOAD_KEY = '10pet:chunk-reload'

// Tras un deploy, los chunks viejos en memoria del navegador apuntan a archivos
// que ya no existen. Vercel devuelve el index.html del SPA fallback con MIME
// text/html en lugar del .js esperado, y el browser falla al parsearlo.
// Recargamos una sola vez por sesion para forzar fetch del manifest nuevo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory()
      sessionStorage.removeItem(RELOAD_KEY)
      return mod
    } catch (err) {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1'
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        return new Promise<{ default: T }>(() => {})
      }
      throw err
    }
  })
}
