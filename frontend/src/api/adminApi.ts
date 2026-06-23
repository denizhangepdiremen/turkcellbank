import { apiClient } from '../lib/apiClient'
import type {
  AdminCard,
  AdminLoan,
  AdminPayment,
  ApiResponse,
  Payment,
  User,
} from '../lib/types'

// Tüm kullanıcılar (admin-only endpoint).
export async function getUsers() {
  const { data } = await apiClient.get<ApiResponse<User[]>>('/api/admin/users')
  return data
}

// Tüm kredi başvuruları (başvuranla) — admin için salt-okunur teknik görünüm.
// Kredi onay/red yetkisi admin'de değildir; banka hiyerarşisindedir (approvalApi).
export async function getLoans() {
  const { data } = await apiClient.get<ApiResponse<AdminLoan[]>>('/api/admin/loans')
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

// Tüm kart başvuruları (sahip + hesapla)
export async function getCards() {
  const { data } = await apiClient.get<ApiResponse<AdminCard[]>>('/api/admin/cards')
  return data
}

// Kart onay/red yetkisi admin'de değildir; şube müdüründedir (approvalApi).
