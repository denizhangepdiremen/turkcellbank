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

// Hesap kapat.
export async function closeAccount(id: string) {
  const { data } = await apiClient.post<ApiResponse<Account>>(
    `/api/accounts/${id}/close`,
    {},
  )
  return data
}
