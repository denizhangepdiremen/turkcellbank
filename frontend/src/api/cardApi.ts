import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Card } from '../lib/types'

// Hesaba bağlı kart aç (admin onayı bekler)
export async function createCard(accountId: string) {
  const { data } = await apiClient.post<ApiResponse<Card>>('/api/cards', {
    accountId,
  })
  return data
}

// Kartlarım
export async function getMyCards() {
  const { data } = await apiClient.get<ApiResponse<Card[]>>('/api/cards')
  return data
}
