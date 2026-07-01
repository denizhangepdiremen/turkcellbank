import { apiClient } from '../lib/apiClient'
import type {
  AdminCard,
  AdminCreditCard,
  ApiResponse,
  Card,
  CreditCard,
  Loan,
  LoanHistory,
  PendingLoan,
  PendingTransfer,
  TransferHistory,
} from '../lib/types'

// Yetkili kredi onay işlemleri (şube/il müdürü/direktör).

// Onay bekleyen krediler (görünüm + canApprove)
export async function getPendingLoans() {
  const { data } =
    await apiClient.get<ApiResponse<PendingLoan[]>>('/api/approvals/loans')
  return data
}

// Krediyi onayla (opsiyonel yetkili notu)
export async function approveLoan(id: string, note?: string) {
  const { data } = await apiClient.post<ApiResponse<Loan>>(
    `/api/approvals/loans/${id}/approve`,
    { note },
  )
  return data
}

// Krediyi reddet (opsiyonel yetkili notu)
export async function rejectLoan(id: string, note?: string) {
  const { data } = await apiClient.post<ApiResponse<Loan>>(
    `/api/approvals/loans/${id}/reject`,
    { note },
  )
  return data
}

// Karara bağlanmış krediler (onay/ret geçmişi)
export async function getLoanHistory() {
  const { data } =
    await apiClient.get<ApiResponse<LoanHistory[]>>('/api/approvals/loans/history')
  return data
}

// --- Yüksek tutarlı havale onayı (şube müdürü) ---
export async function getPendingTransfers() {
  const { data } =
    await apiClient.get<ApiResponse<PendingTransfer[]>>('/api/approvals/transfers')
  return data
}
export async function approveTransfer(id: string, note?: string) {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    `/api/approvals/transfers/${id}/approve`,
    { note },
  )
  return data
}
export async function rejectTransfer(id: string, note?: string) {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    `/api/approvals/transfers/${id}/reject`,
    { note },
  )
  return data
}
// Karara bağlanmış havaleler (onay/ret geçmişi)
export async function getTransferHistory() {
  const { data } =
    await apiClient.get<ApiResponse<TransferHistory[]>>('/api/approvals/transfers/history')
  return data
}

// --- Kart başvuru onayı (şube müdürü) ---
export async function getPendingCards() {
  const { data } =
    await apiClient.get<ApiResponse<AdminCard[]>>('/api/approvals/cards')
  return data
}
export async function getCardHistory() {
  const { data } =
    await apiClient.get<ApiResponse<AdminCard[]>>('/api/approvals/cards/history')
  return data
}
export async function approveCard(id: string) {
  const { data } = await apiClient.post<ApiResponse<Card>>(
    `/api/approvals/cards/${id}/approve`,
    {},
  )
  return data
}
export async function rejectCard(id: string) {
  const { data } = await apiClient.post<ApiResponse<Card>>(
    `/api/approvals/cards/${id}/reject`,
    {},
  )
  return data
}

// --- Kredi kartı başvuru onayı (şube müdürü) ---
export async function getPendingCreditCards() {
  const { data } =
    await apiClient.get<ApiResponse<AdminCreditCard[]>>('/api/approvals/credit-cards')
  return data
}
export async function approveCreditCard(id: string) {
  const { data } = await apiClient.post<ApiResponse<CreditCard>>(
    `/api/approvals/credit-cards/${id}/approve`,
    {},
  )
  return data
}
export async function rejectCreditCard(id: string) {
  const { data } = await apiClient.post<ApiResponse<CreditCard>>(
    `/api/approvals/credit-cards/${id}/reject`,
    {},
  )
  return data
}
export async function approveCreditCardLimitIncrease(id: string) {
  const { data } = await apiClient.post<ApiResponse<CreditCard>>(
    `/api/approvals/credit-card-limit-requests/${id}/approve`,
    {},
  )
  return data
}
export async function rejectCreditCardLimitIncrease(id: string) {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    `/api/approvals/credit-card-limit-requests/${id}/reject`,
    {},
  )
  return data
}
