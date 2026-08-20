import type { AnimalCondition } from '../../types/case'
import { CONDITION_LABEL } from '../../lib/animalType'
import { timeAgo } from '../../lib/time'

// Estaban copiados byte a byte en CaseDetailSheet.tsx y CasePage.tsx. Se
// extraen aca para que un cambio de texto o de comportamiento (por ej. el
// handler de copiar al portapapeles) se haga en un solo lugar.

interface CaseTitleCodeProps {
  title: string
  publicCode: string
}

// Encabezado con el titulo del caso y su codigo publico, con boton para
// copiarlo al portapapeles.
export function CaseTitleCode({ title, publicCode }: CaseTitleCodeProps) {
  return (
    <div className="flex items-baseline gap-2 mb-1">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(publicCode)}
        title="Copiar el codigo del caso"
        className="font-mono text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600"
      >
        #{publicCode}
      </button>
    </div>
  )
}

interface CaseConditionInfoProps {
  animalCondition: AnimalCondition | null
  seenAt: string | null
}

// Estado del animal y hace cuanto fue visto, cada uno oculto si no hay dato.
export function CaseConditionInfo({ animalCondition, seenAt }: CaseConditionInfoProps) {
  return (
    <>
      {animalCondition && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Estado:</span> {CONDITION_LABEL[animalCondition]}
        </p>
      )}
      {seenAt && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Visto:</span> {timeAgo(seenAt)}
        </p>
      )}
    </>
  )
}
