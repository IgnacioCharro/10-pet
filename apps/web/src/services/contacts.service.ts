import { api } from '../lib/api'

export interface ContactItem {
  id: string
  caseId: string
  initiatorId: string
  responderId: string
  status: 'pending' | 'active' | 'completed' | 'rejected'
  contactMethod: string
  message: string | null
  createdAt: string
  updatedAt: string
  caseAnimalType: string | null
  caseLocationText: string | null
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
