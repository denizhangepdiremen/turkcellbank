import { apiClient } from '../lib/apiClient'
import type {
  ApiResponse,
  Currency,
  ExchangeRate,
  FxAlertDirection,
  FxConversion,
  FxQuote,
  FxRateAlert,
  FxTrade,
  FxTradeSide,
} from '../lib/types'

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

export interface FxRateAlertPayload {
  currency: Currency
  direction: FxAlertDirection
  targetRate: number
}

export interface FxConversionPayload {
  fromCurrency: Currency
  toCurrency: Currency
  amount: number
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

export async function fxConvert(payload: FxConversionPayload) {
  const { data } = await apiClient.post<ApiResponse<FxConversion>>('/api/fx/convert', payload)
  return data
}

// Döviz/altın işlem geçmişim
export async function getMyFxTrades() {
  const { data } = await apiClient.get<ApiResponse<FxTrade[]>>('/api/fx/trades')
  return data
}

export async function getMyFxConversions() {
  const { data } = await apiClient.get<ApiResponse<FxConversion[]>>('/api/fx/conversions')
  return data
}

export async function getFxAlerts() {
  const { data } = await apiClient.get<ApiResponse<FxRateAlert[]>>('/api/fx/alerts')
  return data
}

export async function createFxAlert(payload: FxRateAlertPayload) {
  const { data } = await apiClient.post<ApiResponse<FxRateAlert>>('/api/fx/alerts', payload)
  return data
}

export async function deleteFxAlert(id: string) {
  const { data } = await apiClient.delete<ApiResponse<string>>(`/api/fx/alerts/${id}`)
  return data
}
