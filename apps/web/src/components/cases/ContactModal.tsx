import { useState } from 'react'
import { createContact } from '../../services/contacts.service'
import { AxiosError } from 'axios'

interface Props {
  caseId: string
  onClose: () => void
  onSuccess: (whatsappLink: string | null) => void
}

export function ContactModal({ caseId, onClose, onSuccess }: Props) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadySent, setAlreadySent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await createContact(caseId, message.trim() || undefined)
      onSuccess(result.whatsappLink)
    } catch (err) {
      const code = (err as AxiosError<{ error: { code: string; message: string } }>)
        ?.response?.data?.error?.code
      if (code === 'ALREADY_CONTACTED') {
        setError('Ya enviaste una solicitud para este caso.')
        setAlreadySent(true)
      } else {
        setError('No se pudo enviar la solicitud. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Ofrecer ayuda</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          El reportador recibirá tu solicitud y podrá compartirte su número de WhatsApp.
          Si la acepta, además van a poder escribirse acá dentro, sin dar el teléfono.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensaje opcional (ej: Puedo trasladar al animal...)"
            rows={3}
            maxLength={300}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || alreadySent}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
