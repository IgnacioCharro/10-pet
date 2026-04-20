import { useState } from 'react'
import { AxiosError } from 'axios'
import { createCaseReport, type ReportReason } from '../../services/cases.service'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'falso', label: 'Caso falso o engañoso' },
  { value: 'contenido_inapropiado', label: 'Contenido inapropiado' },
  { value: 'acoso', label: 'Acoso o abuso' },
  { value: 'otro', label: 'Otro motivo' },
]

interface Props {
  caseId: string
  onClose: () => void
  onSuccess: () => void
}

export function ReportModal({ caseId, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return
    setLoading(true)
    setError(null)
    try {
      await createCaseReport(caseId, reason, description.trim() || undefined)
      onSuccess()
    } catch (err) {
      const code = (err as AxiosError<{ error: { code: string } }>)?.response?.data?.error?.code
      if (code === 'ALREADY_REPORTED') {
        setError('Ya reportaste este caso recientemente.')
      } else if (code === 'OWN_CASE') {
        setError('No podés reportar tu propio caso.')
      } else {
        setError('No se pudo enviar el reporte. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open title="Reportar caso" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Motivo</label>
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-primary-600"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{r.label}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Descripcion <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            maxLength={1000}
            placeholder="Contanos mas sobre el problema..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={!reason}
            loading={loading}
          >
            Enviar reporte
          </Button>
        </div>
      </form>
    </Modal>
  )
}
