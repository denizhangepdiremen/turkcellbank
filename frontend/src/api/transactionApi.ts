import { apiClient } from '../lib/apiClient'
import type {
  ApiResponse,
  Transaction,
  TransactionHistoryFilters,
  TransactionHistoryResult,
} from '../lib/types'

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

export async function getHistoryPage(
  accountId: string,
  filters: TransactionHistoryFilters = {},
) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  const qs = params.toString()
  const { data } = await apiClient.get<ApiResponse<TransactionHistoryResult>>(
    `/api/transactions/${accountId}/search${qs ? `?${qs}` : ''}`,
  )
  return data
}
