import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Currency, ExchangeRate, FxQuote, FxTrade, FxTradeSide } from '../lib/types'

export interface FxQuotePayload {
  side: FxTradeSide
  currency: Currency
  amount: number
}

export interface FxTradePayload {
  side: FxTradeSide
  currency: Currency
  amount: number
  tryAccountId: string
}

// Güncel kur tahtası (TRY dışı birimler)
export async function getFxRates() {
  const { data } = await apiClient.get<ApiResponse<ExchangeRate[]>>('/api/fx/rates')
  return data
}

// Anlık fiyat sorgusu (TL karşılığı + kur)
export async function getFxQuote(payload: FxQuotePayload) {
  const { data } = await apiClient.post<ApiResponse<FxQuote>>('/api/fx/quote', payload)
  return data
}

// Döviz/altın al ya da sat
export async function fxTrade(payload: FxTradePayload) {
  const { data } = await apiClient.post<ApiResponse<FxTrade>>('/api/fx/trade', payload)
  return data
}

// Döviz/altın işlem geçmişim
export async function getMyFxTrades() {
  const { data } = await apiClient.get<ApiResponse<FxTrade[]>>('/api/fx/trades')
  return data
}
