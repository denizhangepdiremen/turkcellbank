import { apiClient } from '../lib/apiClient'
import type { Account, ApiResponse, ManagedCustomer } from '../lib/types'

// Yönetici (şube/il müdürü, direktör) müşteri hesabı işlemleri (banka bloğu).

// Müşteri ara (TC/e-posta) + hesaplarını getir
export async function searchManagedCustomer(query: string) {
  const { data } = await apiClient.get<ApiResponse<ManagedCustomer>>(
    '/api/management/customer',
    { params: { query } },
  )
  return data
}

// Hesaba banka bloğu koy (sebep opsiyonel)
export async function bankFreezeAccount(accountId: string, reason?: string) {
  const { data } = await apiClient.post<ApiResponse<Account>>(
    `/api/management/accounts/${accountId}/freeze`,
    { reason: reason || null },
  )
  return data
}

// Banka bloğunu kaldır
export async function bankUnfreezeAccount(accountId: string) {
  const { data } = await apiClient.post<ApiResponse<Account>>(
    `/api/management/accounts/${accountId}/unfreeze`,
    {},
  )
  return data
}
