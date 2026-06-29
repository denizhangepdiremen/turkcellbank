import { apiClient } from '../lib/apiClient'
import type { ApiResponse, TimeDeposit, TimeDepositProduct } from '../lib/types'

export interface OpenTimeDepositPayload {
  sourceAccountId: string
  principal: number
  termDays: number
}

// Sunulan vade ürünleri (vade + oran)
export async function getTimeDepositProducts() {
  const { data } = await apiClient.get<ApiResponse<TimeDepositProduct[]>>('/api/time-deposits/products')
  return data
}

// Vadeli mevduatlarım
export async function getMyTimeDeposits() {
  const { data } = await apiClient.get<ApiResponse<TimeDeposit[]>>('/api/time-deposits')
  return data
}

// Yeni vadeli mevduat aç
export async function openTimeDeposit(payload: OpenTimeDepositPayload) {
  const { data } = await apiClient.post<ApiResponse<TimeDeposit>>('/api/time-deposits', payload)
  return data
}

// Vadeli mevduatı erken boz
export async function closeTimeDeposit(id: string) {
  const { data } = await apiClient.post<ApiResponse<TimeDeposit>>(`/api/time-deposits/${id}/close`, {})
  return data
}
