// Snooze de avisos recurrentes: guarda en localStorage el instante hasta el que
// el aviso queda callado. Si localStorage no esta disponible (modo privado), el
// snooze vale solo para la sesion en curso.

export function isSnoozed(key: string): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const until = Number(raw)
    if (!Number.isFinite(until)) return false
    return Date.now() < until
  } catch {
    return false
  }
}

export function snooze(key: string, days: number): void {
  try {
    localStorage.setItem(key, String(Date.now() + days * 24 * 60 * 60 * 1000))
  } catch {
    // sin localStorage no hay nada que persistir
  }
}
