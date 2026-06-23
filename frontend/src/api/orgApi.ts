import { apiClient } from '../lib/apiClient'
import type { ApiResponse, OrgView } from '../lib/types'

// Yönetici organizasyon görünümü (ekibim + özet istatistikler).
export async function getTeam() {
  const { data } = await apiClient.get<ApiResponse<OrgView>>('/api/org/team')
  return data
}
