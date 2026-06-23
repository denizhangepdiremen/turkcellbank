import { apiClient } from '../lib/apiClient'
import type { ApiResponse, AuditLog } from '../lib/types'

// Denetim kaydı (admin/direktör).
export async function getAudit() {
  const { data } = await apiClient.get<ApiResponse<AuditLog[]>>('/api/audit')
  return data
}
