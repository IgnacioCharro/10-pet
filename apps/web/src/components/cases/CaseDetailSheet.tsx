import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCaseById, addCaseUpdate, updateCase, type ResolutionType } from '../../services/cases.service'
import { getVetAssistances, createVetAssistance } from '../../services/vet-assistances.service'
import type { VetAssistanceItem } from '../../services/vet-assistances.service'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../stores/toastStore'
import type { CaseDetail, CaseStatus, CaseUpdateType, CaseVolunteer } from '../../types/case'
import { ContactModal } from './ContactModal'
import { ReportModal } from './ReportModal'
import CaseTimeline from './CaseTimeline'
import { ANIMAL_LABEL, ANIMAL_EMOJI, CONDITION_LABEL } from '../../lib/animalType'
import { LISTING_TYPE } from '../../lib/listingType'
import { timeAgo, formatExact } from '../../lib/time'

function contactedKey(userId: string) { return `10pet:contacted:${userId}` }
function hasContactedCase(userId: string, caseId: string): boolean {
  try { return (JSON.parse(localStorage.getItem(contactedKey(userId)) ?? '[]') as string[]).includes(caseId) }
  catch { return false }
}
function saveContactedCase(userId: string, caseId: string): void {
  try {
    const ids = JSON.parse(localStorage.getItem(contactedKey(userId)) ?? '[]') as string[]
    if (!ids.includes(caseId)) localStorage.setItem(contactedKey(userId), JSON.stringify([...ids, caseId]))
  } catch { /* noop */ }
}

const STATUS_LABEL: Record<CaseStatus, string> = {
  abierto: 'Abierto',
  en_rescate: 'En rescate',
  resuelto: 'Resuelto',
  inactivo: 'Inactivo',
  spam: 'Spam',
}

const STATUS_CLASS: Record<CaseStatus, string> = {
  abierto: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  en_rescate: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  resuelto: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  inactivo: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  spam: 'bg-red-100 dark:bg-red-900/40 text-red-500',
}

const URGENCY_LABEL: Record<number, string> = {
  1: 'Urgencia baja',
  2: 'Urgencia baja',
  3: 'Urgencia media',
  4: 'Urgencia alta',
  5: 'Urgencia critica',
}

const URGENCY_COLOR: Record<number, string> = {
  1: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  2: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  3: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  4: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  5: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

interface Props {
  caseId: string | null
  onClose: () => void
}

export default function CaseDetailSheet({ caseId, onClose }: Props) {
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null)
  const [contacted, setContacted] = useState(false)
  const [reported, setReported] = useState(false)
  const [showAddUpdate, setShowAddUpdate] = useState(false)
  const [addUpdateType, setAddUpdateType] = useState<CaseUpdateType>('comentario')
  const [addUpdateContent, setAddUpdateContent] = useState('')
  const [addUpdateHostName, setAddUpdateHostName] = useState('')
  const [addUpdateLoading, setAddUpdateLoading] = useState(false)
  const [vetAssistances, setVetAssistances] = useState<VetAssistanceItem[]>([])
  const [showVetForm, setShowVetForm] = useState(false)
  const [vetProcedure, setVetProcedure] = useState('')
  const [vetMedication, setVetMedication] = useState('')
  const [vetLoading, setVetLoading] = useState(false)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const navigate = useNavigate()

  useEffect(() => {
    if (!caseId) {
      setDetail(null)
      setWhatsappLink(null)
      setContacted(false)
      setReported(false)
      setShowAddUpdate(false)
      setAddUpdateContent('')
      setShowVetForm(false)
      setVetProcedure('')
      setVetMedication('')
      setShowResolutionModal(false)
      setShowEditModal(false)
      return
    }
    setContacted(currentUserId ? hasContactedCase(currentUserId, caseId) : false)
    setLoading(true)
    setVetAssistances([])
    getCaseById(caseId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
    getVetAssistances(caseId)
      .then(setVetAssistances)
      .catch(() => {})
  }, [caseId, currentUserId])

  if (!caseId) return null

  const handleHelp = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/cases' } })
      return
    }
    setShowContactModal(true)
  }

  const handleContactSuccess = (link: string | null) => {
    setShowContactModal(false)
    setContacted(true)
    setWhatsappLink(link)
    if (currentUserId && caseId) saveContactedCase(currentUserId, caseId)
    toast.success('Solicitud enviada correctamente.')
  }

  const handleReportSuccess = () => {
    setShowReportModal(false)
    setReported(true)
    toast.success('Reporte enviado. Lo revisaremos pronto.')
  }

  const handleAddUpdate = async () => {
    if (!caseId || !addUpdateContent.trim()) return
    setAddUpdateLoading(true)
    try {
      const newUpdate = await addCaseUpdate(
        caseId,
        addUpdateType,
        addUpdateContent.trim(),
        addUpdateHostName.trim(),
      )
      setDetail((prev) =>
        prev ? { ...prev, updates: [newUpdate, ...prev.updates] } : prev,
      )
      setAddUpdateContent('')
      setAddUpdateHostName('')
      setShowAddUpdate(false)
      toast.success('Novedad agregada.')
    } catch {
      toast.error('No se pudo agregar la novedad.')
    } finally {
      setAddUpdateLoading(false)
    }
  }

  const handleVetSubmit = async () => {
    if (!caseId) return
    if (!vetProcedure.trim() && !vetMedication.trim()) {
      toast.error('Completá al menos el procedimiento o la medicación.')
      return
    }
    setVetLoading(true)
    try {
      const item = await createVetAssistance(caseId, {
        procedure: vetProcedure.trim() || undefined,
        medication: vetMedication.trim() || undefined,
      })
      setVetAssistances((prev) => [item, ...prev])
      setVetProcedure('')
      setVetMedication('')
      setShowVetForm(false)
      toast.success('Atención registrada.')
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setVetLoading(false)
    }
  }

  const handleEdit = async (data: {
    animalType: string; description: string;
    urgencyLevel: number; phoneContact: string; locationText: string; referenceNote: string
  }) => {
    if (!caseId) return
    const updated = await updateCase(caseId, data)
    setDetail((prev) => prev ? { ...prev, ...updated } : prev)
    setShowEditModal(false)
    toast.success('Caso actualizado.')
  }

  const handleResolve = async (resolutionType: ResolutionType) => {
    if (!caseId) return
    try {
      const updated = await updateCase(caseId, { status: 'resuelto', resolutionType })
      setDetail((prev) => prev ? { ...prev, ...updated } : prev)
      setShowResolutionModal(false)
      toast.success('Caso marcado como resuelto.')
    } catch {
      toast.error('No se pudo actualizar. Intentá de nuevo.')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col md:max-w-lg md:left-auto md:right-4 md:bottom-4 md:rounded-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto md:hidden absolute left-1/2 -translate-x-1/2 top-2" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-base">
              {detail
                ? `${ANIMAL_EMOJI[detail.animalType]} ${ANIMAL_LABEL[detail.animalType]} · ${URGENCY_LABEL[detail.urgencyLevel] ?? `Urgencia ${detail.urgencyLevel}`}`
                : 'Detalle del caso'}
            </h2>
            {caseId && (
              <Link
                to={`/cases/${caseId}`}
                onClick={onClose}
                className="text-xs text-primary-600 dark:text-primary-300 hover:underline"
              >
                Ver caso completo →
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden flex-1 px-4 py-4 space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && !detail && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No se pudo cargar el caso.</p>
          )}

          {detail && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{ANIMAL_EMOJI[detail.animalType]}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{ANIMAL_LABEL[detail.animalType]}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ring-1 ${LISTING_TYPE[detail.listingType].chipClass}`}>
                      {LISTING_TYPE[detail.listingType].long}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[detail.status]}`}>
                      {STATUS_LABEL[detail.status]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLOR[detail.urgencyLevel] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      {URGENCY_LABEL[detail.urgencyLevel] ?? `Urgencia ${detail.urgencyLevel}`}
                    </span>
                  </div>
                  {detail.publisherName && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-[10px] font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                        {detail.publisherName[0].toUpperCase()}
                      </div>
                      <Link
                        to={`/users/${detail.userId}`}
                        onClick={onClose}
                        className="text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-primary-600 hover:underline truncate"
                      >
                        {detail.publisherName}
                      </Link>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0" title={formatExact(detail.createdAt)}>
                        · {timeAgo(detail.createdAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{detail.title}</h2>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(detail.publicCode)}
                  title="Copiar el codigo del caso"
                  className="font-mono text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600"
                >
                  #{detail.publicCode}
                </button>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{detail.description}</p>

              {detail.animalCondition && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Estado:</span> {CONDITION_LABEL[detail.animalCondition]}
                </p>
              )}
              {detail.seenAt && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Visto:</span> {timeAgo(detail.seenAt)}
                </p>
              )}

              {(detail.locationText || detail.referenceNote) && (
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="min-w-0">
                    {detail.locationText && <p>{detail.locationText}</p>}
                    {detail.referenceNote && (
                      <p className="text-gray-500 dark:text-gray-400">{detail.referenceNote}</p>
                    )}
                  </div>
                </div>
              )}

              {detail.images.length > 0 && (() => {
                const sorted = [...detail.images].sort((a, b) => a.position - b.position)
                const [hero, ...rest] = sorted
                return (
                  <div className="flex flex-col gap-2 -mx-4">
                    <img
                      src={hero.cloudinaryUrl}
                      alt="Foto del caso"
                      className="w-full h-52 object-cover"
                    />
                    {rest.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto px-4 pb-1">
                        {rest.map((img) => (
                          <img
                            key={img.id}
                            src={img.cloudinaryUrl}
                            alt="Foto del caso"
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              <CaseTimeline
                createdAt={detail.createdAt}
                status={detail.status}
                resolutionType={detail.resolutionType}
                updates={detail.updates}
                assistances={vetAssistances}
                isOwner={isAuthenticated && detail.userId === currentUserId}
                isAuthenticated={isAuthenticated}
                showAddUpdate={showAddUpdate}
                addUpdateType={addUpdateType}
                addUpdateContent={addUpdateContent}
                addUpdateHostName={addUpdateHostName}
                addUpdateLoading={addUpdateLoading}
                onToggleForm={() => setShowAddUpdate((v) => !v)}
                onTypeChange={setAddUpdateType}
                onContentChange={setAddUpdateContent}
                onHostNameChange={setAddUpdateHostName}
                onSubmit={handleAddUpdate}
                showVetForm={showVetForm}
                vetProcedure={vetProcedure}
                vetMedication={vetMedication}
                vetLoading={vetLoading}
                onToggleVetForm={() => setShowVetForm((v) => !v)}
                onVetProcedureChange={setVetProcedure}
                onVetMedicationChange={setVetMedication}
                onVetSubmit={handleVetSubmit}
              />

              {(detail.volunteers?.length ?? 0) > 0 && (
                <VolunteersSection volunteers={detail.volunteers!} onClose={onClose} />
              )}

              {isAuthenticated && detail.userId !== currentUserId && (
                <div className="flex justify-end">
                  {reported ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">Reporte enviado</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors underline"
                    >
                      Reportar
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {detail && isAuthenticated && detail.userId === currentUserId &&
          (detail.status === 'abierto' || detail.status === 'en_rescate') && (
          <div className="px-4 pb-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex-1 border border-gray-300 dark:border-gray-600 hover:border-gray-400 text-gray-700 dark:text-gray-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setShowResolutionModal(true)}
              className="flex-1 border border-gray-300 dark:border-gray-600 hover:border-gray-400 text-gray-700 dark:text-gray-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              Marcar como resuelto
            </button>
          </div>
        )}

        {detail && detail.status === 'abierto' && detail.userId !== currentUserId && (
          <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
            {contacted && whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contactar por WhatsApp
              </a>
            )}
            {contacted && !whatsappLink && (
              <p className="text-center text-sm text-green-600 dark:text-green-300 font-medium py-2">
                Solicitud enviada. El reportador te contactará pronto.
              </p>
            )}
            {!contacted && (
              <>
                <button
                  type="button"
                  onClick={handleHelp}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Yo ayudo
                </button>
                {!isAuthenticated && (
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400">Necesitas estar registrado</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showContactModal && caseId && (
        <ContactModal
          caseId={caseId}
          onClose={() => setShowContactModal(false)}
          onSuccess={handleContactSuccess}
        />
      )}

      {showReportModal && caseId && (
        <ReportModal
          caseId={caseId}
          onClose={() => setShowReportModal(false)}
          onSuccess={handleReportSuccess}
        />
      )}

      {showResolutionModal && (
        <ResolutionModal
          onClose={() => setShowResolutionModal(false)}
          onConfirm={handleResolve}
        />
      )}

      {showEditModal && detail && (
        <EditModal
          initial={{
            animalType: detail.animalType,
            description: detail.description,
            urgencyLevel: detail.urgencyLevel,
            phoneContact: detail.phoneContact ?? '',
            locationText: detail.locationText ?? '',
            referenceNote: detail.referenceNote ?? '',
          }}
          onClose={() => setShowEditModal(false)}
          onSave={handleEdit}
        />
      )}
    </>
  )
}

const ANIMAL_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'perro', label: 'Perro', emoji: '🐕' },
  { value: 'gato', label: 'Gato', emoji: '🐈' },
  { value: 'caballo', label: 'Caballo', emoji: '🐴' },
  { value: 'vaca', label: 'Vaca', emoji: '🐄' },
  { value: 'otro', label: 'Otro', emoji: '🐾' },
]

const URGENCY_LABELS_EDIT: Record<number, string> = {
  1: 'Muy baja',
  2: 'Baja',
  3: 'Moderada',
  4: 'Alta',
  5: 'Urgente — riesgo de vida',
}

export interface EditModalProps {
  initial: {
    animalType: string
    description: string
    urgencyLevel: number
    phoneContact: string
    locationText: string
    referenceNote: string
  }
  onClose: () => void
  onSave: (data: {
    animalType: string; description: string;
    urgencyLevel: number; phoneContact: string; locationText: string; referenceNote: string
  }) => Promise<void>
}

export function EditModal({ initial, onClose, onSave }: EditModalProps) {
  const [animalType, setAnimalType] = useState(initial.animalType)
  const [description, setDescription] = useState(initial.description)
  const [urgencyLevel, setUrgencyLevel] = useState(initial.urgencyLevel)
  const [phoneContact, setPhoneContact] = useState(initial.phoneContact)
  const [locationText, setLocationText] = useState(initial.locationText)
  const [referenceNote, setReferenceNote] = useState(initial.referenceNote)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (description.trim().length < 10) {
      setError('La descripción debe tener al menos 10 caracteres.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onSave({ animalType, description: description.trim(), urgencyLevel, phoneContact: phoneContact.trim(), locationText: locationText.trim(), referenceNote: referenceNote.trim() })
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} aria-hidden="true" />
      <div className="fixed z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Editar caso</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Tipo de animal</span>
            <div className="flex gap-2">
              {ANIMAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnimalType(opt.value)}
                  className={[
                    'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                    animalType === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
                  ].join(' ')}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-base md:text-sm placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Urgencia: <span className="text-primary-600 dark:text-primary-300">{urgencyLevel}/5 — {URGENCY_LABELS_EDIT[urgencyLevel]}</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={urgencyLevel}
              onChange={(e) => setUrgencyLevel(parseInt(e.target.value))}
              className="w-full accent-primary-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Teléfono de contacto</label>
            <input
              type="tel"
              value={phoneContact}
              onChange={(e) => setPhoneContact(e.target.value)}
              placeholder="+54 9 11 1234-5678"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-base md:text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Dirección</label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Ej: San Martín 200, Capitán Sarmiento"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-base md:text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Referencia</label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="Ej: frente al kiosco, a media cuadra de la plaza"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-base md:text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </>
  )
}

const RESOLUTION_OPTIONS: { value: ResolutionType; label: string }[] = [
  { value: 'adoptado',     label: 'Adoptado' },
  { value: 'en_transito',  label: 'En tránsito' },
  { value: 'zoonosis',     label: 'Centro de zoonosis' },
  { value: 'derivado_ong', label: 'Derivado a ONG' },
  { value: 'fallecio',     label: 'Falleció' },
  { value: 'sin_paradero', label: 'Sin paradero' },
  { value: 'otro',         label: 'Otro' },
]

export function ResolutionModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (r: ResolutionType) => void
}) {
  const [selected, setSelected] = useState<ResolutionType | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setLoading(true)
    await onConfirm(selected)
    setLoading(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} aria-hidden="true" />
      <div className="fixed z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Como se resolvio?</h3>
        <div className="flex flex-col gap-2">
          {RESOLUTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={[
                'w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                selected === opt.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || loading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </>
  )
}

function VolunteersSection({ volunteers, onClose }: { volunteers: CaseVolunteer[]; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Voluntarios ({volunteers.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {volunteers.map((v) => (
          <Link
            key={v.userId}
            to={`/users/${v.userId}`}
            onClick={onClose}
            className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
          >
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{v.userName ?? 'Voluntario'}</span>
            {v.status === 'completed' && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">completado</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
