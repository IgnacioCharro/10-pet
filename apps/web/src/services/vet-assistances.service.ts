import { api } from '../lib/api'

export interface VetAssistanceItem {
  id: string
  caseId: string
  userId: string
  userName: string | null
  isVet: boolean
  procedure: string | null
  medication: string | null
  attendedAt: string | null
  createdAt: string
}

export const getVetAssistances = async (caseId: string): Promise<VetAssistanceItem[]> => {
  const res = await api.get<{ assistances: VetAssistanceItem[] }>(
    `/cases/${caseId}/vet-assistances`,
  )
  return res.data.assistances
}

export const createVetAssistance = async (
  caseId: string,
  input: { procedure?: string; medication?: string; attendedAt?: string },
): Promise<VetAssistanceItem> => {
  const res = await api.post<{ assistance: VetAssistanceItem }>(
    `/cases/${caseId}/vet-assistances`,
    input,
  )
  return res.data.assistance
}
