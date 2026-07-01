import { apiClient } from '../lib/apiClient'
import type {
  ApiResponse,
  CreditCard,
  CreditCardLimitIncreaseRequest,
  CreditCardStatement,
  CreditCardTransaction,
  MaritalStatus,
  HousingStatus,
} from '../lib/types'

export interface CreditCardApplicationPayload {
  nationalId: string
  age: number
  maritalStatus: MaritalStatus
  childrenCount: number
  housingStatus: HousingStatus
  income: number
  monthlyExpenses: number
  employmentMonths: number
  profession: string
  statementDay: number
}

export interface PayCreditCardPayload {
  sourceAccountId: string
  amount: number
}

export interface CashAdvancePayload {
  targetAccountId: string
  amount: number
}

export interface LimitIncreasePayload {
  requestedLimit: number
  age: number
  maritalStatus: MaritalStatus
  childrenCount: number
  housingStatus: HousingStatus
  income: number
  monthlyExpenses: number
  employmentMonths: number
  profession: string
}

// Kredi kartı başvurusu (limit motorca atanır)
export async function applyCreditCard(payload: CreditCardApplicationPayload) {
  const { data } = await apiClient.post<ApiResponse<CreditCard>>('/api/credit-cards', payload)
  return data
}

// Kredi kartlarım
export async function getMyCreditCards() {
  const { data } = await apiClient.get<ApiResponse<CreditCard[]>>('/api/credit-cards')
  return data
}

// Kartın dönem ekstreleri
export async function getCreditCardStatements(cardId: string) {
  const { data } = await apiClient.get<ApiResponse<CreditCardStatement[]>>(
    `/api/credit-cards/${cardId}/statements`,
  )
  return data
}

// Kart hareketleri (ekstre kalemleri + ödemeler)
export async function getCreditCardTransactions(cardId: string) {
  const { data } = await apiClient.get<ApiResponse<CreditCardTransaction[]>>(
    `/api/credit-cards/${cardId}/transactions`,
  )
  return data
}

// Kredi kartı borcu öde (TL hesaptan)
export async function payCreditCard(cardId: string, payload: PayCreditCardPayload) {
  const { data } = await apiClient.post<ApiResponse<CreditCard>>(
    `/api/credit-cards/${cardId}/pay`,
    payload,
  )
  return data
}

// Kredi kartından TL hesaba nakit avans kullan
export async function cashAdvanceCreditCard(cardId: string, payload: CashAdvancePayload) {
  const { data } = await apiClient.post<ApiResponse<CreditCard>>(
    `/api/credit-cards/${cardId}/cash-advance`,
    payload,
  )
  return data
}

// Kredi kartı limit artış talebi oluştur
export async function requestCreditCardLimitIncrease(cardId: string, payload: LimitIncreasePayload) {
  const { data } = await apiClient.post<ApiResponse<CreditCardLimitIncreaseRequest>>(
    `/api/credit-cards/${cardId}/limit-increase-requests`,
    payload,
  )
  return data
}

// Kredi kartı limit artış taleplerim
export async function getCreditCardLimitIncreaseRequests(cardId: string) {
  const { data } = await apiClient.get<ApiResponse<CreditCardLimitIncreaseRequest[]>>(
    `/api/credit-cards/${cardId}/limit-increase-requests`,
  )
  return data
}

// Kartın internet alışverişini aç/kapat
export async function setCreditCardOnlineShopping(cardId: string, enabled: boolean) {
  const { data } = await apiClient.patch<ApiResponse<CreditCard>>(
    `/api/credit-cards/${cardId}/online-shopping`,
    { enabled },
  )
  return data
}
