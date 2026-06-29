import { apiClient } from '../lib/apiClient'
import type { ApiResponse, Biller, BillInquiry, BillPaymentRecord } from '../lib/types'

export interface BillInquiryPayload {
  billerCode: string
  subscriberNo: string
}

export interface PayBillPayload {
  billerCode: string
  subscriberNo: string
  accountId: string
}

// Fatura ödenebilen kurum kataloğu
export async function getBillers() {
  const { data } = await apiClient.get<ApiResponse<Biller[]>>('/api/bills/billers')
  return data
}

// Faturayı sorgula (güncel tutar + son ödeme tarihi)
export async function inquireBill(payload: BillInquiryPayload) {
  const { data } = await apiClient.post<ApiResponse<BillInquiry>>('/api/bills/inquiry', payload)
  return data
}

// Faturayı seçilen hesaptan öde
export async function payBill(payload: PayBillPayload) {
  const { data } = await apiClient.post<ApiResponse<BillPaymentRecord>>('/api/bills', payload)
  return data
}

// Fatura ödeme geçmişim
export async function getMyBills() {
  const { data } = await apiClient.get<ApiResponse<BillPaymentRecord[]>>('/api/bills')
  return data
}
