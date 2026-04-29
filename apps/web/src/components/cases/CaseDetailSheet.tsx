import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCaseById, addCaseUpdate, updateCase, type ResolutionType } from '../../services/cases.service'
import { getVetAssistances, createVetAssistance } from '../../services/vet-assistances.service'
import type { VetAssistanceItem } from '../../services/vet-assistances.service'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../stores/toastStore'
import type { CaseDetail, AnimalType, CaseStatus, CaseUpdateType, CaseUpdateItem } from '../../types/case'
import { ContactModal } from './ContactModal'
import { ReportModal } from './ReportModal'

const ANIMAL_LABEL: Record<AnimalType, string> = { perro: 'Perro', gato: 'Gato', otro: 'Otro' }
const ANIMAL_EMOJI: Record<AnimalType, string> = { perro: '🐕', gato: '🐈', otro: '🐾' }

const STATUS_LABEL: Record<CaseStatus, string> = {
  abierto: 'Abierto',
  en_rescate: 'En rescate',
  resuelto: 'Resuelto',
  inactivo: 'Inactivo',
  spam: 'Spam',
}

const STATUS_CLASS: Record<CaseStatus, string> = {
  abierto: 'bg-green-100 text-green-700',
  en_rescate: 'bg-blue-100 text-blue-700',
  resuelto: 'bg-gray-100 text-gray-500',
  inactivo: 'bg-gray-100 text-gray-400',
  spam: 'bg-red-100 text-red-500',
}

const URGENCY_LABEL: Record<number, string> = {
  1: 'Urgencia baja',
  2: 'Urgencia baja',
  3: 'Urgencia media',
  4: 'Urgencia alta',
  5: 'Urgencia critica',
}

const URGENCY_COLOR: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'hace unos minutos'
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d}d`
  return `hace ${Math.floor(d / 30)} meses`
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
    setLoading(true)
    setVetAssistances([])
    getCaseById(caseId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
    getVetAssistances(caseId)
      .then(setVetAssistances)
      .catch(() => {})
  }, [caseId])

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
      const newUpdate = await addCaseUpdate(caseId, addUpdateType, addUpdateContent.trim())
      setDetail((prev) =>
        prev ? { ...prev, updates: [newUpdate, ...prev.updates] } : prev,
      )
      setAddUpdateContent('')
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
    animalType: string; description: string; condition: string;
    urgencyLevel: number; phoneContact: string; locationText: string
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

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col md:max-w-lg md:left-auto md:right-4 md:bottom-4 md:rounded-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto md:hidden absolute left-1/2 -translate-x-1/2 top-2" />
          <h2 className="font-semibold text-gray-800 text-base">Detalle del caso</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
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
            <p className="text-center text-gray-500 py-8 text-sm">No se pudo cargar el caso.</p>
          )}

          {detail && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{ANIMAL_EMOJI[detail.animalType]}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{ANIMAL_LABEL[detail.animalType]}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[detail.status]}`}>
                      {STATUS_LABEL[detail.status]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLOR[detail.urgencyLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                      {URGENCY_LABEL[detail.urgencyLevel] ?? `Urgencia ${detail.urgencyLevel}`}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed">{detail.description}</p>

              {detail.condition && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Condicion</p>
                  <p className="text-sm text-gray-700">{detail.condition}</p>
                </div>
              )}

              {detail.locationText && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {detail.locationText}
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
                updates={detail.updates}
                isOwner={isAuthenticated && detail.userId === currentUserId}
                showAddUpdate={showAddUpdate}
                addUpdateType={addUpdateType}
                addUpdateContent={addUpdateContent}
                addUpdateLoading={addUpdateLoading}
                onToggleForm={() => setShowAddUpdate((v) => !v)}
                onTypeChange={setAddUpdateType}
                onContentChange={setAddUpdateContent}
                onSubmit={handleAddUpdate}
              />

              <VetAssistancesSection
                assistances={vetAssistances}
                isAuthenticated={isAuthenticated}
                showForm={showVetForm}
                procedure={vetProcedure}
                medication={vetMedication}
                loading={vetLoading}
                onToggleForm={() => setShowVetForm((v) => !v)}
                onProcedureChange={setVetProcedure}
                onMedicationChange={setVetMedication}
                onSubmit={handleVetSubmit}
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{timeAgo(detail.createdAt)}</p>
                {isAuthenticated && detail.userId !== currentUserId && !reported && (
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
                  >
                    Reportar
                  </button>
                )}
                {reported && (
                  <span className="text-xs text-gray-400">Reporte enviado</span>
                )}
              </div>
            </>
          )}
        </div>

        {detail && isAuthenticated && detail.userId === currentUserId &&
          (detail.status === 'abierto' || detail.status === 'en_rescate') && (
          <div className="px-4 pb-2 pt-3 border-t border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setShowResolutionModal(true)}
              className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              Marcar como resuelto
            </button>
          </div>
        )}

        {detail && detail.status === 'abierto' && detail.userId !== currentUserId && (
          <div className="px-4 pb-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
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
              <p className="text-center text-sm text-green-600 font-medium py-2">
                Solicitud enviada. El reportador te contactara pronto.
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
                  <p className="text-center text-xs text-gray-400">Necesitas estar registrado</p>
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
            condition: detail.condition ?? '',
            urgencyLevel: detail.urgencyLevel,
            phoneContact: detail.phoneContact ?? '',
            locationText: detail.locationText ?? '',
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
  { value: 'otro', label: 'Otro', emoji: '🐾' },
]

const URGENCY_LABELS_EDIT: Record<number, string> = {
  1: 'Muy baja',
  2: 'Baja',
  3: 'Moderada',
  4: 'Alta',
  5: 'Urgente — riesgo de vida',
}

interface EditModalProps {
  initial: {
    animalType: string
    description: string
    condition: string
    urgencyLevel: number
    phoneContact: string
    locationText: string
  }
  onClose: () => void
  onSave: (data: {
    animalType: string; description: string; condition: string;
    urgencyLevel: number; phoneContact: string; locationText: string
  }) => Promise<void>
}

function EditModal({ initial, onClose, onSave }: EditModalProps) {
  const [animalType, setAnimalType] = useState(initial.animalType)
  const [description, setDescription] = useState(initial.description)
  const [condition, setCondition] = useState(initial.condition)
  const [urgencyLevel, setUrgencyLevel] = useState(initial.urgencyLevel)
  const [phoneContact, setPhoneContact] = useState(initial.phoneContact)
  const [locationText, setLocationText] = useState(initial.locationText)
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
      await onSave({ animalType, description: description.trim(), condition: condition.trim(), urgencyLevel, phoneContact: phoneContact.trim(), locationText: locationText.trim() })
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} aria-hidden="true" />
      <div className="fixed z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-base">Editar caso</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Tipo de animal</span>
            <div className="flex gap-2">
              {ANIMAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnimalType(opt.value)}
                  className={[
                    'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                    animalType === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                  ].join(' ')}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base md:text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Condición</label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="Ej: herida en pata, con collar"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base md:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Urgencia: <span className="text-primary-600">{urgencyLevel}/5 — {URGENCY_LABELS_EDIT[urgencyLevel]}</span>
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
            <label className="text-sm font-medium text-gray-700">Teléfono de contacto</label>
            <input
              type="tel"
              value={phoneContact}
              onChange={(e) => setPhoneContact(e.target.value)}
              placeholder="+54 9 11 1234-5678"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base md:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Referencia de ubicación</label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Ej: San Martín 200, Capitán Sarmiento"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base md:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
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
  { value: 'en_transito',  label: 'En transito' },
  { value: 'zoonosis',     label: 'Centro de zoonosis' },
  { value: 'derivado_ong', label: 'Derivado a ONG' },
  { value: 'fallecio',     label: 'Fallecio' },
  { value: 'sin_paradero', label: 'Sin paradero' },
  { value: 'otro',         label: 'Otro' },
]

function ResolutionModal({
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
      <div className="fixed z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-gray-900 text-base">Como se resolvio?</h3>
        <div className="flex flex-col gap-2">
          {RESOLUTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={[
                'w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                selected === opt.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300',
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
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
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

const UPDATE_META: Record<CaseUpdateType, { label: string; color: string; icon: string }> = {
  avistamiento:  { label: 'Avistamiento',         color: 'bg-blue-50 border-blue-200 text-blue-700',   icon: '👁' },
  medicacion:    { label: 'Medicacion aplicada',   color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '💊' },
  veterinario:   { label: 'Atencion veterinaria',  color: 'bg-teal-50 border-teal-200 text-teal-700',   icon: '🩺' },
  comentario:    { label: 'Novedad',               color: 'bg-gray-50 border-gray-200 text-gray-700',   icon: '📝' },
  status_change: { label: 'Cambio de estado',      color: 'bg-amber-50 border-amber-200 text-amber-700',icon: '🔄' },
  comment:       { label: 'Comentario',            color: 'bg-gray-50 border-gray-200 text-gray-700',   icon: '💬' },
  photo_added:   { label: 'Foto agregada',         color: 'bg-green-50 border-green-200 text-green-700',icon: '📷' },
  reactivated:   { label: 'Reactivado',            color: 'bg-orange-50 border-orange-200 text-orange-700', icon: '🔔' },
}

const OWNER_UPDATE_TYPES: CaseUpdateType[] = ['avistamiento', 'medicacion', 'veterinario', 'comentario']

const OWNER_TYPE_LABELS: Record<string, string> = {
  avistamiento: 'Lo vi en otro lugar',
  medicacion:   'Medicacion aplicada',
  veterinario:  'Atencion veterinaria',
  comentario:   'Otra novedad',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

interface CaseTimelineProps {
  updates: CaseUpdateItem[]
  isOwner: boolean
  showAddUpdate: boolean
  addUpdateType: CaseUpdateType
  addUpdateContent: string
  addUpdateLoading: boolean
  onToggleForm: () => void
  onTypeChange: (t: CaseUpdateType) => void
  onContentChange: (v: string) => void
  onSubmit: () => void
}

function CaseTimeline({
  updates, isOwner, showAddUpdate, addUpdateType, addUpdateContent, addUpdateLoading,
  onToggleForm, onTypeChange, onContentChange, onSubmit,
}: CaseTimelineProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Historial del caso
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={onToggleForm}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            {showAddUpdate ? 'Cancelar' : '+ Agregar novedad'}
          </button>
        )}
      </div>

      {showAddUpdate && isOwner && (
        <div className="border border-gray-200 rounded-xl p-3 flex flex-col gap-3 bg-gray-50">
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
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400',
                ].join(' ')}
              >
                {UPDATE_META[t].icon} {OWNER_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            placeholder={
              addUpdateType === 'avistamiento' ? 'Dónde fue visto, cuándo, en qué condición...' :
              addUpdateType === 'medicacion'   ? 'Qué medicación, dosis, quién la aplicó...' :
              addUpdateType === 'veterinario'  ? 'Nombre del vet, diagnóstico, tratamiento...' :
              'Contá la novedad...'
            }
            value={addUpdateContent}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

      {updates.length === 0 && !showAddUpdate && (
        <p className="text-xs text-gray-400 text-center py-2">
          Sin novedades todavia.{isOwner ? ' Usá "+ Agregar novedad" para registrar actualizaciones.' : ''}
        </p>
      )}

      {updates.map((u) => {
        const meta = UPDATE_META[u.updateType] ?? UPDATE_META.comentario
        return (
          <div key={u.id} className={`border rounded-xl px-3 py-2.5 ${meta.color}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold flex items-center gap-1">
                <span>{meta.icon}</span> {meta.label}
              </span>
              <span className="text-xs opacity-60 flex-shrink-0">{formatDate(u.createdAt)}</span>
            </div>
            {u.content && <p className="text-sm leading-snug">{u.content}</p>}
          </div>
        )
      })}
    </div>
  )
}

interface VetAssistancesSectionProps {
  assistances: VetAssistanceItem[]
  isAuthenticated: boolean
  showForm: boolean
  procedure: string
  medication: string
  loading: boolean
  onToggleForm: () => void
  onProcedureChange: (v: string) => void
  onMedicationChange: (v: string) => void
  onSubmit: () => void
}

function VetAssistancesSection({
  assistances, isAuthenticated, showForm, procedure, medication, loading,
  onToggleForm, onProcedureChange, onMedicationChange, onSubmit,
}: VetAssistancesSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Atencion veterinaria
        </p>
        {isAuthenticated && (
          <button
            type="button"
            onClick={onToggleForm}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            {showForm ? 'Cancelar' : '+ Registrar atencion'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="border border-teal-200 rounded-xl p-3 flex flex-col gap-3 bg-teal-50">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Procedimiento</label>
            <textarea
              rows={2}
              placeholder="Examen, diagnóstico, tratamiento aplicado..."
              value={procedure}
              onChange={(e) => onProcedureChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Medicacion</label>
            <textarea
              rows={2}
              placeholder="Nombre, dosis, frecuencia..."
              value={medication}
              onChange={(e) => onMedicationChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-400">Completá al menos uno de los dos campos.</p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || (!procedure.trim() && !medication.trim())}
            className="self-end px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      )}

      {assistances.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 text-center py-1">Sin atenciones registradas.</p>
      )}

      {assistances.map((a) => (
        <div key={a.id} className="border border-teal-100 rounded-xl px-3 py-2.5 bg-white">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-teal-700">{a.userName ?? 'Usuario'}</span>
              {a.isVet && (
                <span className="inline-flex items-center px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-medium rounded-full border border-teal-200">
                  Profesional verificado
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(a.createdAt)}</span>
          </div>
          {a.procedure && (
            <p className="text-xs text-gray-700 mb-0.5">
              <span className="font-medium text-gray-500">Procedimiento: </span>{a.procedure}
            </p>
          )}
          {a.medication && (
            <p className="text-xs text-gray-700">
              <span className="font-medium text-gray-500">Medicacion: </span>{a.medication}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
