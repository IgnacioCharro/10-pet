import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCaseById } from '../../services/cases.service'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../stores/toastStore'
import type { CaseDetail, AnimalType, CaseStatus } from '../../types/case'
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const navigate = useNavigate()

  useEffect(() => {
    if (!caseId) {
      setDetail(null)
      setWhatsappLink(null)
      setContacted(false)
      setReported(false)
      return
    }
    setLoading(true)
    getCaseById(caseId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
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

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
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

              {detail.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[...detail.images]
                    .sort((a, b) => a.position - b.position)
                    .map((img) => (
                      <img
                        key={img.id}
                        src={img.cloudinaryUrl}
                        alt="Foto del caso"
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    ))}
                </div>
              )}

              {detail.updates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Novedades</p>
                  {detail.updates.slice(0, 3).map((u) => (
                    <div key={u.id} className="bg-blue-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-blue-600 font-medium mb-0.5">{u.updateType.replace('_', ' ')}</p>
                      {u.content && <p className="text-sm text-gray-700">{u.content}</p>}
                    </div>
                  ))}
                </div>
              )}

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

        {detail && detail.status === 'abierto' && (
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
    </>
  )
}
