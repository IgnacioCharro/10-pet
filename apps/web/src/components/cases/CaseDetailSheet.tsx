import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCaseById } from '../../services/cases.service'
import { useAuthStore } from '../../stores/authStore'
import type { CaseDetail, AnimalType, CaseStatus } from '../../types/case'

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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()

  useEffect(() => {
    if (!caseId) {
      setDetail(null)
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
    // TODO Semana 6: conectar con POST /contacts/:caseId
    alert('Funcionalidad de contacto disponible pronto.')
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

              <p className="text-xs text-gray-400">{timeAgo(detail.createdAt)}</p>
            </>
          )}
        </div>

        {detail && detail.status === 'abierto' && (
          <div className="px-4 pb-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleHelp}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Yo ayudo
            </button>
            {!isAuthenticated && (
              <p className="text-center text-xs text-gray-400 mt-2">Necesitas estar registrado</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
