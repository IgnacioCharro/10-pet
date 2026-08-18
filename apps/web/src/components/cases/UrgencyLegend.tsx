import { Panel } from '../ui'
import type { ZoneStats } from '../../services/cases.service'

interface Props {
  stats: ZoneStats | null
}

// Los colores salen de las variables de tema, que cambian con el modo. El
// texto acompana siempre al color: es regla del handoff.
const FILAS = [
  { key: 'critica', label: 'Critica', color: 'var(--red)' },
  { key: 'alta', label: 'Alta', color: 'var(--amber)' },
  { key: 'media', label: 'Media', color: 'var(--yellow)' },
  { key: 'baja', label: 'Baja', color: 'var(--green)' },
] as const

export default function UrgencyLegend({ stats }: Props) {
  if (!stats) return null

  return (
    <Panel>
      <h3 className="text-[12.5px] font-bold tracking-[0.13em] uppercase text-gray-600 dark:text-gray-400 mb-3.5">
        Por urgencia
      </h3>
      <div className="flex flex-col gap-2.5">
        {FILAS.map((f) => (
          <div
            key={f.key}
            className="flex items-center gap-2.5 text-[13.5px] text-gray-700 dark:text-gray-300"
          >
            <i
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: f.color }}
            />
            {f.label}
            <span className="ml-auto text-[12.5px] text-gray-600 dark:text-gray-400 tabular-nums">
              {stats.byUrgency[f.key]}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
