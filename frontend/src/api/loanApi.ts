import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Loan } from '../lib/types'

export interface LoanApplyPayload {
  nationalId: string
  age: number
  maritalStatus: 'Single' | 'Married'
  childrenCount: number
  housingStatus: 'Tenant' | 'Owner'
  income: number
  monthlyExpenses: number
  employmentMonths: number
  profession: string
  amount: number
  termMonths: number
  disbursementAccountId: string // kredinin yatırılacağı hesap
}

// Kredi başvurusu yap
export async function applyLoan(payload: LoanApplyPayload) {
  const { data } = await apiClient.post<ApiResponse<Loan>>('/api/loans', payload)
  return data
}

// Bir taksiti seçilen hesaptan öde
export async function payInstallment(loanId: string, accountId: string) {
  const { data } = await apiClient.post<ApiResponse<Loan>>(
    `/api/loans/${loanId}/pay-installment`,
    { accountId },
  )
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
