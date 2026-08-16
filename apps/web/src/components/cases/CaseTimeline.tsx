import { useState } from 'react'
import type { CaseUpdateItem, CaseUpdateType, CaseStatus } from '../../types/case'
import type { VetAssistanceItem } from '../../services/vet-assistances.service'

/**
 * Linea de tiempo vertical del caso. Reemplaza a las secciones sueltas "Historial del
 * caso" y "Atencion veterinaria", que contaban la misma historia en dos lugares.
 *
 * Diseño: docs/superpowers/specs/2026-08-13-timeline-caso-design.md
 *
 * Dos cosas que no son obvias al leer el JSX:
 *
 * - Los hitos "Publicado" y el de cierre son **derivados**, no filas de case_updates.
 *   Salen de case.createdAt y case.status/resolutionType. Sin ellos la linea empieza y
 *   termina en el aire.
 * - Las atenciones veterinarias viven en otra tabla (vet_assistances) pero se ordenan
 *   en el mismo stream. Se ordenan por attendedAt ?? createdAt: en una linea de tiempo
 *   importa cuando paso, no cuando se cargo.
 */

const DOT: Record<CaseUpdateType, string> = {
  avistamiento:  'bg-blue-500',
  alojamiento:   'bg-amber-500',
  salud:         'bg-pink-500',
  veterinario:   'bg-teal-500',
  comentario:    'bg-gray-500',
  // Legacy: se renderizan pero van en gris, no compiten visualmente con los vigentes.
  status_change: 'bg-gray-400',
  comment:       'bg-gray-400',
  photo_added:   'bg-gray-400',
  reactivated:   'bg-gray-400',
}

const LABEL: Record<CaseUpdateType, string> = {
  avistamiento:  'Avistamiento',
  alojamiento:   'Cambio de alojamiento',
  salud:         'Estado de salud',
  veterinario:   'Atención veterinaria',
  comentario:    'Novedad',
  status_change: 'Cambio de estado',
  comment:       'Comentario',
  photo_added:   'Foto agregada',
  reactivated:   'Reactivado',
}

export const OWNER_UPDATE_TYPES: CaseUpdateType[] = [
  'avistamiento', 'alojamiento', 'salud', 'veterinario', 'comentario',
]

const OWNER_TYPE_LABELS: Record<string, string> = {
  avistamiento: 'Lo vi en otro lugar',
  alojamiento:  'Cambió de lugar',
  salud:        'Estado de salud',
  veterinario:  'Atención veterinaria',
  comentario:   'Otra novedad',
}

const PLACEHOLDERS: Record<string, string> = {
  avistamiento: 'Dónde fue visto, cuándo, en qué condición...',
  // 'quién lo tiene' salio del placeholder: ahora es un campo aparte.
  alojamiento:  'Dónde está ahora, en qué condiciones, hasta cuándo...',
  salud:        'Cómo está: heridas, si come, si mejoró o empeoró...',
  veterinario:  'Nombre del vet, diagnóstico, tratamiento...',
  comentario:   'Contá la novedad...',
}

const RESOLUTION_LABEL: Record<string, string> = {
  adoptado:     'Adoptado',
  en_transito:  'En tránsito',
  zoonosis:     'Centro de zoonosis',
  derivado_ong: 'Derivado a ONG',
  fallecio:     'Falleció',
  sin_paradero: 'Sin paradero',
  otro:         'Resuelto',
}

// Los dos unicos cierres terminales y sin ambiguedad. El rojo se reserva para estos:
// en cualquier otro hito mentiria.
const TERMINAL = new Set(['fallecio', 'sin_paradero'])

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function formatExact(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** Un hito ya normalizado: da igual de que tabla vino. */
interface Milestone {
  key: string
  at: string
  dot: string
  label: string
  /**
   * Persona que le pone nombre al hito, cuando la fuente la trae: el veterinario que
   * atendio, o quien aloja al animal. Las demas novedades solo tienen userId, que es
   * siempre el dueño del caso y no aporta nada.
   */
  who?: string | null
  isVet?: boolean
  /** Si es null el hito no lleva flecha: no se promete contenido que no existe. */
  body?: React.ReactNode
}

function buildMilestones(
  createdAt: string,
  status: CaseStatus,
  resolutionType: string | null,
  updates: CaseUpdateItem[],
  assistances: VetAssistanceItem[],
): Milestone[] {
  const middle: Milestone[] = [
    ...updates.map((u) => ({
      key: `u-${u.id}`,
      at: u.createdAt,
      dot: DOT[u.updateType] ?? DOT.comentario,
      label: LABEL[u.updateType] ?? LABEL.comentario,
      who: u.hostName,
      body: u.content ? <p className="whitespace-pre-line">{u.content}</p> : undefined,
    })),
    ...assistances.map((a) => ({
      key: `a-${a.id}`,
      at: a.attendedAt ?? a.createdAt,
      dot: DOT.veterinario,
      label: LABEL.veterinario,
      who: a.userName,
      isVet: a.isVet,
      body: (a.procedure || a.medication) ? (
        <>
          {a.procedure && (
            <p><span className="font-medium text-gray-500 dark:text-gray-400">Procedimiento: </span>{a.procedure}</p>
          )}
          {a.medication && (
            <p><span className="font-medium text-gray-500 dark:text-gray-400">Medicación: </span>{a.medication}</p>
          )}
        </>
      ) : undefined,
    })),
  ].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime())

  const closing: Milestone = (() => {
    if (status === 'resuelto' && resolutionType) {
      const terminal = TERMINAL.has(resolutionType)
      return {
        key: 'end',
        at: '',
        dot: terminal ? 'bg-red-500' : 'bg-violet-600',
        label: RESOLUTION_LABEL[resolutionType] ?? 'Resuelto',
      }
    }
    return {
      key: 'end',
      at: '',
      dot: 'bg-violet-600',
      label: status === 'en_rescate' ? 'En rescate' : status === 'resuelto' ? 'Resuelto' : 'Caso activo',
    }
  })()

  return [
    { key: 'start', at: createdAt, dot: 'bg-violet-600', label: 'Publicado' },
    ...middle,
    closing,
  ]
}

function MilestoneRow({ m, last }: { m: Milestone; last: boolean }) {
  const [open, setOpen] = useState(false)
  const expandable = m.body != null

  const head = (
    <div className="flex items-baseline gap-2 min-w-0 flex-1 text-left">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{m.label}</span>
      {m.who && (
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {m.who}
          {m.isVet && <span className="ml-1 text-teal-600 dark:text-teal-400" title="Profesional verificado">✓</span>}
        </span>
      )}
      <span className="ml-auto flex items-center gap-1 flex-shrink-0">
        {m.at && (
          <span className="text-xs text-gray-500 dark:text-gray-400" title={formatExact(m.at)}>
            {formatDate(m.at)}
          </span>
        )}
        {expandable && (
          <span className={`text-gray-500 dark:text-gray-400 text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        )}
      </span>
    </div>
  )

  return (
    <li className="relative pl-5">
      {/*
        El tramo cuelga de cada punto menos del ultimo. Va desde el centro del punto
        (top-[9px]) y mide h-full: asi llega justo al centro del punto siguiente y la
        linea se lee continua. Con bottom-0 quedaba cortado a media fila y con huecos
        arriba y abajo del punto, que a 1px se lee como nada.
        Se pinta antes que el punto para que el punto lo tape donde se cruzan.
      */}
      {!last && <span className="absolute left-[3px] top-[9px] h-full w-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />}
      <span className={`absolute left-0 top-1.5 w-[7px] h-[7px] rounded-full ${m.dot}`} aria-hidden="true" />

      {expandable ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="w-full flex py-1 hover:opacity-70 transition-opacity"
          >
            {head}
          </button>
          {open && (
            <div className="pb-2 pr-1 text-xs text-gray-700 dark:text-gray-200 leading-snug flex flex-col gap-0.5">
              {m.body}
            </div>
          )}
        </>
      ) : (
        <div className="flex py-1">{head}</div>
      )}
    </li>
  )
}

export interface CaseTimelineProps {
  createdAt: string
  status: CaseStatus
  resolutionType: string | null
  updates: CaseUpdateItem[]
  assistances: VetAssistanceItem[]
  isOwner: boolean
  isAuthenticated: boolean
  // Alta de novedad (solo el dueño)
  showAddUpdate: boolean
  addUpdateType: CaseUpdateType
  addUpdateContent: string
  addUpdateHostName: string
  addUpdateLoading: boolean
  onToggleForm: () => void
  onTypeChange: (t: CaseUpdateType) => void
  onContentChange: (v: string) => void
  onHostNameChange: (v: string) => void
  onSubmit: () => void
  // Alta de atencion veterinaria (cualquier autenticado)
  showVetForm: boolean
  vetProcedure: string
  vetMedication: string
  vetLoading: boolean
  onToggleVetForm: () => void
  onVetProcedureChange: (v: string) => void
  onVetMedicationChange: (v: string) => void
  onVetSubmit: () => void
}

export default function CaseTimeline({
  createdAt, status, resolutionType, updates, assistances,
  isOwner, isAuthenticated,
  showAddUpdate, addUpdateType, addUpdateContent, addUpdateHostName, addUpdateLoading,
  onToggleForm, onTypeChange, onContentChange, onHostNameChange, onSubmit,
  showVetForm, vetProcedure, vetMedication, vetLoading,
  onToggleVetForm, onVetProcedureChange, onVetMedicationChange, onVetSubmit,
}: CaseTimelineProps) {
  const milestones = buildMilestones(createdAt, status, resolutionType, updates, assistances)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Historia del caso
        </p>
        <div className="flex items-center gap-3">
          {isOwner && (
            <button
              type="button"
              onClick={onToggleForm}
              className="text-xs text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 font-medium"
            >
              {showAddUpdate ? 'Cancelar' : '+ Novedad'}
            </button>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={onToggleVetForm}
              className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              {showVetForm ? 'Cancelar' : '+ Atención'}
            </button>
          )}
        </div>
      </div>

      {showAddUpdate && isOwner && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col gap-3 bg-gray-50 dark:bg-gray-700">
          <div className="flex flex-wrap gap-1.5">
            {OWNER_UPDATE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTypeChange(t)}
                className={[
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  addUpdateType === t
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400',
                ].join(' ')}
              >
                {/* El anillo solo en el seleccionado: sin el, el punto gris de
                    'comentario' se pierde contra el violeta del chip activo. */}
                <span
                  className={[
                    'inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle',
                    DOT[t],
                    addUpdateType === t ? 'ring-1 ring-white/70' : '',
                  ].join(' ')}
                />
                {OWNER_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {addUpdateType === 'alojamiento' && (
            <div>
              <label htmlFor="host-name" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                ¿Quién lo tiene?
              </label>
              <input
                id="host-name"
                type="text"
                maxLength={100}
                placeholder="Nombre de quien lo aloja"
                value={addUpdateHostName}
                onChange={(e) => onHostNameChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Se muestra en la línea de tiempo. Opcional.
              </p>
            </div>
          )}
          <textarea
            rows={3}
            placeholder={PLACEHOLDERS[addUpdateType] ?? PLACEHOLDERS.comentario}
            value={addUpdateContent}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={addUpdateLoading || !addUpdateContent.trim()}
            className="self-end px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {addUpdateLoading ? 'Guardando...' : 'Publicar novedad'}
          </button>
        </div>
      )}

      {showVetForm && isAuthenticated && (
        <div className="border border-teal-200 dark:border-teal-800 rounded-xl p-3 flex flex-col gap-3 bg-teal-50 dark:bg-teal-900/30">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Procedimiento</label>
            <textarea
              rows={2}
              placeholder="Examen, diagnóstico, tratamiento aplicado..."
              value={vetProcedure}
              onChange={(e) => onVetProcedureChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Medicación</label>
            <textarea
              rows={2}
              placeholder="Nombre, dosis, frecuencia..."
              value={vetMedication}
              onChange={(e) => onVetMedicationChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Completá al menos uno de los dos campos.</p>
          <button
            type="button"
            onClick={onVetSubmit}
            disabled={vetLoading || (!vetProcedure.trim() && !vetMedication.trim())}
            className="self-end px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {vetLoading ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      )}

      <ol className="flex flex-col">
        {milestones.map((m, i) => (
          <MilestoneRow key={m.key} m={m} last={i === milestones.length - 1} />
        ))}
      </ol>
    </div>
  )
}
