// Estaba copiada en CaseCard, CaseDetailSheet, CasePage y HomeFeed, y las copias
// divergieron: la de CaseCard abreviaba los meses como "m", que se lee como
// minutos. Gana la version larga.
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'hace unos minutos'
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d}d`
  return `hace ${Math.floor(d / 30)} meses`
}

export function formatExact(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
