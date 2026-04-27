import { useEffect, useState } from 'react'
import { getCaseById } from '../../services/cases.service'
import type { CaseDetail, AnimalType } from '../../types/case'

const ANIMAL_EMOJI: Record<AnimalType, string> = { perro: '🐕', gato: '🐈', otro: '🐾' }
const ANIMAL_LABEL: Record<AnimalType, string> = { perro: 'Perro', gato: 'Gato', otro: 'Otro' }

const URGENCY: Record<number, { label: string; cls: string }> = {
  1: { label: 'Urgencia baja',    cls: 'bg-green-100 text-green-700' },
  2: { label: 'Urgencia baja',    cls: 'bg-green-100 text-green-700' },
  3: { label: 'Urgencia media',   cls: 'bg-amber-100 text-amber-700' },
  4: { label: 'Urgencia alta',    cls: 'bg-orange-100 text-orange-700' },
  5: { label: 'Urgencia critica', cls: 'bg-red-100 text-red-700' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

interface Props {
  caseId: string | null
  onClose: () => void
  onViewFull: () => void
}

export default function CasePopup({ caseId, onClose, onViewFull }: Props) {
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!caseId) { setDetail(null); return }
    setLoading(true)
    getCaseById(caseId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [caseId])

  if (!caseId) return null

  const heroImage = detail?.images.slice().sort((a, b) => a.position - b.position)[0]
  const urg = detail ? (URGENCY[detail.urgencyLevel] ?? URGENCY[3]) : null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />

      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Hero / loading area */}
        {loading && (
          <div className="h-40 flex items-center justify-center bg-gray-50">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && heroImage && (
          <img src={heroImage.cloudinaryUrl} alt="Foto del caso" className="w-full h-40 object-cover" />
        )}
        {!loading && !heroImage && detail && (
          <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-5xl">
            {ANIMAL_EMOJI[detail.animalType]}
          </div>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {detail && (
          <div className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-900">
                {ANIMAL_EMOJI[detail.animalType]} {ANIMAL_LABEL[detail.animalType]}
              </span>
              {urg && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${urg.cls}`}>
                  {urg.label}
                </span>
              )}
            </div>

            {detail.locationText && (
              <div className="flex items-start gap-1.5 text-sm text-gray-600">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="line-clamp-1">{detail.locationText}</span>
              </div>
            )}

            <p className="text-sm text-gray-700 line-clamp-2 leading-snug">{detail.description}</p>

            <p className="text-xs text-gray-400">{timeAgo(detail.createdAt)}</p>

            <button
              type="button"
              onClick={onViewFull}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors mt-1"
            >
              Ver completo
            </button>
          </div>
        )}
      </div>
    </>
  )
}
