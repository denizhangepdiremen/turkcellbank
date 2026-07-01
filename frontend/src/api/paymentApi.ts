import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Payment } from '../lib/types'

export interface PayPayload {
  amount: number
  threeDSCode: string
  description?: string
  // Ödeme aracı: banka kartı (debit) → hesaptan düşülür; kredi kartı (credit) → limitten harcanır
  instrument?: 'debit' | 'credit'
  cardId?: string // debit kart
  creditCardId?: string // kredi kartı
  installments?: number // kredi kartı taksit sayısı (1..12)
}

// Kart ile ödeme yap (debit → hesaptan; credit → kredi kartı limitinden, taksitli)
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
