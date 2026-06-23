import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Loan, PendingLoan } from '../lib/types'

// Yetkili kredi onay işlemleri (şube/il müdürü/direktör).

// Onay bekleyen krediler (görünüm + canApprove)
export async function getPendingLoans() {
  const { data } =
    await apiClient.get<ApiResponse<PendingLoan[]>>('/api/approvals/loans')
  return data
}

// Krediyi onayla (opsiyonel yetkili notu)
export async function approveLoan(id: string, note?: string) {
  const { data } = await apiClient.post<ApiResponse<Loan>>(
    `/api/approvals/loans/${id}/approve`,
    { note },
  )
  return data
}

// Krediyi reddet (opsiyonel yetkili notu)
export async function rejectLoan(id: string, note?: string) {
  const { data } = await apiClient.post<ApiResponse<Loan>>(
    `/api/approvals/loans/${id}/reject`,
    { note },
  )
  return data
}
