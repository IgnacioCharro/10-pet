import { api } from './api'

export interface AdminStats {
  totalUsers: number
  newUsersLast7d: number
  totalCases: number
  newCasesLast7d: number
  casesByStatus: Record<string, number>
  pendingReports: number
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  emailVerified: boolean
  bannedAt: string | null
  casesCount: number
  createdAt: string
}

export interface AdminReport {
  id: string
  reporterId: string
  targetCaseId: string | null
  targetUserId: string | null
  reason: string
  description: string | null
  status: string
  reviewedAt: string | null
  createdAt: string
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await api.get<AdminStats>('/admin/stats')
  return res.data
}

export async function listAdminUsers(params?: {
  page?: number
  limit?: number
  search?: string
}): Promise<{ users: AdminUser[]; total: number }> {
  const res = await api.get<{ users: AdminUser[]; total: number }>('/admin/users', { params })
  return res.data
}

export async function banAdminUser(userId: string, action: 'ban' | 'unban'): Promise<void> {
  await api.patch(`/admin/users/${userId}`, { action })
}

export async function listAdminReports(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<{ reports: AdminReport[]; total: number }> {
  const res = await api.get<{ reports: AdminReport[]; total: number }>('/admin/reports', { params })
  return res.data
}

export async function updateAdminReport(
  reportId: string,
  status: 'dismissed' | 'resolved',
): Promise<void> {
  await api.patch(`/admin/reports/${reportId}`, { status })
}

export async function patchAdminCase(caseId: string, action: 'delete' | 'restore'): Promise<void> {
  await api.patch(`/admin/cases/${caseId}`, { action })
}
