import { apiClient } from '../lib/apiClient'
import type { Account, AccountType, ApiResponse } from '../lib/types'

// Giriş yapan kullanıcının hesapları.
export async function getAccounts() {
  const { data } = await apiClient.get<ApiResponse<Account[]>>('/api/accounts')
  return data
}

// Yeni hesap aç.
export async function createAccount(accountType: AccountType) {
  const { data } = await apiClient.post<ApiResponse<Account>>('/api/accounts', {
    accountType,
  })
  return data
}

// Hesap kapat. Bakiye varsa hedef hesaba (targetAccountId) aktarılır; bağlı kartlar silinir.
export async function closeAccount(id: string, targetAccountId?: string) {
  const { data } = await apiClient.post<ApiResponse<Account>>(
    `/api/accounts/${id}/close`,
    { targetAccountId: targetAccountId ?? null },
  )
  return data
}

// Hesabı dondur (deaktive et). Bağlı kartlar bloke edilir.
export async function freezeAccount(id: string) {
  const { data } = await apiClient.post<ApiResponse<Account>>(
    `/api/accounts/${id}/freeze`,
    {},
  )
  return data
}

// Dondurulmuş hesabı yeniden aktifleştir. Bloke kartlar tekrar onaylıya döner.
export async function reactivateAccount(id: string) {
  const { data } = await apiClient.post<ApiResponse<Account>>(
    `/api/accounts/${id}/reactivate`,
    {},
  )
  return data
}
