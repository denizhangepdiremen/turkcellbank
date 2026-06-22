// Backend ile paylaşılan veri tipleri (TypeScript karşılıkları).

// Tüm API cevaplarının ortak zarfı (backend'deki ApiResponse<T> ile aynı).
export interface ApiResponse<T> {
  success: boolean
  message: string | null
  data: T | null
  errors: string[] | null
}

export interface User {
  id: string
  fullName: string
  email: string
  role: string
}

export interface AuthResponse {
  token: string
  expiresAt: string
  user: User
}

export type AccountType = 'Bireysel' | 'Isletme'

export interface Account {
  id: string
  iban: string
  accountType: AccountType
  balance: number
  isActive: boolean
  createdAt: string
}

export interface Transaction {
  id: string
  type: 'Deposit' | 'Transfer' | 'Payment' | 'Refund'
  direction: 'In' | 'Out' // gelen / giden (o hesabın bakışıyla)
  amount: number
  counterpartyIban: string | null
  description: string | null
  createdAt: string
}

export type CardStatus = 'Pending' | 'Approved' | 'Rejected'

export interface Card {
  id: string
  maskedCardNumber: string
  expiryMonth: number
  expiryYear: number
  status: CardStatus
  accountIban: string
  createdAt: string
}

export interface AdminCard {
  id: string
  holderName: string
  holderEmail: string
  maskedCardNumber: string
  accountIban: string
  status: CardStatus
  createdAt: string
  decidedAt: string | null
}

export type LoanStatus = 'Pending' | 'Approved' | 'Rejected'

export interface Installment {
  no: number
  dueDate: string
  amount: number
}

export interface PaymentPlan {
  monthlyRate: number
  monthlyPayment: number
  totalPayment: number
  installments: Installment[]
}

export type MaritalStatus = 'Single' | 'Married'
export type HousingStatus = 'Tenant' | 'Owner'

export interface Loan {
  id: string
  income: number
  profession: string
  amount: number
  termMonths: number
  status: LoanStatus
  score: number
  maxLimit: number
  existingDebt: number
  netLimit: number
  aiReason: string
  decidedBy: string
  createdAt: string
  decidedAt: string | null
  paymentPlan: PaymentPlan | null
}

export interface AdminLoan {
  id: string
  applicantName: string
  applicantEmail: string
  income: number
  profession: string
  amount: number
  termMonths: number
  status: LoanStatus
  score: number
  maxLimit: number
  netLimit: number
  aiReason: string
  decidedBy: string
  createdAt: string
  decidedAt: string | null
}

export type PaymentStatus = 'Success' | 'Failed' | 'Refunded'

export interface Payment {
  id: string
  maskedCardNumber: string
  amount: number
  status: PaymentStatus
  description: string | null
  createdAt: string
}

export interface AdminPayment {
  id: string
  payerName: string
  payerEmail: string
  maskedCardNumber: string
  amount: number
  status: PaymentStatus
  description: string | null
  createdAt: string
}
