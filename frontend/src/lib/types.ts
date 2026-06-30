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

// TRY = Türk Lirası, USD/EUR döviz, XAU = gram altın
export type Currency = 'TRY' | 'USD' | 'EUR' | 'XAU'

export interface Account {
  id: string
  iban: string
  accountType: AccountType
  currency: Currency
  balance: number
  isActive: boolean // false = kapalı (listede gösterilmez)
  isFrozen: boolean // true = dondurulmuş/deaktive (listede kalır, işlem yapılamaz)
  freezeType: 'None' | 'Customer' | 'Bank' // banka bloğunu müşteri kaldıramaz
  createdAt: string
}

export interface Transaction {
  id: string
  type:
    | 'Deposit'
    | 'Transfer'
    | 'Payment'
    | 'Refund'
    | 'LoanDisbursement'
    | 'LoanRepayment'
    | 'BillPayment'
    | 'TimeDepositOpen'
    | 'TimeDepositMaturity'
    | 'FxBuy'
    | 'FxSell'
  direction: 'In' | 'Out' // gelen / giden (o hesabın bakışıyla)
  amount: number
  counterpartyIban: string | null
  accountIban: string | null
  description: string | null
  channel: 'Internet' | 'Branch' | 'Automatic' // "Branch": şube adına; "Automatic": düzenli ödeme talimatı
  createdAt: string
}

export interface TransactionHistoryFilters {
  fromDate?: string
  toDate?: string
  type?: Transaction['type'] | ''
  direction?: Transaction['direction'] | ''
  minAmount?: number
  maxAmount?: number
  search?: string
  page?: number
  pageSize?: number
}

export interface TransactionHistoryResult {
  items: Transaction[]
  page: number
  pageSize: number
  totalCount: number
  incomeTotal: number
  expenseTotal: number
  netTotal: number
}

export interface SavedRecipient {
  id: string
  name: string
  iban: string
  note: string | null
  createdAt: string
}

export type BillCategory = 'Elektrik' | 'Su' | 'Dogalgaz' | 'Telefon' | 'Internet'

// Fatura ödenebilen kurum (katalog).
export interface Biller {
  code: string
  name: string
  category: BillCategory
}

// Fatura sorgulama sonucu.
export interface BillInquiry {
  billerCode: string
  billerName: string
  category: BillCategory
  subscriberNo: string
  period: string // "YYYY-MM"
  amount: number
  dueDate: string
  isPaid: boolean // true ise bu dönem zaten ödenmiş
}

// Ödenmiş fatura kaydı (müşteri geçmişi).
export interface BillPaymentRecord {
  id: string
  billerName: string
  category: BillCategory
  subscriberNo: string
  period: string
  amount: number
  accountIban: string | null
  createdAt: string
}

export type PaymentOrderType = 'AutoBill' | 'RecurringTransfer'

// Düzenli ödeme talimatı (otomatik fatura veya düzenli havale).
export interface PaymentOrder {
  id: string
  type: PaymentOrderType
  name: string
  sourceAccountId: string
  sourceIban: string
  dayOfMonth: number
  nextRunDate: string
  isActive: boolean
  lastRunAt: string | null
  lastStatus: string | null
  category: BillCategory | null
  billerName: string | null // AutoBill
  subscriberNo: string | null // AutoBill
  targetIban: string | null // RecurringTransfer
  targetName: string | null // RecurringTransfer
  amount: number | null // RecurringTransfer
  createdAt: string
}

export type TimeDepositStatus = 'Active' | 'Matured' | 'ClosedEarly'

// Sunulan vadeli mevduat ürünü (vade + yıllık brüt faiz oranı).
export interface TimeDepositProduct {
  termDays: number
  annualRate: number // 0.45 = %45
  label: string
}

// Vadeli mevduat hesabı.
export interface TimeDeposit {
  id: string
  sourceAccountId: string
  sourceIban: string
  principal: number
  annualRate: number
  termDays: number
  grossInterest: number
  withholdingTax: number
  netInterest: number
  maturityAmount: number // anapara + net faiz
  status: TimeDepositStatus
  openedAt: string
  maturityDate: string
  closedAt: string | null
}

// --- Döviz & Altın ---
export type FxTradeSide = 'Buy' | 'Sell'

// Kur tahtası satırı (1 birim = ? TL)
export interface ExchangeRate {
  currency: Currency
  code: string
  name: string
  unit: string
  buyRate: number
  sellRate: number
  updatedAt: string
}

// Alış/satış öncesi anlık fiyat sorgusu sonucu
export interface FxQuote {
  side: FxTradeSide
  currency: Currency
  amount: number
  rate: number
  tryAmount: number
}

// Gerçekleşen döviz/altın işlemi
export interface FxTrade {
  id: string
  side: FxTradeSide
  currency: Currency
  code: string
  amount: number
  rate: number
  tryAmount: number
  tryIban: string
  foreignIban: string
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
