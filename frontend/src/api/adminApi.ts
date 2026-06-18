import { apiClient } from '../lib/apiClient'
import type {
  AdminLoan,
  AdminPayment,
  ApiResponse,
  Loan,
  Payment,
  User,
} from '../lib/types'

// Tüm kullanıcılar (admin-only endpoint).
export async function getUsers() {
  const { data } = await apiClient.get<ApiResponse<User[]>>('/api/admin/users')
  return data
}

// Tüm kredi başvuruları (başvuranla)
export async function getLoans() {
  const { data } = await apiClient.get<ApiResponse<AdminLoan[]>>('/api/admin/loans')
  return data
}

// Krediyi onayla / reddet
export async function approveLoan(id: string) {
  const { data } = await apiClient.post<ApiResponse<Loan>>(
    `/api/admin/loans/${id}/approve`,
    {},
  )
  return data
}

export async function rejectLoan(id: string) {
  const { data } = await apiClient.post<ApiResponse<Loan>>(
    `/api/admin/loans/${id}/reject`,
    {},
  )
  return data
}

// Tüm ödemeler (ödeyenle)
export async function getPayments() {
  const { data } = await apiClient.get<ApiResponse<AdminPayment[]>>(
    '/api/admin/payments',
  )
  return data
}

// Ödemeyi iade et
export async function refundPayment(id: string) {
  const { data } = await apiClient.post<ApiResponse<Payment>>(
    `/api/admin/payments/${id}/refund`,
    {},
  )
  return data
}
