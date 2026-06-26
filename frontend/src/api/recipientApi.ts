import { apiClient } from '../lib/apiClient'
import type { ApiResponse, SavedRecipient } from '../lib/types'

export interface CreateRecipientPayload {
  name: string
  iban: string
  note?: string
}

export async function getRecipients() {
  const { data } = await apiClient.get<ApiResponse<SavedRecipient[]>>('/api/recipients')
  return data
}

export async function createRecipient(payload: CreateRecipientPayload) {
  const { data } = await apiClient.post<ApiResponse<SavedRecipient>>(
    '/api/recipients',
    payload,
  )
  return data
}

export async function deleteRecipient(id: string) {
  const { data } = await apiClient.delete<ApiResponse<string>>(`/api/recipients/${id}`)
  return data
}
