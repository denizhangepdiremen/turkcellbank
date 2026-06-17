import { apiClient } from '../lib/apiClient'
import type { ApiResponse, User } from '../lib/types'

// Tüm kullanıcılar (admin-only endpoint).
export async function getUsers() {
  const { data } = await apiClient.get<ApiResponse<User[]>>('/api/admin/users')
  return data
}
