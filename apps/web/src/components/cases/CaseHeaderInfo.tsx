import type { AnimalCondition, Whereabouts } from '../../types/case'
import { CONDITION_LABEL } from '../../lib/animalType'
import { WHEREABOUTS_LABEL } from '../../lib/whereabouts'
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

interface CaseLocationInfoProps {
  locationText: string | null
  referenceNote: string | null
  whereabouts: Whereabouts
}

/**
 * Dos textos que dicen lo mismo escritos distinto. Compara sin mayusculas, sin
 * tildes y con los espacios colapsados porque las dos puntas las escribio la
 * misma persona a mano, en momentos distintos: "12 de Octubre y Espana" y
 * "12 de octubre y Espana" son el mismo dato.
 */
function mismoTexto(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  return norm(a) === norm(b)
}

/**
 * Donde lo vieron y donde esta son dos cosas distintas, y se leen una debajo de
 * la otra a proposito. La ubicacion del caso marca siempre el avistamiento: el
 * domicilio de quien rescata no entra al sistema. Decirlo con todas las letras
 * es lo que evita que el pin se lea como "aca vive el que lo tiene".
 */
export function CaseLocationInfo({ locationText, referenceNote, whereabouts }: CaseLocationInfoProps) {
  // La referencia se calla cuando repite la direccion. Hasta #128 el paso de
  // ubicacion no tenia donde escribir la calle, asi que muchos la anotaron como
  // referencia y despues la cargaron igual como direccion al editar: la ficha
  // terminaba diciendo dos veces lo mismo, que se lee como un error y no como el
  // dato de mas que es.
  const repetida = referenceNote != null && locationText != null && mismoTexto(referenceNote, locationText)

  return (
    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <div className="min-w-0 flex flex-col gap-0.5">
        {locationText && (
          <p><span className="font-medium">Dónde lo vieron:</span> {locationText}</p>
        )}
        {referenceNote && !repetida && (
          <p className="text-gray-500 dark:text-gray-400">{referenceNote}</p>
        )}
        <p><span className="font-medium">Dónde está:</span> {WHEREABOUTS_LABEL[whereabouts]}</p>
      </div>
    </div>
  )
}
