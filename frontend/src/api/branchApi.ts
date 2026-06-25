import { apiClient } from '../lib/apiClient'
import type {
  Account,
  AccountType,
  AdminCard,
  ApiResponse,
  Card,
  Loan,
  Transaction,
} from '../lib/types'
import type { LoanApplyPayload } from './loanApi'

// Şube çalışanının müşteri ADINA yaptığı işlemler.

export interface CustomerLookup {
  id: string
  fullName: string
  email: string
  nationalId: string | null
  accounts: Account[]
  cards: AdminCard[]
  loans: Loan[]
  recentTransactions: Transaction[]
}

// Müşteri ara (TC kimlik no veya e-posta)
export async function searchCustomer(query: string) {
  const { data } = await apiClient.get<ApiResponse<CustomerLookup>>(
    '/api/branch/customers',
    { params: { query } },
  )
  return data
}

export async function openAccount(customerId: string, accountType: AccountType) {
  const { data } = await apiClient.post<ApiResponse<Account>>(
    `/api/branch/customers/${customerId}/accounts`,
    { accountType },
  )
  return data
}

export async function deposit(customerId: string, accountId: string, amount: number) {
  const { data } = await apiClient.post<ApiResponse<Transaction>>(
    `/api/branch/customers/${customerId}/deposit`,
    { accountId, amount },
  )
  return data
}

export interface BranchTransferPayload {
  fromAccountId: string
  toIban: string
  amount: number
  description?: string
}

// Eşik üstü havale hemen gerçekleşmez, şube müdürü onayına gider (status).
export interface BranchTransferResult {
  status: 'Completed' | 'PendingApproval'
  amount: number
}

export async function transfer(customerId: string, payload: BranchTransferPayload) {
  const { data } = await apiClient.post<ApiResponse<BranchTransferResult>>(
    `/api/branch/customers/${customerId}/transfer`,
    payload,
  )
  return data
}

export async function applyCard(customerId: string, accountId: string) {
  const { data } = await apiClient.post<ApiResponse<Card>>(
    `/api/branch/customers/${customerId}/cards`,
    { accountId },
  )
  return data
}

export async function applyLoan(customerId: string, payload: LoanApplyPayload) {
  const { data } = await apiClient.post<ApiResponse<Loan>>(
    `/api/branch/customers/${customerId}/loans`,
    payload,
  )
  return data
}
