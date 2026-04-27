import { api } from '../lib/api'
import type {
  CaseItem,
  CaseDetail,
  CaseUpdateItem,
  CaseUpdateType,
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

export type ResolutionType =
  | 'adoptado'
  | 'en_transito'
  | 'zoonosis'
  | 'derivado_ong'
  | 'fallecio'
  | 'sin_paradero'
  | 'otro'

export const updateCase = async (
  id: string,
  data: { status?: string; resolutionType?: ResolutionType },
): Promise<CaseDetail> => {
  const res = await api.patch<{ case: CaseDetail }>(`/cases/${id}`, data)
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

export const addCaseUpdate = async (
  caseId: string,
  updateType: CaseUpdateType,
  content?: string,
): Promise<CaseUpdateItem> => {
  const res = await api.post<{ update: CaseUpdateItem }>(`/cases/${caseId}/updates`, {
    updateType,
    content: content || undefined,
  })
  return res.data.update
}
