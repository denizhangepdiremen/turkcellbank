import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Transaction } from '../lib/types'

// Para yatırma
export async function deposit(accountId: string, amount: number) {
  const { data } = await apiClient.post<ApiResponse<Transaction>>(
    '/api/transactions/deposit',
    { accountId, amount },
  )
  return data
}

// Banka içi transfer
export async function transfer(payload: {
  fromAccountId: string
  toIban: string
  amount: number
  description?: string
}) {
  const { data } = await apiClient.post<ApiResponse<Transaction>>(
    '/api/transactions/transfer',
    payload,
  )
  return data
}

// Bir hesabın işlem geçmişi
export async function getHistory(accountId: string) {
  const { data } = await apiClient.get<ApiResponse<Transaction[]>>(
    `/api/transactions/${accountId}`,
  )
  return data
}
