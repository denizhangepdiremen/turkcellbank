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
  type: 'Deposit' | 'Transfer'
  direction: 'In' | 'Out' // gelen / giden (o hesabın bakışıyla)
  amount: number
  counterpartyIban: string | null
  description: string | null
  createdAt: string
}
