import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCaseById, addCaseUpdate, updateCase, type ResolutionType } from '../services/cases.service'
import { getVetAssistances, createVetAssistance } from '../services/vet-assistances.service'
import type { VetAssistanceItem } from '../services/vet-assistances.service'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import type { CaseDetail, AnimalType, CaseStatus, CaseUpdateType } from '../types/case'
import { ContactModal } from '../components/cases/ContactModal'
import { ReportModal } from '../components/cases/ReportModal'
import {
  CaseTimeline,
  VetAssistancesSection,
  EditModal,
  ResolutionModal,
} from '../components/cases/CaseDetailSheet'

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'hace unos minutos'
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d}d`
  return `hace ${Math.floor(d / 30)} meses`
}

export default function CasePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUserId = useAuthStore((s) => s.user?.id)

  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
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

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setContacted(currentUserId ? hasContactedCase(currentUserId, id) : false)
    setLoading(true)
    setNotFound(false)
    getCaseById(id)
      .then(setDetail)
      .catch(() => { setDetail(null); setNotFound(true) })
      .finally(() => setLoading(false))
    getVetAssistances(id)
      .then(setVetAssistances)
      .catch(() => {})
  }, [id, currentUserId])

  const handleHelp = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/cases/${id}` } })
      return
    }
    setShowContactModal(true)
  }

  const handleContactSuccess = (link: string | null) => {
    setShowContactModal(false)
    setContacted(true)
    setWhatsappLink(link)
    if (currentUserId && id) saveContactedCase(currentUserId, id)
    toast.success('Solicitud enviada correctamente.')
  }

  const handleReportSuccess = () => {
    setShowReportModal(false)
    setReported(true)
    toast.success('Reporte enviado. Lo revisaremos pronto.')
  }

  const handleAddUpdate = async () => {
    if (!id || !addUpdateContent.trim()) return
    setAddUpdateLoading(true)
    try {
      const newUpdate = await addCaseUpdate(id, addUpdateType, addUpdateContent.trim())
      setDetail((prev) => prev ? { ...prev, updates: [newUpdate, ...prev.updates] } : prev)
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
    if (!id) return
    if (!vetProcedure.trim() && !vetMedication.trim()) {
      toast.error('Completa al menos el procedimiento o la medicacion.')
      return
    }
    setVetLoading(true)
    try {
      const item = await createVetAssistance(id, {
        procedure: vetProcedure.trim() || undefined,
        medication: vetMedication.trim() || undefined,
      })
      setVetAssistances((prev) => [item, ...prev])
      setVetProcedure('')
      setVetMedication('')
      setShowVetForm(false)
      toast.success('Atencion registrada.')
    } catch {
      toast.error('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setVetLoading(false)
    }
  }

  const handleEdit = async (data: {
    animalType: string; description: string; condition: string;
    urgencyLevel: number; phoneContact: string; locationText: string
  }) => {
    if (!id) return
    const updated = await updateCase(id, data)
    setDetail((prev) => prev ? { ...prev, ...updated } : prev)
    setShowEditModal(false)
    toast.success('Caso actualizado.')
  }

  const handleResolve = async (resolutionType: ResolutionType) => {
    if (!id) return
    try {
      const updated = await updateCase(id, { status: 'resuelto', resolutionType })
      setDetail((prev) => prev ? { ...prev, ...updated } : prev)
      setShowResolutionModal(false)
      toast.success('Caso marcado como resuelto.')
    } catch {
      toast.error('No se pudo actualizar. Intenta de nuevo.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-sm mb-4">Este caso no existe o fue eliminado.</p>
        <Link to="/cases" className="text-primary-600 hover:underline text-sm">
          Ver casos en el mapa
        </Link>
      </div>
    )
  }

  if (!detail) return null

  const isOwner = isAuthenticated && detail.userId === currentUserId
  const canHelp = detail.status === 'abierto' && !isOwner
  const sorted = [...detail.images].sort((a, b) => a.position - b.position)
  const [hero, ...restImages] = sorted

  return (
    <>
      <div className="max-w-2xl mx-auto pb-28">
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
        </div>

        {hero && (
          <img
            src={hero.cloudinaryUrl}
            alt="Foto del caso"
            className="w-full h-64 md:h-80 object-cover"
          />
        )}

        <div className="px-4 py-5 space-y-5">
          <div className="flex items-start gap-3">
            <span className="text-5xl leading-none">{ANIMAL_EMOJI[detail.animalType]}</span>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-gray-900 text-xl">{ANIMAL_LABEL[detail.animalType]}</h1>
              <div className="flex gap-2 mt-1.5 flex-wrap">
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

          {restImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {restImages.map((img) => (
                <img
                  key={img.id}
                  src={img.cloudinaryUrl}
                  alt="Foto del caso"
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                />
              ))}
            </div>
          )}

          <CaseTimeline
            updates={detail.updates}
            isOwner={isOwner}
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

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">{timeAgo(detail.createdAt)}</p>
            {isAuthenticated && !isOwner && !reported && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
              >
                Reportar
              </button>
            )}
            {reported && <span className="text-xs text-gray-400">Reporte enviado</span>}
          </div>
        </div>
      </div>

      {isOwner && (detail.status === 'abierto' || detail.status === 'en_rescate') && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-20">
          <div className="max-w-2xl mx-auto flex gap-2">
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
        </div>
      )}

      {canHelp && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-20">
          <div className="max-w-2xl mx-auto flex flex-col gap-2">
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
        </div>
      )}

      {showContactModal && id && (
        <ContactModal
          caseId={id}
          onClose={() => setShowContactModal(false)}
          onSuccess={handleContactSuccess}
        />
      )}

      {showReportModal && id && (
        <ReportModal
          caseId={id}
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

      {showEditModal && (
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
