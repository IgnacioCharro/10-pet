import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import { useNotificationsStore } from '../stores/notificationsStore'
import {
  getContact,
  listMessages,
  markThreadRead,
  sendMessage,
  type ContactDetail,
  type ContactMessage,
} from '../services/contacts.service'
import { toast } from '../stores/toastStore'
import Button from '../components/ui/Button'
import { displayLocation } from '../lib/location'

const ANIMAL_LABELS: Record<string, string> = {
  perro: 'Perro',
  gato: 'Gato',
  caballo: 'Caballo',
  vaca: 'Vaca',
  otro: 'Animal',
}

// El mismo tope que el schema Zod del API y el CHECK de contact_messages.
const MAX_LENGTH = 2000

function caseSummary(contact: ContactDetail): string {
  const animal = ANIMAL_LABELS[contact.caseAnimalType ?? ''] ?? 'Caso'
  const location = displayLocation(contact.caseLocationText)
  return location ? `${animal} · ${location}` : animal
}

// Hora sola si es de hoy; si no, dia y hora. Un hilo de rescate se lee en el
// dia, y repetir la fecha en cada globo es ruido.
function messageTime(iso: string): string {
  const date = new Date(iso)
  const esHoy = date.toDateString() === new Date().toDateString()
  const hora = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  if (esHoy) return hora
  return `${date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} ${hora}`
}

// Por que no se puede escribir, dicho en la pantalla. El servidor manda el
// mismo veredicto en canWrite; esto solo lo explica.
function closedNotice(status: ContactDetail['status']): string {
  if (status === 'completed') {
    return 'La solicitud está completada. Podés leer lo que se dijeron, pero ya no se escriben mensajes nuevos.'
  }
  if (status === 'pending') {
    return 'La conversación se abre cuando se acepta la solicitud.'
  }
  return 'La solicitud fue rechazada: no hay conversación.'
}

export default function ContactThreadPage() {
  const { id } = useParams<{ id: string }>()
  const userId = useAuthStore((s) => s.user?.id)
  const clearUnreadMessages = useNotificationsStore((s) => s.clearUnreadMessages)

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState('')
  const [blocked, setBlocked] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [detail, firstPage] = await Promise.all([getContact(id), listMessages(id, 1)])
      setContact(detail)
      setMessages(firstPage.messages)
      setTotal(firstPage.total)
      setPage(1)
      setBlocked(null)
      // Marcar leido es lo que baja el globo rojo de la barra, y solo para quien
      // abrio el hilo: la marca es por persona.
      markThreadRead(id)
        .then(clearUnreadMessages)
        .catch(() => {})
    } catch (err) {
      const res = (err as AxiosError<{ error: { code: string; message: string } }>)?.response
      if (res?.status === 404) setBlocked('Esta solicitud no existe o ya no está disponible.')
      else if (res?.status === 403) setBlocked(res.data?.error?.message ?? 'No podés ver esta conversación.')
      else setBlocked('No se pudo cargar la conversación. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [id, clearUnreadMessages])

  useEffect(() => {
    load()
  }, [load])

  // Solo cuando llega la primera tanda: si esto corriera en cada cambio de
  // messages, cargar los viejos te devolveria de un salto al final.
  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [loading, scrollToBottom])

  const loadOlder = async () => {
    if (!id) return
    setLoadingOlder(true)
    try {
      const older = await listMessages(id, page + 1)
      setMessages((prev) => [...older.messages, ...prev])
      setTotal(older.total)
      setPage((p) => p + 1)
    } catch {
      toast.error('No se pudieron cargar los mensajes anteriores.')
    } finally {
      setLoadingOlder(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const texto = body.trim()
    if (!id || !texto || sending) return
    setSending(true)
    try {
      const nuevo = await sendMessage(id, texto)
      setMessages((prev) => [...prev, nuevo])
      setTotal((t) => t + 1)
      setBody('')
      requestAnimationFrame(scrollToBottom)
    } catch (err) {
      const res = (err as AxiosError<{ error: { code: string; message: string } }>)?.response
      if (res?.status === 403) {
        // Cambio de estado mientras la pantalla estaba abierta: se recarga para
        // que deje de ofrecer un compositor que ya no sirve.
        toast.error(res.data?.error?.message ?? 'Ya no podés escribir en esta conversación.')
        load()
      } else {
        toast.error('No se pudo enviar el mensaje. Intentá de nuevo.')
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (blocked || !contact) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{blocked ?? 'Conversación no disponible.'}</p>
        <Link
          to="/dashboard"
          className="text-primary-600 dark:text-primary-300 text-sm hover:underline mt-2 inline-block"
        >
          Volver a mis solicitudes
        </Link>
      </div>
    )
  }

  const soyElInitiator = contact.initiatorId === userId
  const otroId = soyElInitiator ? contact.responderId : contact.initiatorId
  const otroNombre = (soyElInitiator ? contact.responderName : contact.initiatorName) ?? 'La otra persona'
  const hayMasViejos = messages.length < total

  return (
    <main className="flex-1 flex flex-col px-4 pt-4 pb-4">
      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col gap-3">
        <header className="flex items-start gap-3">
          <Link
            to="/dashboard"
            aria-label="Volver a mis solicitudes"
            className="shrink-0 mt-0.5 p-1.5 -ml-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold leading-tight truncate">
              <Link to={`/users/${otroId}`} className="hover:underline">
                {otroNombre}
              </Link>
            </h1>
            <Link
              to={`/cases/${contact.caseId}`}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline truncate block"
            >
              {caseSummary(contact)}
            </Link>
          </div>
          <button
            type="button"
            onClick={load}
            aria-label="Actualizar la conversación"
            className="shrink-0 p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </header>

        {/* El aviso de que el telefono no hace falta: es la razon de ser de esta
            pantalla y conviene que se lea la primera vez. */}
        <p className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
          Se escriben acá dentro. Nadie ve el teléfono de nadie.
        </p>

        <div className="flex-1 flex flex-col gap-2 py-1">
          {hayMasViejos && (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" loading={loadingOlder} onClick={loadOlder}>
                Ver mensajes anteriores
              </Button>
            </div>
          )}

          {messages.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              {contact.canWrite
                ? 'Todavía no se escribieron. Escribí el primer mensaje.'
                : 'No se escribieron mensajes en esta solicitud.'}
            </p>
          ) : (
            messages.map((m) => {
              const mio = m.senderId === userId
              return (
                <div key={m.id} className={['flex', mio ? 'justify-end' : 'justify-start'].join(' ')}>
                  <div
                    className={[
                      'max-w-[80%] rounded-2xl px-3.5 py-2',
                      mio
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm',
                    ].join(' ')}
                  >
                    {/* whitespace-pre-wrap para respetar los saltos de linea que
                        escribio la persona; break-words para que una URL larga
                        no ensanche la pantalla. */}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={[
                        'text-[10px] mt-1 text-right',
                        mio ? 'text-primary-100' : 'text-gray-400 dark:text-gray-500',
                      ].join(' ')}
                    >
                      {messageTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {contact.canWrite ? (
          <form onSubmit={handleSend} className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 pt-2 pb-1 flex gap-2 items-end">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                // Enter envia, Shift+Enter hace salto de linea. En movil el
                // teclado manda su propio Enter con shiftKey en false, asi que
                // esto tambien envia desde el telefono.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
              placeholder="Escribí un mensaje..."
              rows={2}
              maxLength={MAX_LENGTH}
              aria-label="Mensaje"
              /* text-base y no text-sm: Safari en iOS hace zoom sobre cualquier
                 campo con letra menor a 16px y deja la pantalla corrida. */
              className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button type="submit" loading={sending} disabled={!body.trim()} className="mb-0.5">
              Enviar
            </Button>
          </form>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-center">
            {closedNotice(contact.status)}
          </p>
        )}
      </div>
    </main>
  )
}
