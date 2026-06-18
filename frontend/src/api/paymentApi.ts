import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Payment } from '../lib/types'

export interface PayPayload {
  cardId: string
  amount: number
  threeDSCode: string
  description?: string
}

// Onaylı kartla ödeme yap (tutar karta bağlı hesaptan düşülür)
export async function pay(payload: PayPayload) {
  const { data } = await apiClient.post<ApiResponse<Payment>>(
    '/api/payments',
    payload,
  )
  return data
}

// Ödeme geçmişim
export async function getMyPayments() {
  const { data } = await apiClient.get<ApiResponse<Payment[]>>('/api/payments')
  return data
}
