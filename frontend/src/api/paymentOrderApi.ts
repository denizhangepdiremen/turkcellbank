import { apiClient } from '../lib/apiClient'
import type { ApiResponse, PaymentOrder, PaymentOrderType } from '../lib/types'

export interface CreatePaymentOrderPayload {
  type: PaymentOrderType
  name: string
  sourceAccountId: string
  dayOfMonth: number
  billerCode?: string
  subscriberNo?: string
  targetIban?: string
  targetName?: string
  amount?: number
}

// Talimatlarım
export async function getPaymentOrders() {
  const { data } = await apiClient.get<ApiResponse<PaymentOrder[]>>('/api/payment-orders')
  return data
}

// Yeni talimat oluştur
export async function createPaymentOrder(payload: CreatePaymentOrderPayload) {
  const { data } = await apiClient.post<ApiResponse<PaymentOrder>>('/api/payment-orders', payload)
  return data
}

// Talimatı aktif/pasif yap
export async function setPaymentOrderActive(id: string, isActive: boolean) {
  const { data } = await apiClient.put<ApiResponse<PaymentOrder>>(
    `/api/payment-orders/${id}/active`,
    { isActive },
  )
  return data
}

// Talimatı sil
export async function deletePaymentOrder(id: string) {
  const { data } = await apiClient.delete<ApiResponse<string>>(`/api/payment-orders/${id}`)
  return data
}
