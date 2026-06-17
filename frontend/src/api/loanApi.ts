import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Loan } from '../lib/types'

export interface LoanApplyPayload {
  income: number
  profession: string
  amount: number
  termMonths: number
}

// Kredi başvurusu yap
export async function applyLoan(payload: LoanApplyPayload) {
  const { data } = await apiClient.post<ApiResponse<Loan>>('/api/loans', payload)
  return data
}

// Kredilerim
export async function getMyLoans() {
  const { data } = await apiClient.get<ApiResponse<Loan[]>>('/api/loans')
  return data
}

// Kredi detayı (onaylıysa ödeme planıyla)
export async function getLoanDetail(id: string) {
  const { data } = await apiClient.get<ApiResponse<Loan>>(`/api/loans/${id}`)
  return data
}
