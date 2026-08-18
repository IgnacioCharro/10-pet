import { Panel } from '../ui'
import type { ZoneStats } from '../../services/cases.service'

interface Props {
  stats: ZoneStats | null
  loading: boolean
}

/**
 * La maqueta muestra cuatro metricas; dos de ellas ("voluntarios cerca" y
 * "respuesta media") necesitan producto que todavia no existe y viven en un
 * bloque posterior. Este panel muestra las dos que si son calculables mas el
 * desglose por tipo.
 */
export default function ZoneStatsPanel({ stats, loading }: Props) {
  const items = [
    { value: stats?.activeCases, label: 'casos activos' },
    { value: stats?.resolvedThisMonth, label: 'resueltos este mes' },
    { value: stats?.byListingType.found, label: 'encontrados' },
    { value: stats?.byListingType.lost, label: 'buscados' },
  ]

  return (
    <Panel>
      <h3 className="text-[12.5px] font-bold tracking-[0.13em] uppercase text-gray-600 dark:text-gray-400 mb-3.5">
        Tu zona
      </h3>
      <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
        {items.map((it) => (
          <div key={it.label} className="bg-white dark:bg-gray-800 px-4 py-3.5">
            <b className="block font-brand text-[25px] font-bold leading-none text-gray-900 dark:text-gray-100">
              {loading ? '—' : (it.value ?? 0)}
            </b>
            <span className="block mt-1.5 text-[12.5px] text-gray-600 dark:text-gray-400">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
