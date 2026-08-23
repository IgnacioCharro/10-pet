import { api } from '../lib/api'

export interface ContactItem {
  id: string
  caseId: string
  initiatorId: string
  initiatorName: string | null
  responderId: string
  responderName: string | null
  status: 'pending' | 'active' | 'completed' | 'rejected'
  contactMethod: string
  message: string | null
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
  caseAnimalType: string | null
  caseLocationText: string | null
  // Mensajes del otro que todavia no vi en ese hilo. Solo viene en el listado.
  unreadCount?: number
}

// El detalle agrega canWrite, que lo decide el servidor: la pantalla no vuelve
// a razonar en que estados se puede escribir.
export interface ContactDetail extends ContactItem {
  canWrite: boolean
}

export interface ContactMessage {
  id: string
  contactId: string
  senderId: string
  body: string
  createdAt: string
}

export interface CreateContactResult {
  contact: ContactItem
  whatsappLink: string | null
}

export async function createContact(
  caseId: string,
  message?: string,
): Promise<CreateContactResult> {
  const res = await api.post<CreateContactResult>('/contacts', { caseId, message })
  return res.data
}

export async function listContacts(
  role: 'initiator' | 'responder' | 'all' = 'all',
  status?: string,
): Promise<ContactItem[]> {
  const res = await api.get<{ contacts: ContactItem[] }>('/contacts', {
    params: { role, status },
  })
  return res.data.contacts ?? []
}

/**
 * Las conversaciones que comparto con otra persona, para su perfil publico.
 * El backend ya limita el resultado a mis propios contactos: `withUserId` dice
 * quien esta del otro lado, no abre los hilos ajenos.
 */
export async function listContactsWithUser(userId: string): Promise<ContactItem[]> {
  const res = await api.get<{ contacts: ContactItem[] }>('/contacts', {
    params: { withUserId: userId, limit: 50 },
  })
  return res.data.contacts ?? []
}

/** Mis contactos en un caso puntual, para saber si ya hay chat o hay que pedirlo. */
export async function listCaseContacts(caseId: string): Promise<ContactItem[]> {
  const res = await api.get<{ contacts: ContactItem[] }>('/contacts', {
    params: { caseId, limit: 50 },
  })
  return res.data.contacts ?? []
}

export async function updateContactStatus(
  contactId: string,
  status: 'active' | 'rejected' | 'completed',
): Promise<ContactItem> {
  const res = await api.patch<ContactItem>(`/contacts/${contactId}`, { status })
  return res.data
}

export async function getPendingContactsCount(): Promise<number> {
  const res = await api.get<{ count: number }>('/contacts/pending-count')
  return res.data.count
}

export async function getContactUpdatesCount(since?: string): Promise<number> {
  const res = await api.get<{ count: number }>('/contacts/unread-count', {
    params: since ? { since } : {},
  })
  return res.data.count
}

// Cuenta aparte de la de arriba: aquella son cambios de estado de las
// solicitudes que envie; esta son mensajes que me escribieron. No lleva 'since'
// porque la marca de lectura de cada hilo la guarda el servidor.
export async function getUnreadMessagesCount(): Promise<number> {
  const res = await api.get<{ count: number }>('/contacts/unread-messages-count')
  return res.data.count
}

export async function markThreadRead(contactId: string): Promise<void> {
  await api.post(`/contacts/${contactId}/read`)
}

export async function getContact(contactId: string): Promise<ContactDetail> {
  const res = await api.get<ContactDetail>(`/contacts/${contactId}`)
  return res.data
}

export interface MessagesPage {
  messages: ContactMessage[]
  total: number
  canWrite: boolean
}

// page 1 son los mas nuevos; el servidor los devuelve ya ordenados del mas
// viejo al mas nuevo dentro de la pagina.
export async function listMessages(contactId: string, page = 1): Promise<MessagesPage> {
  const res = await api.get<MessagesPage>(`/contacts/${contactId}/messages`, {
    params: { page },
  })
  return res.data
}

export async function sendMessage(contactId: string, body: string): Promise<ContactMessage> {
  const res = await api.post<ContactMessage>(`/contacts/${contactId}/messages`, { body })
  return res.data
}
