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
  nationalId: string
  role: string
  city?: string | null // sadece personelde dolu (müşteri/admin için null)
  dailyTransferLimit?: number | null // müşterinin günlük internet havale limiti (null = limitsiz)
  createdAt?: string // üyelik tarihi
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
  isActive: boolean // false = kapalı (listede gösterilmez)
  isFrozen: boolean // true = dondurulmuş/deaktive (listede kalır, işlem yapılamaz)
  freezeType: 'None' | 'Customer' | 'Bank' // banka bloğunu müşteri kaldıramaz
  createdAt: string
}

export interface Transaction {
  id: string
  type: 'Deposit' | 'Transfer' | 'Payment' | 'Refund' | 'LoanDisbursement' | 'LoanRepayment'
  direction: 'In' | 'Out' // gelen / giden (o hesabın bakışıyla)
  amount: number
  counterpartyIban: string | null
  accountIban: string | null
  description: string | null
  channel: 'Internet' | 'Branch' // şube çalışanı adına yaptıysa "Branch"
  createdAt: string
}

export interface SavedRecipient {
  id: string
  name: string
  iban: string
  note: string | null
  createdAt: string
}

export type CardStatus = 'Pending' | 'Approved' | 'Rejected' | 'Blocked'

// Yönetici müşteri arama sonucu (banka bloğu işlemleri için)
export interface ManagedCustomer {
  id: string
  fullName: string
  email: string
  nationalId: string | null
  accounts: Account[]
  cards: AdminCard[]
  loans: Loan[]
  recentTransactions: Transaction[]
}

export interface Card {
  id: string
  maskedCardNumber: string
  expiryMonth: number
  expiryYear: number
  status: CardStatus
  accountIban: string
  onlineShoppingEnabled: boolean
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

export type LoanStatus = 'Pending' | 'PendingApproval' | 'Approved' | 'Rejected'

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
  decisionNote: string // yetkili karar notu (otomatik kredilerde boş)
  monthlyInstallment: number // aylık taksit (onaylıysa > 0)
  remainingDebt: number // kalan toplam borç (faiz dahil)
  installmentsPaid: number // ödenen taksit sayısı
  createdAt: string
  decidedAt: string | null
  paymentPlan: PaymentPlan | null
}

// Denetim kaydı (admin/direktör görünümü).
export interface AuditLog {
  id: string
  actorName: string
  actorRole: string
  action: string
  detail: string
  createdAt: string
}

// Müşteri bildirimi.
export interface AppNotification {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

// Şube müdürü onay kuyruğundaki yüksek tutarlı havale.
export interface PendingTransfer {
  id: string
  customerName: string
  fromIban: string
  toIban: string
  amount: number
  description: string | null
  createdAt: string
}

// Onay geçmişi (karara bağlanmış kayıtlar — "Geçmiş" sekmesi).
export interface LoanHistory {
  id: string
  applicantName: string
  applicantEmail: string
  amount: number
  termMonths: number
  status: 'Approved' | 'Rejected'
  decidedByName: string
  decidedByRole: string
  decisionNote: string
  decidedAt: string | null
  createdAt: string
}
export interface TransferHistory {
  id: string
  customerName: string
  fromIban: string
  toIban: string
  amount: number
  description: string | null
  status: 'Approved' | 'Rejected'
  decidedByName: string
  decisionNote: string
  decidedAt: string | null
  createdAt: string
}

// Organizasyon görünümü (yönetici panelleri).
export interface OrgMember {
  fullName: string
  email: string
  role: string
  branchName: string | null
  city: string | null
}
export interface OrgStat {
  label: string
  value: number
}
export interface OrgView {
  title: string
  subtitle: string
  members: OrgMember[]
  stats: OrgStat[]
}

// Yetkili onay kuyruğundaki kredi (şube/il müdürü/direktör panelleri).
export interface PendingLoan {
  id: string
  applicantName: string
  applicantEmail: string
  age: number
  maritalStatus: MaritalStatus
  childrenCount: number
  housingStatus: HousingStatus
  income: number
  monthlyExpenses: number
  employmentMonths: number
  profession: string
  amount: number
  termMonths: number
  score: number
  maxLimit: number
  existingDebt: number
  netLimit: number
  aiReason: string
  recommendedStatus: LoanStatus
  requiredApproverRole: string
  createdAt: string
  canApprove: boolean
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
  cardId: string | null // ödemenin yapıldığı kart (ekstre filtresi için)
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
