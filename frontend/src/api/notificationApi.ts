import { apiClient } from '../lib/apiClient'
import type { ApiResponse, AppNotification } from '../lib/types'

// Müşteri bildirimleri.
export async function getNotifications() {
  const { data } =
    await apiClient.get<ApiResponse<AppNotification[]>>('/api/notifications')
  return data
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post<ApiResponse<string>>(
    '/api/notifications/read',
    {},
  )
  return data
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.post<ApiResponse<string>>(
    `/api/notifications/${id}/read`,
    {},
  )
  return data
}
