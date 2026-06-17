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
