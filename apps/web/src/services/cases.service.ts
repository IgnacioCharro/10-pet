import { api } from '../lib/api'
import type {
  CaseItem,
  CaseDetail,
  ListCasesQuery,
  PaginatedCasesResponse,
  CreateCaseInput,
} from '../types/case'

export const listCases = async (query: ListCasesQuery = {}): Promise<PaginatedCasesResponse> => {
  const res = await api.get<PaginatedCasesResponse>('/cases', { params: query })
  return res.data
}

export const getNearbyCases = async (params: {
  lat: number
  lng: number
  radius?: number
}): Promise<CaseItem[]> => {
  const res = await api.get<{ cases: CaseItem[] }>('/cases/nearby', { params })
  return res.data.cases
}

export const getCaseById = async (id: string): Promise<CaseDetail> => {
  const res = await api.get<{ case: CaseDetail }>(`/cases/${id}`)
  return res.data.case
}

export const createCase = async (input: CreateCaseInput): Promise<CaseItem> => {
  const res = await api.post<{ case: CaseItem }>('/cases', input)
  return res.data.case
}

export type ReportReason = 'spam' | 'contenido_inapropiado' | 'falso' | 'acoso' | 'otro'

export const createCaseReport = async (
  caseId: string,
  reason: ReportReason,
  description?: string,
): Promise<void> => {
  await api.post(`/cases/${caseId}/report`, { reason, description })
}
