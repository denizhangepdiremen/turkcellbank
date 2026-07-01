import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, CardContent, CardFooter } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Select'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { Skeleton } from '../../components/Skeleton'
import { Alert } from '../../components/Alert'
import { Checkbox } from '../../components/Checkbox'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'
import {
  getAccounts,
  createAccount,
  closeAccount,
  freezeAccount,
  reactivateAccount,
} from '../../api/accountApi'
import { updateProfile, changePassword, setTransferLimit } from '../../api/authApi'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notificationApi'
import { deposit, transfer, getHistory, getHistoryPage } from '../../api/transactionApi'
import { applyLoan, getMyLoans, getLoanDetail, payInstallment } from '../../api/loanApi'
import { pay, getMyPayments } from '../../api/paymentApi'
import { createCard, getMyCards, setCardOnlineShopping } from '../../api/cardApi'
import {
  applyCreditCard,
  getMyCreditCards,
  getCreditCardStatements,
  getCreditCardTransactions,
  payCreditCard,
  cashAdvanceCreditCard,
  requestCreditCardLimitIncrease,
  getCreditCardLimitIncreaseRequests,
  setCreditCardOnlineShopping,
} from '../../api/creditCardApi'
import { createRecipient, deleteRecipient, getRecipients } from '../../api/recipientApi'
import { getBillers, inquireBill, payBill, getMyBills } from '../../api/billApi'
import {
  getPaymentOrders,
  createPaymentOrder,
  setPaymentOrderActive,
  deletePaymentOrder,
} from '../../api/paymentOrderApi'
import {
  getTimeDepositProducts,
  getMyTimeDeposits,
  openTimeDeposit,
  closeTimeDeposit,
} from '../../api/timeDepositApi'
import {
  getFxRates,
  fxTrade,
  fxConvert,
  getMyFxTrades,
  getMyFxConversions,
  getFxAlerts,
  createFxAlert,
  deleteFxAlert,
} from '../../api/fxApi'
import { getApiErrorMessage } from '../../lib/apiError'
import { usePageTitle } from '../../lib/usePageTitle'
import { digitsOnly, formatIban, formatIbanInput, normalizeIban } from '../../lib/format'
import type {
  Account,
  AccountType,
  BillInquiry,
  Card as BankCard,
  CardStatus,
  CreditCard,
  CreditCardStatus,
  Currency,
  ExchangeRate,
  FxAlertDirection,
  FxTrade,
  FxTradeSide,
  Loan,
  TimeDeposit,
  LoanStatus,
  PaymentStatus,
  SavedRecipient,
  Transaction,
  TransactionHistoryFilters,
} from '../../lib/types'
import { openCardStatement, openCreditCardStatement } from '../../lib/cardStatement'
import { openTransactionReceipt } from '../../lib/transactionReceipt'
import { openAccountStatement } from '../../lib/accountStatement'
import { openFxReceipt } from '../../lib/fxReceipt'
import './Dashboard.css'

const accountTypeOptions = [
  { value: 'Bireysel', label: 'Bireysel Hesap' },
  { value: 'Isletme', label: 'İşletme Hesabı' },
]

const PAGE_SIZE = 5
const CASH_ADVANCE_FEE_RATE = 0.03
const CASH_ADVANCE_MIN_FEE = 50
const CASH_ADVANCE_DAILY_INTEREST_RATE = 0.035 / 30

// İşlem geçmişinde "tüm hesaplar" seçeneğinin özel değeri
const ALL_ACCOUNTS = '__all__'
const FX_RATE_HISTORY_STORAGE_KEY = 'turkcellbank_fx_rate_history'

const txTypeOptions = [
  { value: '', label: 'Tüm işlem tipleri' },
  { value: 'Deposit', label: 'Para yatırma' },
  { value: 'Transfer', label: 'Havale' },
  { value: 'Payment', label: 'Kart ödemesi' },
  { value: 'Refund', label: 'İade' },
  { value: 'LoanDisbursement', label: 'Kredi kullandırımı' },
  { value: 'LoanRepayment', label: 'Kredi taksiti' },
  { value: 'BillPayment', label: 'Fatura ödemesi' },
  { value: 'TimeDepositOpen', label: 'Vadeli mevduat açılışı' },
  { value: 'TimeDepositMaturity', label: 'Vadeli mevduat getirisi' },
  { value: 'FxConvert', label: 'Döviz/altın dönüşüm' },
  { value: 'CreditCardAdvance', label: 'Kredi kartı nakit avans' },
]

const txDirectionOptions = [
  { value: '', label: 'Tüm yönler' },
  { value: 'In', label: 'Gelen' },
  { value: 'Out', label: 'Giden' },
]

// Kredi durumu -> rozet rengi / Türkçe etiket
const loanBadgeVariant = (s: LoanStatus) =>
  s === 'Approved' ? 'success' : s === 'Rejected' ? 'error' : 'warning'
const loanLabel = (s: LoanStatus) =>
  s === 'Approved'
    ? 'Onaylandı'
    : s === 'Rejected'
      ? 'Reddedildi'
      : s === 'PendingApproval'
        ? 'Onay bekliyor'
        : 'Bekliyor'

// Ödeme durumu -> rozet rengi / Türkçe etiket
const paymentBadgeVariant = (s: PaymentStatus) =>
  s === 'Success' ? 'success' : s === 'Failed' ? 'error' : 'info'
const paymentLabel = (s: PaymentStatus) =>
  s === 'Success' ? 'Başarılı' : s === 'Failed' ? 'Başarısız' : 'İade'

// Kart durumu -> rozet rengi / Türkçe etiket
const cardBadgeVariant = (s: CardStatus) =>
  s === 'Approved' ? 'success' : s === 'Rejected' ? 'error' : 'warning'
const cardLabel = (s: CardStatus) =>
  s === 'Approved'
    ? 'Onaylı'
    : s === 'Rejected'
      ? 'Reddedildi'
      : s === 'Blocked'
        ? 'Bloke'
        : 'Bekliyor'

// Kredi kartı durum rozeti
const creditCardLabel = (s: CreditCardStatus) =>
  s === 'Approved'
    ? 'Aktif'
    : s === 'PendingApproval'
      ? 'Onay Bekliyor'
      : s === 'Rejected'
        ? 'Reddedildi'
        : s === 'Blocked'
          ? 'Bloke'
          : 'Bekliyor'

const creditCardBadgeVariant = (s: CreditCardStatus) =>
  s === 'Approved'
    ? 'success'
    : s === 'Rejected' || s === 'Blocked'
      ? 'error'
      : 'warning'

// Kredi kartı ekstre durumu rozeti
const ccStatementLabel = (s: string) =>
  s === 'Paid' ? 'Ödendi' : s === 'Overdue' ? 'Gecikmiş' : s === 'Due' ? 'Ödenecek' : 'Açık'

const ccStatementBadgeVariant = (s: string) =>
  s === 'Paid' ? 'success' : s === 'Overdue' ? 'error' : 'warning'

// Kredi kartı hareket tipi etiketi
const ccTxLabel = (t: string) =>
  t === 'Purchase'
    ? 'Harcama'
    : t === 'Installment'
      ? 'Taksit'
      : t === 'Payment'
        ? 'Ödeme'
        : t === 'Refund'
          ? 'İade'
          : t === 'Fee'
            ? 'Ücret'
            : t === 'Interest'
              ? 'Faiz'
              : 'Nakit Avans'

// İşlem geçmişi satır başlığı (tipe göre)
const txTitle = (tx: Transaction) => {
  if (tx.type === 'Deposit') return 'Para Yatırma'
  if (tx.type === 'Payment') return 'POS Ödemesi'
  if (tx.type === 'Refund') return 'POS İade'
  if (tx.type === 'LoanDisbursement') return 'Kredi Kullandırımı'
  if (tx.type === 'LoanRepayment') return 'Kredi Taksiti'
  if (tx.type === 'BillPayment') return `Fatura${tx.description ? ` · ${tx.description}` : ''}`
  if (tx.type === 'TimeDepositOpen') return 'Vadeli Mevduat Açılışı'
  if (tx.type === 'TimeDepositMaturity') return 'Vadeli Mevduat Getirisi'
  if (tx.type === 'FxBuy') return `Döviz/Altın Alış${tx.description ? ` · ${tx.description}` : ''}`
  if (tx.type === 'FxSell') return `Döviz/Altın Satış${tx.description ? ` · ${tx.description}` : ''}`
  if (tx.type === 'FxConvert') return `Döviz/Altın Dönüşüm${tx.description ? ` · ${tx.description}` : ''}`
  if (tx.type === 'CreditCardPayment') return 'Kredi Kartı Ödemesi'
  if (tx.type === 'CreditCardAdvance') return 'Kredi Kartı Nakit Avans'
  return tx.direction === 'Out'
    ? `Transfer → ${tx.counterpartyIban}`
    : `Transfer ← ${tx.counterpartyIban}`
}

// Para birimi gösterim yardımcıları (döviz/altın hesapları için)
const CURRENCY_META: Record<Currency, { code: string; label: string; unit: string }> = {
  TRY: { code: 'TRY', label: 'Türk Lirası', unit: '₺' },
  USD: { code: 'USD', label: 'ABD Doları', unit: '$' },
  EUR: { code: 'EUR', label: 'Euro', unit: '€' },
  XAU: { code: 'XAU', label: 'Gram Altın', unit: 'gr' },
}

// Döviz/altın miktarını birim etiketiyle biçimle (ör. "100,00 $", "12,50 gr")
const formatCurrencyAmount = (amount: number, currency: Currency) => {
  if (currency === 'TRY') return formatTL(amount)
  const n = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  const meta = CURRENCY_META[currency]
  return currency === 'XAU' ? `${n} ${meta.unit}` : `${meta.unit}${n}`
}

type FxRatePoint = {
  at: number
  value: number
}

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

const trDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

const DAY_MS = 24 * 60 * 60 * 1000

function useAnimatedNumber(value: number, durationMs = 650) {
  const [displayValue, setDisplayValue] = useState(value)
  const displayRef = useRef(value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = displayRef.current
    const diff = value - from

    if (reduceMotion || diff === 0) {
      displayRef.current = value
      setDisplayValue(value)
      return
    }

    const start = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = from + diff * eased
      displayRef.current = next
      setDisplayValue(next)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        displayRef.current = value
        setDisplayValue(value)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [durationMs, value])

  return displayValue
}

function AnimatedMoney({ value, hidden }: { value: number; hidden: boolean }) {
  const animatedValue = useAnimatedNumber(value)
  return <>{hidden ? '₺*****,**' : formatTL(animatedValue)}</>
}

const accountCardVariant = (acc: Account) => {
  if (acc.isFrozen) return 'dashboard-account-card--frozen'
  return acc.accountType === 'Isletme'
    ? 'dashboard-account-card--business'
    : 'dashboard-account-card--personal'
}

function AccountVisualIcon({ type }: { type: AccountType }) {
  if (type === 'Isletme') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 21V8.5L12 4l8 4.5V21" />
        <path d="M8 21v-6h8v6" />
        <path d="M8 11h.01M12 11h.01M16 11h.01" />
      </svg>
    )
  }

  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10.5 12 5l9 5.5" />
      <path d="M5 10.5V19h14v-8.5" />
      <path d="M9 19v-5h6v5" />
      <path d="M8 12h.01M16 12h.01" />
    </svg>
  )
}

const txBalanceEffect = (tx: Transaction) =>
  tx.direction === 'In' ? tx.amount : -tx.amount

type BalanceTrendPoint = {
  at: number
  value: number
}

function buildBalanceTrend(currentBalance: number, transactions: Transaction[]) {
  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const periodStart = todayStart.getTime() - 6 * DAY_MS
  const recentTransactions = transactions
    .map((tx) => ({ tx, at: new Date(tx.createdAt).getTime() }))
    .filter(({ at }) => at >= periodStart && at <= now)
    .sort((a, b) => a.at - b.at)

  const periodEffect = recentTransactions.reduce(
    (sum, { tx }) => sum + txBalanceEffect(tx),
    0,
  )
  let runningBalance = currentBalance - periodEffect
  const points: BalanceTrendPoint[] = [{ at: periodStart, value: runningBalance }]
  const dayAnchors = Array.from(
    { length: 6 },
    (_, index) => periodStart + (index + 1) * DAY_MS,
  ).filter((at) => at <= now)
  const events: Array<{ at: number; tx?: Transaction }> = [
    ...recentTransactions.map(({ tx, at }) => ({ at, tx })),
    ...dayAnchors.map((at) => ({ at })),
    { at: now },
  ].sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at
    return 'tx' in a ? -1 : 1
  })

  events.forEach((event) => {
    if (event.tx) runningBalance += txBalanceEffect(event.tx)
    points.push({ at: event.at, value: runningBalance })
  })

  return points
}

function BalanceSparkline({
  values,
  hidden,
  loading,
}: {
  values: BalanceTrendPoint[]
  hidden: boolean
  loading: boolean
}) {
  const chartValues = hidden
    ? values.map((point) => ({ ...point, value: 0 }))
    : values
  const min = Math.min(...chartValues.map((point) => point.value))
  const max = Math.max(...chartValues.map((point) => point.value))
  const range = max - min || 1
  const startAt = chartValues[0]?.at ?? 0
  const endAt = chartValues[chartValues.length - 1]?.at ?? startAt + 1
  const timeRange = endAt - startAt || 1
  const width = 220
  const height = 54
  const padding = 5
  const points = chartValues
    .map((point) => {
      const x = padding + ((point.at - startAt) / timeRange) * (width - padding * 2)
      const y = height - padding - ((point.value - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')
  const first = values[0]?.value ?? 0
  const last = values[values.length - 1]?.value ?? 0
  const change = last - first

  return (
    <div
      className={`dashboard-sparkline ${loading ? 'is-loading' : ''}`}
      role="img"
      aria-label={hidden ? 'Son 7 gün bakiye eğilimi gizli' : 'Son 7 gün bakiye eğilimi'}
    >
      <div className="dashboard-sparkline-head">
        <span>Son 7 gün</span>
        <strong className={change >= 0 ? 'positive' : 'negative'}>
          {hidden ? 'Gizli' : `${change >= 0 ? '+' : ''}${formatTL(change)}`}
        </strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <polyline className="dashboard-sparkline-area" points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`} />
        <polyline className="dashboard-sparkline-line" points={points} />
      </svg>
    </div>
  )
}

function FxRateSparkline({ points }: { points: FxRatePoint[] }) {
  if (points.length < 2) {
    return <div className="dashboard-fx-mini-chart empty">Trend için veri toplanıyor</div>
  }

  const width = 180
  const height = 44
  const padding = 4
  const min = Math.min(...points.map((p) => p.value))
  const max = Math.max(...points.map((p) => p.value))
  const range = max - min || 1
  const start = points[0].at
  const end = points[points.length - 1].at
  const timeRange = end - start || 1
  const coords = points
    .map((point) => {
      const x = padding + ((point.at - start) / timeRange) * (width - padding * 2)
      const y = height - padding - ((point.value - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')
  const change = points[points.length - 1].value - points[0].value

  return (
    <div
      className={`dashboard-fx-mini-chart ${change >= 0 ? 'up' : 'down'}`}
      aria-label="Kur trendi"
    >
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <polyline points={coords} />
      </svg>
      <span>{change >= 0 ? '+' : ''}{change.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}</span>
    </div>
  )
}

function getCashFlowSummary(transactions: Transaction[]) {
  const income = transactions
    .filter((tx) => tx.direction === 'In')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const expense = transactions
    .filter((tx) => tx.direction === 'Out')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const total = income + expense
  const incomePercent = total > 0 ? Math.round((income / total) * 100) : 50
  const expensePercent = total > 0 ? 100 - incomePercent : 50

  return { income, expense, total, incomePercent, expensePercent }
}

function toStartOfDayIso(date: string) {
  if (!date) return undefined
  return new Date(`${date}T00:00:00`).toISOString()
}

function toEndOfDayIso(date: string) {
  if (!date) return undefined
  return new Date(`${date}T23:59:59.999`).toISOString()
}

function matchesTransactionFilters(
  tx: Transaction,
  filters: TransactionHistoryFilters,
) {
  if (filters.fromDate && new Date(tx.createdAt) < new Date(filters.fromDate)) return false
  if (filters.toDate && new Date(tx.createdAt) > new Date(filters.toDate)) return false
  if (filters.type && tx.type !== filters.type) return false
  if (filters.direction && tx.direction !== filters.direction) return false
  if (filters.minAmount !== undefined && tx.amount < filters.minAmount) return false
  if (filters.maxAmount !== undefined && tx.amount > filters.maxAmount) return false

  const search = filters.search?.trim().toLocaleLowerCase('tr-TR')
  if (!search) return true

  return [
    tx.description,
    tx.counterpartyIban,
    tx.accountIban,
    tx.type,
    tx.channel,
  ].some((value) => value?.toLocaleLowerCase('tr-TR').includes(search))
}

function CashFlowSummary({
  income,
  expense,
  total,
  incomePercent,
  expensePercent,
}: ReturnType<typeof getCashFlowSummary>) {
  return (
    <div className="dashboard-cashflow" aria-label="Gelir gider özeti">
      <span className="dashboard-cashflow-badge">
        {total > 0 ? `%${incomePercent} gelen` : 'Hareket yok'}
      </span>

      <div className="dashboard-cashflow-bar" aria-hidden="true">
        <span
          className="dashboard-cashflow-in"
          style={{ width: `${incomePercent}%` }}
        />
        <span
          className="dashboard-cashflow-out"
          style={{ width: `${expensePercent}%` }}
        />
      </div>

      <div className="dashboard-cashflow-stats">
        <div>
          <span className="dashboard-cashflow-dot in" />
          <p>Gelen</p>
          <strong>{formatTL(income)}</strong>
        </div>
        <div>
          <span className="dashboard-cashflow-dot out" />
          <p>Giden</p>
          <strong>{formatTL(expense)}</strong>
        </div>
      </div>
    </div>
  )
}

function LoanResultMark({ status }: { status: LoanStatus }) {
  const markClass =
    status === 'Approved'
      ? 'success'
      : status === 'Rejected'
        ? 'error'
        : 'pending'
  const symbol =
    status === 'Approved'
      ? '✓'
      : status === 'Rejected'
        ? '×'
        : '↗'

  return (
    <div className={`dashboard-loan-result-mark ${markClass}`} aria-hidden="true">
      {symbol}
    </div>
  )
}

// Saate göre selamlama mesajı (gerçek banka uygulamalarındaki gibi)
function getGreeting(name: string) {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return `Günaydın, ${name} ☀️`
  if (hour >= 12 && hour < 18) return `İyi günler, ${name} 👋`
  if (hour >= 18 && hour < 22) return `İyi akşamlar, ${name} 🌆`
  return `İyi geceler, ${name} 🌙`
}

// Liste yüklenirken gösterilen skeleton satırlar
function ListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-6 w-3/5" />
    </div>
  )
}

// Kayıtlı alıcı için avatar baş harfleri (ör. "Ahmet Yılmaz" -> "AY")
const recipientInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('') || '?'

// Garanti gibi: üstte sekmeler, tek seferde tek bölüm görünür (aşağı kaydırma derdi yok)
const DASHBOARD_TABS = [
  { id: 'accounts', label: 'Hesaplarım' },
  { id: 'transactions', label: 'İşlemler' },
  { id: 'recipients', label: 'Alıcılarım' },
  { id: 'loans', label: 'Krediler' },
  { id: 'cards', label: 'Kartlarım' },
  { id: 'payments', label: 'Ödemeler' },
  { id: 'bills', label: 'Faturalar' },
  { id: 'orders', label: 'Talimatlar' },
  { id: 'deposits', label: 'Vadeli Mevduat' },
  { id: 'fx', label: 'Döviz & Altın' },
  { id: 'security', label: 'Güvenlik' },
] as const
type DashboardTab = (typeof DASHBOARD_TABS)[number]['id']

const DASHBOARD_TAB_GROUPS = [
  { id: 'daily', label: 'Günlük Bankacılık', tabs: ['accounts', 'transactions', 'recipients', 'payments'] },
  { id: 'billing', label: 'Fatura & Talimat', tabs: ['bills', 'orders'] },
  { id: 'products', label: 'Kredi, Kart, Yatırım', tabs: ['loans', 'cards', 'deposits', 'fx'] },
  { id: 'security', label: 'Güvenlik', tabs: ['security'] },
] as const satisfies ReadonlyArray<{
  id: string
  label: string
  tabs: readonly DashboardTab[]
}>

// Kullanıcının görmek istediği sekmeler localStorage'da saklanır (kişiselleştirme)
const TABS_STORAGE_KEY = 'turkcellbank_dashboard_tabs'

export function Dashboard() {
  usePageTitle('Panel')
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const queryClient = useQueryClient()

  // Aktif sekme — varsayılan: Hesaplarım
  const [activeTab, setActiveTab] = useState<DashboardTab>('accounts')

  // Bakiye gizle/göster (göz ikonu) — gerçek banka uygulamalarının standart özelliği
  const [balanceVisible, setBalanceVisible] = useState(true)

  // Görünür sekmeler (kullanıcı ekleyip çıkarabilir; localStorage'da kalıcı)
  const [visibleTabs, setVisibleTabs] = useState<DashboardTab[]>(() => {
    try {
      const raw = localStorage.getItem(TABS_STORAGE_KEY)
      if (raw) {
        const arr = JSON.parse(raw) as DashboardTab[]
        const valid = arr.filter((id) => DASHBOARD_TABS.some((t) => t.id === id))
        if (valid.length > 0) {
          // Kayıttan sonra eklenen yeni sekmeler (örn. Faturalar) de görünsün:
          // eksik varsayılan sekmeleri sona ekle.
          const missing = DASHBOARD_TABS.map((t) => t.id).filter((id) => !valid.includes(id))
          return [...valid, ...missing]
        }
      }
    } catch {
      /* bozuk kayıt -> varsayılana dön */
    }
    return DASHBOARD_TABS.map((t) => t.id)
  })
  const [tabsEditOpen, setTabsEditOpen] = useState(false)

  // Tercihi kaydet.
  useEffect(() => {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(visibleTabs))
  }, [visibleTabs])

  function toggleTab(id: DashboardTab) {
    const next = visibleTabs.includes(id)
      ? visibleTabs.length === 1
        ? visibleTabs
        : visibleTabs.filter((x) => x !== id)
      : [...visibleTabs, id]

    setVisibleTabs(next)
    if (!next.includes(activeTab)) setActiveTab(next[0])
  }

  // Grup ana anahtarı: grup tümüyle açıksa hepsini kapatır; değilse (kısmi/kapalı)
  // gruptaki tüm alt sekmeleri açar. En az bir sekme açık kalmalıdır.
  function toggleTabGroup(groupId: (typeof DASHBOARD_TAB_GROUPS)[number]['id']) {
    const group = DASHBOARD_TAB_GROUPS.find((g) => g.id === groupId)
    if (!group) return
    const ids = group.tabs as readonly DashboardTab[]
    const allOn = ids.every((id) => visibleTabs.includes(id))

    const next = allOn
      ? visibleTabs.filter((id) => !ids.includes(id)) // grubu tamamen kapat
      : [...visibleTabs, ...ids.filter((id) => !visibleTabs.includes(id))] // grubu tamamen aç

    if (next.length === 0) return // en az bir sekme kalmalı
    setVisibleTabs(next)
    if (!next.includes(activeTab)) setActiveTab(next[0])
  }

  const visibleDashboardTabs = DASHBOARD_TABS.filter((t) => visibleTabs.includes(t.id))
  const visibleTabGroups = DASHBOARD_TAB_GROUPS.map((group) => ({
    ...group,
    tabs: group.tabs.filter((id) => visibleTabs.includes(id)),
  })).filter((group) => group.tabs.length > 0)
  const activeTabGroup =
    visibleTabGroups.find((group) => group.tabs.includes(activeTab)) ?? visibleTabGroups[0]
  const activeGroupTabs = visibleDashboardTabs.filter((tab) =>
    activeTabGroup?.tabs.includes(tab.id),
  )

  function selectTabGroup(groupTabs: readonly DashboardTab[]) {
    if (!groupTabs.includes(activeTab)) setActiveTab(groupTabs[0])
  }

  // Profil modalı
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const profileMutation = useMutation({
    mutationFn: () => updateProfile(profileName),
    onSuccess: (res) => {
      if (res.data) updateUser(res.data)
      setProfileOpen(false)
      toast.success('Profil güncellendi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Profil güncellenemedi.')),
  })

  function openProfile() {
    setProfileName(user?.fullName ?? '')
    setProfileOpen(true)
  }

  // --- Şifre değiştir (Güvenlik Merkezi) ---
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  // Yeni şifre iki kez girilir; eşleşmezse uyarı gösterilir (yazım hatası kilidini önler)
  const pwMismatch = confirmPw.length > 0 && newPw !== confirmPw
  const changePwMutation = useMutation({
    mutationFn: () => changePassword(currentPw, newPw),
    onSuccess: () => {
      setPwOpen(false)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      toast.success('Şifreniz güncellendi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Şifre değiştirilemedi.')),
  })

  // Şifre değiştir modalını açar (hem Güvenlik Merkezi hem Profilim'den çağrılır)
  function openPasswordModal() {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setProfileOpen(false)
    setPwOpen(true)
  }

  // --- Kart internet alışverişi aç/kapat (Güvenlik Merkezi) ---
  const [cardShopOpen, setCardShopOpen] = useState(false)
  const cardShopMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setCardOnlineShopping(id, enabled),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      toast.success(res.data?.onlineShoppingEnabled ? 'İnternet alışverişi açıldı.' : 'İnternet alışverişi kapatıldı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  // --- Günlük havale limiti (Güvenlik Merkezi) ---
  const [limitOpen, setLimitOpen] = useState(false)
  const [limitInput, setLimitInput] = useState('')
  const limitMutation = useMutation({
    mutationFn: (limit: number | null) => setTransferLimit(limit),
    onSuccess: (res) => {
      if (res.data) updateUser(res.data)
      setLimitOpen(false)
      toast.success('Havale limiti güncellendi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Limit güncellenemedi.')),
  })

  // --- Bildirimler ---
  const [notifOpen, setNotifOpen] = useState(false)
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  })
  const notifications = notifData?.data ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const markReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markOneReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  function openNotifications() {
    setNotifOpen(true)
  }

  // --- Hesaplar ---
  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })
  const accounts = useMemo(() => data?.data ?? [], [data?.data])
  const balanceAccounts = accounts.filter((a) => a.isActive)
  const activeAccounts = balanceAccounts.filter((a) => !a.isFrozen)
  // "Hesaplarım" yalnız TL (vadesiz) hesapları listeler; döviz/altın hesapları
  // Döviz/Altın sekmesinde ayrı gösterilir (dondurulmuşlar dahil, birim TL).
  const depositoryAccounts = useMemo(
    () => accounts.filter((a) => a.currency === 'TRY'),
    [accounts],
  )

  // --- Döviz/altın kurları (canlı: 15sn'de bir yenilenir) ---
  const { data: ratesData } = useQuery({
    queryKey: ['fx-rates'],
    queryFn: getFxRates,
    refetchInterval: 15_000,
  })
  const { data: fxTradesData, isLoading: fxTradesLoading } = useQuery({
    queryKey: ['fx-trades'],
    queryFn: getMyFxTrades,
    enabled: activeTab === 'fx',
  })
  const { data: fxConversionsData, isLoading: fxConversionsLoading } = useQuery({
    queryKey: ['fx-conversions'],
    queryFn: getMyFxConversions,
    enabled: activeTab === 'fx',
  })
  const { data: fxAlertsData, isLoading: fxAlertsLoading } = useQuery({
    queryKey: ['fx-alerts'],
    queryFn: getFxAlerts,
    enabled: activeTab === 'fx',
  })
  const rates = useMemo(() => ratesData?.data ?? [], [ratesData?.data])
  const fxTrades = fxTradesData?.data ?? []
  const fxConversions = fxConversionsData?.data ?? []
  const fxAlerts = fxAlertsData?.data ?? []
  // İşlem geçmişi: alış/satış + çapraz dönüşüm tek listede (yeniden eskiye, son 8)
  const fxHistory = [
    ...fxTrades.map((t) => ({ kind: 'trade' as const, at: t.createdAt, trade: t })),
    ...fxConversions.map((c) => ({ kind: 'convert' as const, at: c.createdAt, conv: c })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8)
  const [fxRateHistory, setFxRateHistory] = useState<Record<string, FxRatePoint[]>>(() => {
    try {
      const raw = localStorage.getItem(FX_RATE_HISTORY_STORAGE_KEY)
      return raw ? JSON.parse(raw) as Record<string, FxRatePoint[]> : {}
    } catch {
      return {}
    }
  })
  const rateByCurrency = useMemo(() => {
    const map = new Map<Currency, ExchangeRate>()
    for (const r of rates) map.set(r.currency, r)
    return map
  }, [rates])
  useEffect(() => {
    if (rates.length === 0) return

    setFxRateHistory((prev) => {
      const now = Date.now()
      const dayAgo = now - DAY_MS
      const next: Record<string, FxRatePoint[]> = { ...prev }
      for (const rate of rates) {
        const value = Math.round(((rate.buyRate + rate.sellRate) / 2) * 10000) / 10000
        const existing = next[rate.currency] ?? []
        const last = existing[existing.length - 1]
        if (last && last.value === value && now - last.at < 60_000) continue

        next[rate.currency] = [...existing, { at: now, value }]
          .filter((point) => point.at >= dayAgo)
          .slice(-48)
      }

      localStorage.setItem(FX_RATE_HISTORY_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [rates])
  // Bir hesabın TL karşılığı (döviz/altın için banka alış kuruyla çevrilir).
  const tryValueOf = useCallback(
    (a: Account) => (a.currency === 'TRY' ? a.balance : a.balance * (rateByCurrency.get(a.currency)?.buyRate ?? 0)),
    [rateByCurrency],
  )
  const tryAccounts = balanceAccounts.filter((a) => a.currency === 'TRY')
  const fxAccounts = balanceAccounts.filter((a) => a.currency !== 'TRY')
  // Ana bakiye: yalnız TL hesapları (kur oynamasından etkilenmez, gerçek banka gibi).
  const totalBalance = tryAccounts.reduce((sum, a) => sum + a.balance, 0)
  // Döviz/altın portföy değeri: yalnız döviz/altın hesaplarının güncel TL karşılığı.
  const fxPortfolioValue = fxAccounts.reduce((sum, a) => sum + tryValueOf(a), 0)
  // Portföy dağılımı: yalnız döviz/altın birimleri (TL ana bakiyede ayrı gösterilir).
  const portfolioItems = (['USD', 'EUR', 'XAU'] as Currency[])
    .map((currency) => {
      const accountsForCurrency = fxAccounts.filter((a) => a.currency === currency)
      const amount = accountsForCurrency.reduce((sum, a) => sum + a.balance, 0)
      const tryValue = accountsForCurrency.reduce((sum, a) => sum + tryValueOf(a), 0)
      const percent = fxPortfolioValue > 0 ? Math.round((tryValue / fxPortfolioValue) * 100) : 0
      return { currency, amount, tryValue, percent }
    })
    .filter((item) => item.tryValue > 0)
  // Ana bakiye trendi yalnız TL hesap hareketlerinden kurulur (döviz bacakları hariç).
  const balanceHistoryQueries = useQueries({
    queries: tryAccounts.map((a) => ({
      queryKey: ['transactions', a.id],
      queryFn: () => getHistory(a.id),
      staleTime: 30_000,
    })),
  })
  const balanceTrendTransactions = tryAccounts.flatMap(
    (_, i) => balanceHistoryQueries[i]?.data?.data ?? [],
  )
  const balanceTrend = buildBalanceTrend(totalBalance, balanceTrendTransactions)
  const balanceTrendLoading = balanceHistoryQueries.some((q) => q.isLoading)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  // --- Modal durumları ---
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<AccountType>('Bireysel')

  const [depositOpen, setDepositOpen] = useState(false)
  const [depositAccountId, setDepositAccountId] = useState('')
  const [depositAmount, setDepositAmount] = useState('')

  const [transferOpen, setTransferOpen] = useState(false)
  const [fromAccountId, setFromAccountId] = useState('')
  const [toIban, setToIban] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDesc, setTransferDesc] = useState('')
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [saveRecipientAfterTransfer, setSaveRecipientAfterTransfer] = useState(false)
  const [recipientNameAfterTransfer, setRecipientNameAfterTransfer] = useState('')

  const [recipientOpen, setRecipientOpen] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientIban, setRecipientIban] = useState('')
  const [recipientNote, setRecipientNote] = useState('')
  const [deleteRecipientTarget, setDeleteRecipientTarget] = useState<SavedRecipient | null>(null)

  // Hesap kapatma (bakiye aktarımı + bağlı kart silme) ve dondurma onayları
  const [closeTarget, setCloseTarget] = useState<Account | null>(null)
  const [closeDestId, setCloseDestId] = useState('') // bakiyenin aktarılacağı hesap
  const [freezeTarget, setFreezeTarget] = useState<Account | null>(null)

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: (type: AccountType) => createAccount(type),
    onSuccess: () => {
      refresh()
      setCreateOpen(false)
      toast.success('Hesap açıldı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Hesap açılamadı.')),
  })
  const closeMutation = useMutation({
    mutationFn: () =>
      closeAccount(closeTarget!.id, closeDestId || undefined),
    onSuccess: () => {
      refresh()
      queryClient.invalidateQueries({ queryKey: ['cards'] }) // bağlı kartlar silindi
      setCloseTarget(null)
      toast.success('Hesap kapatıldı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Hesap kapatılamadı.')),
  })
  const freezeMutation = useMutation({
    mutationFn: (id: string) => freezeAccount(id),
    onSuccess: () => {
      refresh()
      queryClient.invalidateQueries({ queryKey: ['cards'] }) // bağlı kartlar bloke oldu
      setFreezeTarget(null)
      toast.success('Hesap donduruldu.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Hesap dondurulamadı.')),
  })
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateAccount(id),
    onSuccess: () => {
      refresh()
      queryClient.invalidateQueries({ queryKey: ['cards'] }) // bloke kartlar geri açıldı
      toast.success('Hesap yeniden aktifleştirildi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Hesap aktifleştirilemedi.')),
  })
  const depositMutation = useMutation({
    mutationFn: () => deposit(depositAccountId, Number(depositAmount)),
    onSuccess: () => {
      refresh()
      setDepositOpen(false)
      toast.success('Para yatırıldı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Para yatırılamadı.')),
  })
  const transferMutation = useMutation({
    mutationFn: () =>
      transfer({
        fromAccountId,
        toIban: normalizeIban(toIban),
        amount: Number(transferAmount),
        description: transferDesc || undefined,
      }),
    onSuccess: () => {
      refresh()
      setTransferOpen(false)
      toast.success('Transfer başarılı.')
      if (saveRecipientAfterTransfer && recipientNameAfterTransfer.trim()) {
        saveRecipientMutation.mutate({
          name: recipientNameAfterTransfer.trim(),
          iban: normalizeIban(toIban),
          note: transferDesc || undefined,
        })
      }
      setSaveRecipientAfterTransfer(false)
      setRecipientNameAfterTransfer('')
      setSelectedRecipientId('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Transfer başarısız.')),
  })

  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ['recipients'],
    queryFn: getRecipients,
  })
  const recipients = recipientsData?.data ?? []
  const [recipientSearch, setRecipientSearch] = useState('')
  const filteredRecipients = recipients.filter((r) => {
    const q = recipientSearch.trim().toLocaleLowerCase('tr-TR')
    if (!q) return true
    return (
      r.name.toLocaleLowerCase('tr-TR').includes(q)
      || r.iban.toLocaleLowerCase('tr-TR').includes(q)
      || (r.note ?? '').toLocaleLowerCase('tr-TR').includes(q)
    )
  })
  const selectedRecipient = recipients.find((r) => r.id === selectedRecipientId)
  const normalizedTransferIban = normalizeIban(toIban)
  const transferIbanAlreadySaved = recipients.some((r) => r.iban === normalizedTransferIban)
  const showSaveRecipientOption =
    normalizedTransferIban.length === 26 && !selectedRecipient && !transferIbanAlreadySaved

  const saveRecipientMutation = useMutation({
    mutationFn: createRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] })
      setRecipientOpen(false)
      setRecipientName('')
      setRecipientIban('')
      setRecipientNote('')
      toast.success('Alıcı kaydedildi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Alıcı kaydedilemedi.')),
  })

  const deleteRecipientMutation = useMutation({
    mutationFn: (id: string) => deleteRecipient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] })
      setDeleteRecipientTarget(null)
      toast.success('Alıcı silindi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Alıcı silinemedi.')),
  })

  // --- İşlem geçmişi (seçili hesap ya da tüm hesaplar) ---
  const [historyAccountId, setHistoryAccountId] = useState(ALL_ACCOUNTS)
  const [txVisible, setTxVisible] = useState(PAGE_SIZE)
  const [txFromDate, setTxFromDate] = useState('')
  const [txToDate, setTxToDate] = useState('')
  const [txType, setTxType] = useState<TransactionHistoryFilters['type']>('')
  const [txDirection, setTxDirection] = useState<TransactionHistoryFilters['direction']>('')
  const [txMinAmount, setTxMinAmount] = useState('')
  const [txMaxAmount, setTxMaxAmount] = useState('')
  const [txSearch, setTxSearch] = useState('')
  const [txFilterOpen, setTxFilterOpen] = useState(false)

  const isAllAccounts = historyAccountId === ALL_ACCOUNTS

  // Tek hesap seçilirse ek geçmiş sorgusu yalnız İşlemler sekmesinde çalışsın.
  // Tüm Hesaplar görünümü üst özet için zaten çekilen hesap geçmişlerini kullanır.
  const txTabActive = activeTab === 'transactions'
  const txFilters: TransactionHistoryFilters = {
    fromDate: toStartOfDayIso(txFromDate),
    toDate: toEndOfDayIso(txToDate),
    type: txType,
    direction: txDirection,
    minAmount: txMinAmount ? Number(txMinAmount) : undefined,
    maxAmount: txMaxAmount ? Number(txMaxAmount) : undefined,
    search: txSearch.trim() || undefined,
    page: 1,
    pageSize: txVisible,
  }
  const hasTxFilters = Boolean(
    txFromDate
      || txToDate
      || txType
      || txDirection
      || txMinAmount
      || txMaxAmount
      || txSearch.trim(),
  )
  const activeTxFilterCount = [
    txFromDate,
    txToDate,
    txType,
    txDirection,
    txMinAmount,
    txMaxAmount,
    txSearch.trim(),
  ].filter(Boolean).length

  useEffect(() => {
    setTxVisible(PAGE_SIZE)
  }, [historyAccountId, txFromDate, txToDate, txType, txDirection, txMinAmount, txMaxAmount, txSearch])

  // Tek hesap görünümü
  const { data: historyPageData, isLoading: historyLoading } = useQuery({
    queryKey: ['transactions', historyAccountId, txFilters],
    queryFn: () => getHistoryPage(historyAccountId, txFilters),
    enabled: txTabActive && !!historyAccountId && !isAllAccounts,
  })

  // Birleşik liste: her işlemi ait olduğu hesabın IBAN'ı ile etiketle, tarihe göre sırala
  type HistoryRow = Transaction & { accountIban?: string | null }
  const mergedHistory: HistoryRow[] = isAllAccounts
    ? balanceAccounts
        .flatMap((a, i) =>
          (balanceHistoryQueries[i]?.data?.data ?? []).map((tx) => ({
            ...tx,
            accountIban: a.iban,
          })),
        )
        .sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))
    : []

  const filteredMergedHistory = mergedHistory.filter((tx) =>
    matchesTransactionFilters(tx, txFilters),
  )
  const history: HistoryRow[] = isAllAccounts
    ? filteredMergedHistory
    : (historyPageData?.data?.items ?? [])
  const visibleHistory = isAllAccounts ? history.slice(0, txVisible) : history
  const historyBusy = isAllAccounts
    ? balanceTrendLoading
    : historyLoading
  const cashFlowSummary = getCashFlowSummary(balanceTrendTransactions)
  const historyIncome = isAllAccounts
    ? history.filter((tx) => tx.direction === 'In').reduce((sum, tx) => sum + tx.amount, 0)
    : (historyPageData?.data?.incomeTotal ?? 0)
  const historyExpense = isAllAccounts
    ? history.filter((tx) => tx.direction === 'Out').reduce((sum, tx) => sum + tx.amount, 0)
    : (historyPageData?.data?.expenseTotal ?? 0)
  const historyTotalCount = isAllAccounts
    ? history.length
    : (historyPageData?.data?.totalCount ?? 0)
  const historyHasMore = isAllAccounts
    ? history.length > txVisible
    : historyTotalCount > txVisible

  // --- Krediler ---
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: getMyLoans,
  })
  const loans = loansData?.data ?? []

  const [loanOpen, setLoanOpen] = useState(false)
  const [loanNationalId, setLoanNationalId] = useState('')
  const registeredNationalId = user?.nationalId ?? ''
  const [loanAge, setLoanAge] = useState('')
  const [loanMarital, setLoanMarital] = useState<'Single' | 'Married'>('Single')
  const [loanChildren, setLoanChildren] = useState('0')
  const [loanHousing, setLoanHousing] = useState<'Tenant' | 'Owner'>('Tenant')
  const [loanIncome, setLoanIncome] = useState('')
  const [loanExpenses, setLoanExpenses] = useState('')
  const [loanEmployment, setLoanEmployment] = useState('')
  const [loanProfession, setLoanProfession] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [loanTerm, setLoanTerm] = useState('12')
  const [loanAccountId, setLoanAccountId] = useState('') // kredinin yatırılacağı hesap

  // Başvuru sonucu (onay/red + gerekçe) modalı. Kredilerim'den de açılır.
  const [resultLoan, setResultLoan] = useState<Loan | null>(null)

  const applyMutation = useMutation({
    mutationFn: () =>
      applyLoan({
        nationalId: loanNationalId.trim(),
        age: Number(loanAge),
        maritalStatus: loanMarital,
        childrenCount: Number(loanChildren),
        housingStatus: loanHousing,
        income: Number(loanIncome),
        monthlyExpenses: Number(loanExpenses),
        employmentMonths: Number(loanEmployment),
        profession: loanProfession,
        amount: Number(loanAmount),
        termMonths: Number(loanTerm),
        disbursementAccountId: loanAccountId,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] }) // onaylanırsa para yatar
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      if (res.data) setResultLoan(res.data) // sonuç modalını aç
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Başvuru yapılamadı.')),
  })

  function openLoanApply() {
    setLoanNationalId(registeredNationalId)
    setLoanAge('')
    setLoanMarital('Single')
    setLoanChildren('0')
    setLoanHousing('Tenant')
    setLoanIncome('')
    setLoanExpenses('')
    setLoanEmployment('')
    setLoanProfession('')
    setLoanAmount('')
    setLoanTerm('12')
    setLoanAccountId(activeAccounts[0]?.id ?? '')
    setLoanOpen(true)
  }

  function submitLoan() {
    if (!/^\d{11}$/.test(loanNationalId.trim())) {
      toast.error('TC kimlik numarası 11 haneli olmalı.')
      return
    }
    if (!loanAge || !loanIncome || !loanAmount || !loanProfession.trim()) {
      toast.error('Lütfen zorunlu alanları doldurun.')
      return
    }
    if (!loanAccountId) {
      toast.error('Kredinin yatırılacağı hesabı seçin.')
      return
    }
    setLoanOpen(false) // formu kapat -> "değerlendiriliyor" ekranı görünsün
    applyMutation.mutate()
  }

  // Taksit ödeme modalı (onaylı kredi)
  const [payLoan, setPayLoan] = useState<Loan | null>(null)
  const [payLoanAccountId, setPayLoanAccountId] = useState('')
  const payInstallmentMutation = useMutation({
    mutationFn: () => payInstallment(payLoan!.id, payLoanAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setPayLoan(null)
      toast.success('Taksit ödendi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Taksit ödenemedi.')),
  })
  function openPayInstallment(loan: Loan) {
    setPayLoan(loan)
    setPayLoanAccountId(activeAccounts[0]?.id ?? '')
  }

  // Ödeme planı modalı (onaylı kredi detayı)
  const [planLoanId, setPlanLoanId] = useState<string | null>(null)
  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ['loan', planLoanId],
    queryFn: () => getLoanDetail(planLoanId!),
    enabled: !!planLoanId,
  })
  const planLoan = planData?.data ?? null

  // --- Kartlar ---
  const { data: cardsData, isLoading: cardsLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: getMyCards,
  })
  const cards = cardsData?.data ?? []
  const approvedCards = cards.filter((c) => c.status === 'Approved')
  // Kartın bağlı olduğu hesabın bakiyesi (ödeme o hesaptan çekilir)
  const cardBalance = (accountIban: string) =>
    accounts.find((a) => a.iban === accountIban)?.balance ?? 0
  // Ödeme kartları: parası olan kartlar önce, bakiyeye göre azalan sırada
  const sortedPayCards = [...approvedCards].sort(
    (a, b) => cardBalance(b.accountIban) - cardBalance(a.accountIban),
  )

  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [cardAccountId, setCardAccountId] = useState('')

  // Kart ekstresi (PDF) modalı
  const [statementCard, setStatementCard] = useState<BankCard | null>(null)
  const [statementMonth, setStatementMonth] = useState('') // 'YYYY-MM'
  const createCardMutation = useMutation({
    mutationFn: () => createCard(cardAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      setCardModalOpen(false)
      toast.success('Kart başvurunuz alındı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Kart açılamadı.')),
  })

  function openCardModal() {
    setCardAccountId(activeAccounts[0]?.id ?? '')
    setCardModalOpen(true)
  }

  // --- Kredi Kartı ---
  const { data: creditCardsData, isLoading: creditCardsLoading } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: getMyCreditCards,
    enabled: activeTab === 'cards' || activeTab === 'payments',
  })
  const creditCards = useMemo(() => creditCardsData?.data ?? [], [creditCardsData?.data])
  // MVP: müşteri başına tek kart; ilk kredi kartını ana kart kabul et
  const creditCard = creditCards[0] ?? null
  const activeCreditCard =
    creditCard && creditCard.status === 'Approved' ? creditCard : null

  const { data: ccStatementsData, isLoading: ccStatementsLoading } = useQuery({
    queryKey: ['credit-card-statements', creditCard?.id],
    queryFn: () => getCreditCardStatements(creditCard!.id),
    enabled: activeTab === 'cards' && !!creditCard,
  })
  const ccStatements = ccStatementsData?.data ?? []
  const currentStatement = ccStatements.find((s) => s.status === 'Due' || s.status === 'Overdue') ?? null

  const { data: ccTxData, isLoading: ccTxLoading } = useQuery({
    queryKey: ['credit-card-transactions', creditCard?.id],
    queryFn: () => getCreditCardTransactions(creditCard!.id),
    enabled: activeTab === 'cards' && !!creditCard,
  })
  const ccTransactions = ccTxData?.data ?? []

  const { data: ccLimitRequestsData, isLoading: ccLimitRequestsLoading } = useQuery({
    queryKey: ['credit-card-limit-requests', creditCard?.id],
    queryFn: () => getCreditCardLimitIncreaseRequests(creditCard!.id),
    enabled: activeTab === 'cards' && !!creditCard,
  })
  const ccLimitRequests = ccLimitRequestsData?.data ?? []

  // Başvuru modalı (gelir/gider profili + kesim günü)
  const [ccApplyOpen, setCcApplyOpen] = useState(false)
  const [ccNationalId, setCcNationalId] = useState('')
  const [ccAge, setCcAge] = useState('')
  const [ccMarital, setCcMarital] = useState<'Single' | 'Married'>('Single')
  const [ccChildren, setCcChildren] = useState('0')
  const [ccHousing, setCcHousing] = useState<'Tenant' | 'Owner'>('Tenant')
  const [ccIncome, setCcIncome] = useState('')
  const [ccExpenses, setCcExpenses] = useState('')
  const [ccEmployment, setCcEmployment] = useState('')
  const [ccProfession, setCcProfession] = useState('')
  const [ccStatementDay, setCcStatementDay] = useState('1')
  const [resultCreditCard, setResultCreditCard] = useState<CreditCard | null>(null)

  const ccApplyMutation = useMutation({
    mutationFn: () =>
      applyCreditCard({
        nationalId: ccNationalId.trim(),
        age: Number(ccAge),
        maritalStatus: ccMarital,
        childrenCount: Number(ccChildren),
        housingStatus: ccHousing,
        income: Number(ccIncome),
        monthlyExpenses: Number(ccExpenses),
        employmentMonths: Number(ccEmployment),
        profession: ccProfession,
        statementDay: Number(ccStatementDay),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      if (res.data) setResultCreditCard(res.data)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Başvuru yapılamadı.')),
  })

  function openCcApply() {
    setCcNationalId(registeredNationalId)
    setCcAge('')
    setCcMarital('Single')
    setCcChildren('0')
    setCcHousing('Tenant')
    setCcIncome('')
    setCcExpenses('')
    setCcEmployment('')
    setCcProfession('')
    setCcStatementDay('1')
    setCcApplyOpen(true)
  }

  function submitCcApply() {
    if (!/^\d{11}$/.test(ccNationalId.trim())) {
      toast.error('TC kimlik numarası 11 haneli olmalı.')
      return
    }
    if (!ccAge || !ccIncome || !ccProfession.trim()) {
      toast.error('Lütfen zorunlu alanları doldurun.')
      return
    }
    setCcApplyOpen(false)
    ccApplyMutation.mutate()
  }

  // Borç öde modalı (Tamamı / Asgari / Tutar gir)
  const [ccPayOpen, setCcPayOpen] = useState(false)
  const [ccPayAccountId, setCcPayAccountId] = useState('')
  const [ccPayAmount, setCcPayAmount] = useState('')
  const tryPayAccounts = useMemo(
    () => activeAccounts.filter((a) => a.currency === 'TRY'),
    [activeAccounts],
  )

  const ccPayMutation = useMutation({
    mutationFn: () =>
      payCreditCard(creditCard!.id, {
        sourceAccountId: ccPayAccountId,
        amount: Number(ccPayAmount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      queryClient.invalidateQueries({ queryKey: ['credit-card-statements', creditCard?.id] })
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions', creditCard?.id] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setCcPayOpen(false)
      toast.success('Ödemeniz alındı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Ödeme başarısız.')),
  })

  function openCcPay() {
    setCcPayAccountId(tryPayAccounts[0]?.id ?? '')
    // Varsayılan: güncel ekstre borcu (yoksa tüm güncel borç)
    setCcPayAmount(
      currentStatement
        ? String(currentStatement.remainingAmount)
        : creditCard
          ? String(creditCard.currentDebt)
          : '',
    )
    setCcPayOpen(true)
  }

  // Nakit avans modalı
  const [ccCashOpen, setCcCashOpen] = useState(false)
  const [ccCashAccountId, setCcCashAccountId] = useState('')
  const [ccCashAmount, setCcCashAmount] = useState('')
  const ccCashPrincipal = Number(ccCashAmount)
  const ccCashFee = ccCashPrincipal > 0
    ? Math.max(ccCashPrincipal * CASH_ADVANCE_FEE_RATE, CASH_ADVANCE_MIN_FEE)
    : 0
  const ccCashInterest = ccCashPrincipal > 0
    ? ccCashPrincipal * CASH_ADVANCE_DAILY_INTEREST_RATE
    : 0
  const ccCashDebtIncrease = ccCashPrincipal + ccCashFee + ccCashInterest

  const ccCashMutation = useMutation({
    mutationFn: () =>
      cashAdvanceCreditCard(creditCard!.id, {
        targetAccountId: ccCashAccountId,
        amount: Number(ccCashAmount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions', creditCard?.id] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setCcCashOpen(false)
      toast.success('Nakit avans hesabınıza aktarıldı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Nakit avans kullanılamadı.')),
  })

  function openCcCashAdvance() {
    setCcCashAccountId(tryPayAccounts[0]?.id ?? '')
    setCcCashAmount('')
    setCcCashOpen(true)
  }

  function submitCcCashAdvance() {
    if (!activeCreditCard) return
    if (!ccCashAccountId || !(ccCashPrincipal > 0)) {
      toast.error('Lütfen hesap ve tutar seçin.')
      return
    }
    if (ccCashDebtIncrease > activeCreditCard.availableLimit) {
      toast.error(
        `Komisyon ve faiz dahil toplam borç ${formatTL(ccCashDebtIncrease)}. ` +
        `Kullanılabilir limitiniz ${formatTL(activeCreditCard.availableLimit)}.`,
      )
      return
    }
    ccCashMutation.mutate()
  }

  // Limit artış talebi modalı
  const [ccLimitOpen, setCcLimitOpen] = useState(false)
  const [ccLimitRequested, setCcLimitRequested] = useState('')
  const [ccLimitAge, setCcLimitAge] = useState('')
  const [ccLimitMarital, setCcLimitMarital] = useState<'Single' | 'Married'>('Single')
  const [ccLimitChildren, setCcLimitChildren] = useState('0')
  const [ccLimitHousing, setCcLimitHousing] = useState<'Tenant' | 'Owner'>('Tenant')
  const [ccLimitIncome, setCcLimitIncome] = useState('')
  const [ccLimitExpenses, setCcLimitExpenses] = useState('')
  const [ccLimitEmployment, setCcLimitEmployment] = useState('')
  const [ccLimitProfession, setCcLimitProfession] = useState('')

  const ccLimitMutation = useMutation({
    mutationFn: () =>
      requestCreditCardLimitIncrease(creditCard!.id, {
        requestedLimit: Number(ccLimitRequested),
        age: Number(ccLimitAge),
        maritalStatus: ccLimitMarital,
        childrenCount: Number(ccLimitChildren),
        housingStatus: ccLimitHousing,
        income: Number(ccLimitIncome),
        monthlyExpenses: Number(ccLimitExpenses),
        employmentMonths: Number(ccLimitEmployment),
        profession: ccLimitProfession,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      queryClient.invalidateQueries({ queryKey: ['credit-card-limit-requests', creditCard?.id] })
      setCcLimitOpen(false)
      toast.success(res.data?.status === 'PendingApproval' ? 'Talebiniz onaya gönderildi.' : 'Limit artış talebiniz sonuçlandı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Limit artış talebi oluşturulamadı.')),
  })

  function openCcLimitIncrease() {
    setCcLimitRequested(creditCard ? String(Math.min(creditCard.creditLimit + 10000, 200000)) : '')
    setCcLimitAge('')
    setCcLimitMarital('Single')
    setCcLimitChildren('0')
    setCcLimitHousing('Tenant')
    setCcLimitIncome('')
    setCcLimitExpenses('')
    setCcLimitEmployment('')
    setCcLimitProfession('')
    setCcLimitOpen(true)
  }

  function submitCcLimitIncrease() {
    if (!ccLimitRequested || !ccLimitAge || !ccLimitIncome || !ccLimitProfession.trim()) {
      toast.error('Lütfen zorunlu alanları doldurun.')
      return
    }
    ccLimitMutation.mutate()
  }

  function generateCreditCardStatementPdf(statementId: string) {
    if (!creditCard) return
    const statement = ccStatements.find((s) => s.id === statementId)
    if (!statement) return
    const ok = openCreditCardStatement({
      card: creditCard,
      statement,
      transactions: ccTransactions.filter((t) => t.statementId === statement.id),
      customerName: user?.fullName ?? 'Müşteri',
    })
    if (!ok) toast.error('PDF penceresi açılamadı. Pop-up engelleyiciyi kontrol edin.')
  }

  const ccOnlineShoppingMutation = useMutation({
    mutationFn: (enabled: boolean) => setCreditCardOnlineShopping(creditCard!.id, enabled),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      toast.success(
        res.data?.onlineShoppingEnabled
          ? 'İnternet alışverişi açıldı.'
          : 'İnternet alışverişi kapatıldı.',
      )
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  // --- Sanal POS (ödemeler) ---
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: getMyPayments,
  })
  const payments = paymentsData?.data ?? []
  const [payVisible, setPayVisible] = useState(PAGE_SIZE)

  // Kart ekstresi: son 12 ay seçeneği (YYYY-MM)
  const statementMonthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    return { value, label }
  })

  function openStatement(card: BankCard) {
    setStatementCard(card)
    setStatementMonth(statementMonthOptions[0].value)
  }

  function generateStatement() {
    if (!statementCard) return
    const [y, m] = statementMonth.split('-').map(Number)
    const monthPayments = payments.filter((p) => {
      if (p.cardId !== statementCard.id) return false
      const d = new Date(p.createdAt)
      return d.getFullYear() === y && d.getMonth() === m - 1
    })
    const ok = openCardStatement({
      card: statementCard,
      payments: monthPayments,
      year: y,
      month: m - 1,
      customerName: user?.fullName ?? '',
    })
    if (!ok) toast.error('Açılır pencere engellendi. Lütfen pop-up iznine bakın.')
    setStatementCard(null)
  }

  function openReceipt(tx: HistoryRow, accountIban?: string | null) {
    const ok = openTransactionReceipt({
      transaction: tx,
      customerName: user?.fullName ?? '',
      accountIban,
    })
    if (!ok) toast.error('Açılır pencere engellendi. Lütfen pop-up iznine bakın.')
  }

  function clearTransactionFilters() {
    setTxFromDate('')
    setTxToDate('')
    setTxType('')
    setTxDirection('')
    setTxMinAmount('')
    setTxMaxAmount('')
    setTxSearch('')
  }

  function generateAccountStatement() {
    const account = accounts.find((a) => a.id === historyAccountId)
    const accountLabel = isAllAccounts
      ? 'Tüm Hesaplar'
      : account
        ? `${account.accountType} Hesap · ...${account.iban.slice(-4)}`
        : 'Seçili Hesap'
    const ok = openAccountStatement({
      customerName: user?.fullName ?? '',
      accountLabel,
      accountIban: isAllAccounts ? null : account?.iban,
      transactions: history,
      fromDate: txFromDate || undefined,
      toDate: txToDate || undefined,
    })
    if (!ok) toast.error('Açılır pencere engellendi. Lütfen pop-up iznine bakın.')
  }

  const [payOpen, setPayOpen] = useState(false)
  const [payStep, setPayStep] = useState<'form' | '3ds'>('form')
  const [payInstrument, setPayInstrument] = useState<'debit' | 'credit'>('debit')
  const [payCardId, setPayCardId] = useState('')
  const [payInstallments, setPayInstallments] = useState('1')
  const [payAmount, setPayAmount] = useState('')
  const [payDesc, setPayDesc] = useState('')
  const [threeDS, setThreeDS] = useState('')

  const payMutation = useMutation({
    mutationFn: () =>
      payInstrument === 'credit'
        ? pay({
            instrument: 'credit',
            creditCardId: activeCreditCard!.id,
            installments: Number(payInstallments),
            amount: Number(payAmount),
            threeDSCode: threeDS,
            description: payDesc || undefined,
          })
        : pay({
            instrument: 'debit',
            cardId: payCardId,
            amount: Number(payAmount),
            threeDSCode: threeDS,
            description: payDesc || undefined,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      setPayOpen(false)
      toast.success('Ödeme başarılı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Ödeme başarısız.')),
  })

  function openPay() {
    setPayStep('form')
    // Onaylı banka kartı yoksa ve kredi kartı varsa doğrudan kredi kartına düş
    setPayInstrument(approvedCards.length === 0 && activeCreditCard ? 'credit' : 'debit')
    // Varsayılan: bakiyesi olan kartlardan en yükseği (yoksa ilk onaylı kart)
    const funded = sortedPayCards.find((c) => cardBalance(c.accountIban) > 0)
    setPayCardId(funded?.id ?? sortedPayCards[0]?.id ?? '')
    setPayInstallments('1')
    setPayAmount('')
    setPayDesc('')
    setThreeDS('')
    setPayOpen(true)
  }

  // --- Fatura ödeme ---
  const { data: billersData } = useQuery({
    queryKey: ['billers'],
    queryFn: getBillers,
    staleTime: Infinity, // katalog sabit, tekrar çekme
  })
  const billers = useMemo(() => billersData?.data ?? [], [billersData?.data])

  const { data: myBillsData, isLoading: billsLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: getMyBills,
  })
  const myBills = myBillsData?.data ?? []
  const [billVisible, setBillVisible] = useState(PAGE_SIZE)

  const BILL_CATEGORIES: { value: string; label: string }[] = [
    { value: 'Elektrik', label: 'Elektrik' },
    { value: 'Su', label: 'Su' },
    { value: 'Dogalgaz', label: 'Doğalgaz' },
    { value: 'Telefon', label: 'Telefon / GSM' },
    { value: 'Internet', label: 'İnternet' },
  ]

  const [billOpen, setBillOpen] = useState(false)
  const [billCategory, setBillCategory] = useState('Elektrik')
  const [billerCode, setBillerCode] = useState('')
  const [subscriberNo, setSubscriberNo] = useState('')
  const [billInquiry, setBillInquiry] = useState<BillInquiry | null>(null)
  const [billAccountId, setBillAccountId] = useState('')

  // Seçili kategorinin kurumları
  const categoryBillers = useMemo(
    () => billers.filter((b) => b.category === billCategory),
    [billers, billCategory],
  )

  const inquireMutation = useMutation({
    mutationFn: () => inquireBill({ billerCode, subscriberNo }),
    onSuccess: (res) => {
      if (res.data) setBillInquiry(res.data)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Fatura sorgulanamadı.')),
  })

  const payBillMutation = useMutation({
    mutationFn: () => payBill({ billerCode, subscriberNo, accountId: billAccountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setBillOpen(false)
      toast.success('Fatura ödendi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Fatura ödenemedi.')),
  })

  function openBillPay() {
    setBillCategory('Elektrik')
    setBillerCode('')
    setSubscriberNo('')
    setBillInquiry(null)
    setBillAccountId(activeAccounts[0]?.id ?? '')
    setBillOpen(true)
  }

  // Kategori değişince kurum seçimini ve sorgu sonucunu sıfırla
  function changeBillCategory(category: string) {
    setBillCategory(category)
    setBillerCode('')
    setBillInquiry(null)
  }

  // --- Düzenli ödeme talimatları ---
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['payment-orders'],
    queryFn: getPaymentOrders,
  })
  const orders = ordersData?.data ?? []

  const [orderOpen, setOrderOpen] = useState(false)
  const [orderType, setOrderType] = useState<'AutoBill' | 'RecurringTransfer'>('AutoBill')
  const [orderName, setOrderName] = useState('')
  const [orderAccountId, setOrderAccountId] = useState('')
  const [orderDay, setOrderDay] = useState('1')
  // AutoBill alanları
  const [orderCategory, setOrderCategory] = useState('Elektrik')
  const [orderBillerCode, setOrderBillerCode] = useState('')
  const [orderSubscriberNo, setOrderSubscriberNo] = useState('')
  // RecurringTransfer alanları
  const [orderTargetIban, setOrderTargetIban] = useState('')
  const [orderAmount, setOrderAmount] = useState('')

  const orderCategoryBillers = useMemo(
    () => billers.filter((b) => b.category === orderCategory),
    [billers, orderCategory],
  )

  const createOrderMutation = useMutation({
    mutationFn: () =>
      createPaymentOrder({
        type: orderType,
        name: orderName.trim(),
        sourceAccountId: orderAccountId,
        dayOfMonth: Number(orderDay),
        ...(orderType === 'AutoBill'
          ? { billerCode: orderBillerCode, subscriberNo: orderSubscriberNo }
          : { targetIban: normalizeIban(orderTargetIban), amount: Number(orderAmount) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] })
      setOrderOpen(false)
      toast.success('Talimat oluşturuldu.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Talimat oluşturulamadı.')),
  })

  const toggleOrderMutation = useMutation({
    mutationFn: (vars: { id: string; isActive: boolean }) =>
      setPaymentOrderActive(vars.id, vars.isActive),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] })
      toast.success(res.message ?? 'Güncellendi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => deletePaymentOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] })
      toast.success('Talimat silindi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Talimat silinemedi.')),
  })

  function openOrderCreate() {
    setOrderType('AutoBill')
    setOrderName('')
    setOrderAccountId(activeAccounts[0]?.id ?? '')
    setOrderDay('1')
    setOrderCategory('Elektrik')
    setOrderBillerCode('')
    setOrderSubscriberNo('')
    setOrderTargetIban('')
    setOrderAmount('')
    setOrderOpen(true)
  }

  // Talimat oluşturma butonu için basit doğrulama
  const orderFormValid =
    orderName.trim().length > 0 &&
    orderAccountId !== '' &&
    (orderType === 'AutoBill'
      ? orderBillerCode !== '' && orderSubscriberNo.length >= 6
      : normalizeIban(orderTargetIban).length === 26 && Number(orderAmount) > 0)

  // --- Vadeli mevduat ---
  const { data: depositProductsData } = useQuery({
    queryKey: ['time-deposit-products'],
    queryFn: getTimeDepositProducts,
    staleTime: Infinity,
  })
  const depositProducts = depositProductsData?.data ?? []

  const { data: myDepositsData, isLoading: depositsLoading } = useQuery({
    queryKey: ['time-deposits'],
    queryFn: getMyTimeDeposits,
  })
  const myDeposits = myDepositsData?.data ?? []

  const [timeDepositOpen, setTimeDepositOpen] = useState(false)
  const [timeDepositAccountId, setTimeDepositAccountId] = useState('')
  const [depositPrincipal, setDepositPrincipal] = useState('')
  const [depositTerm, setDepositTerm] = useState('')
  const [closeDepositTarget, setCloseDepositTarget] = useState<TimeDeposit | null>(null)

  const selectedDepositProduct = depositProducts.find(
    (p) => String(p.termDays) === depositTerm,
  )

  // Açılış öncesi net getiri önizlemesi (backend ile aynı basit faiz formülü)
  const depositPreview = useMemo(() => {
    const principal = Number(depositPrincipal)
    if (!selectedDepositProduct || !(principal > 0)) return null
    const gross =
      Math.round(principal * selectedDepositProduct.annualRate * selectedDepositProduct.termDays / 365 * 100) / 100
    const withholding = Math.round(gross * 0.075 * 100) / 100
    const net = gross - withholding
    return { gross, withholding, net, total: principal + net }
  }, [depositPrincipal, selectedDepositProduct])

  const openDepositMutation = useMutation({
    mutationFn: () =>
      openTimeDeposit({
        sourceAccountId: timeDepositAccountId,
        principal: Number(depositPrincipal),
        termDays: Number(depositTerm),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setTimeDepositOpen(false)
      toast.success('Vadeli mevduat açıldı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Vadeli mevduat açılamadı.')),
  })

  const closeDepositMutation = useMutation({
    mutationFn: (id: string) => closeTimeDeposit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setCloseDepositTarget(null)
      toast.success('Vadeli mevduat bozuldu; anapara hesabınıza döndü.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Mevduat bozulamadı.')),
  })

  function openDepositCreate() {
    setTimeDepositAccountId(activeAccounts[0]?.id ?? '')
    setDepositPrincipal('')
    setDepositTerm(depositProducts[0] ? String(depositProducts[0].termDays) : '')
    setTimeDepositOpen(true)
  }

  // --- Döviz & Altın alış/satış ---
  const [fxOpen, setFxOpen] = useState(false)
  const [fxSide, setFxSide] = useState<FxTradeSide>('Buy')
  const [fxCurrency, setFxCurrency] = useState<Currency>('USD')
  const [fxTryAccountId, setFxTryAccountId] = useState('')
  const [fxAmount, setFxAmount] = useState('')
  const [fxAlertOpen, setFxAlertOpen] = useState(false)
  const [fxAlertCurrency, setFxAlertCurrency] = useState<Currency>('USD')
  const [fxAlertDirection, setFxAlertDirection] = useState<FxAlertDirection>('Above')
  const [fxAlertTarget, setFxAlertTarget] = useState('')
  const [fxConvertOpen, setFxConvertOpen] = useState(false)
  const [fxConvertFrom, setFxConvertFrom] = useState<Currency>('USD')
  const [fxConvertTo, setFxConvertTo] = useState<Currency>('EUR')
  const [fxConvertAmount, setFxConvertAmount] = useState('')

  const fxRate = rateByCurrency.get(fxCurrency)
  // Önizleme: alışta satış kuru, satışta alış kuru; TL karşılığı = miktar * kur.
  const fxPreview = useMemo(() => {
    const amount = Number(fxAmount)
    if (!fxRate || !(amount > 0)) return null
    const rate = fxSide === 'Buy' ? fxRate.sellRate : fxRate.buyRate
    const tryAmount = Math.round(amount * rate * 100) / 100
    return { rate, tryAmount }
  }, [fxAmount, fxRate, fxSide])

  // Satışta o para biriminden hesabın mevcut bakiyesi (yeterlilik göstergesi)
  const fxSellableBalance = fxAccounts.find((a) => a.currency === fxCurrency)?.balance ?? 0
  const fxConvertibleAccounts = fxAccounts.filter((a) => a.balance > 0)
  const fxConvertSourceBalance = fxAccounts.find((a) => a.currency === fxConvertFrom)?.balance ?? 0
  const fxConvertPreview = useMemo(() => {
    const amount = Number(fxConvertAmount)
    const fromRate = rateByCurrency.get(fxConvertFrom)
    const toRate = rateByCurrency.get(fxConvertTo)
    if (!fromRate || !toRate || !(amount > 0) || fxConvertFrom === fxConvertTo) return null
    const tryAmount = Math.round(amount * fromRate.buyRate * 100) / 100
    const toAmount = Math.round((tryAmount / toRate.sellRate) * 100) / 100
    return { tryAmount, toAmount, fromRate: fromRate.buyRate, toRate: toRate.sellRate }
  }, [fxConvertAmount, fxConvertFrom, fxConvertTo, rateByCurrency])

  const fxTradeMutation = useMutation({
    mutationFn: () =>
      fxTrade({
        side: fxSide,
        currency: fxCurrency,
        amount: Number(fxAmount),
        tryAccountId: fxTryAccountId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['fx-rates'] })
      queryClient.invalidateQueries({ queryKey: ['fx-trades'] })
      setFxOpen(false)
      toast.success(fxSide === 'Buy' ? 'Alış gerçekleşti.' : 'Satış gerçekleşti.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem gerçekleştirilemedi.')),
  })

  const createFxAlertMutation = useMutation({
    mutationFn: () =>
      createFxAlert({
        currency: fxAlertCurrency,
        direction: fxAlertDirection,
        targetRate: Number(fxAlertTarget),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fx-alerts'] })
      setFxAlertOpen(false)
      setFxAlertTarget('')
      toast.success('Kur alarmı oluşturuldu.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Kur alarmı oluşturulamadı.')),
  })

  const deleteFxAlertMutation = useMutation({
    mutationFn: deleteFxAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fx-alerts'] })
      toast.success('Kur alarmı silindi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Kur alarmı silinemedi.')),
  })

  const fxConvertMutation = useMutation({
    mutationFn: () =>
      fxConvert({
        fromCurrency: fxConvertFrom,
        toCurrency: fxConvertTo,
        amount: Number(fxConvertAmount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['fx-conversions'] })
      setFxConvertOpen(false)
      setFxConvertAmount('')
      toast.success('Dönüşüm gerçekleşti.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Dönüşüm gerçekleştirilemedi.')),
  })

  function openFxTrade(side: FxTradeSide, currency: Currency) {
    setFxSide(side)
    setFxCurrency(currency)
    setFxTryAccountId(tryAccounts[0]?.id ?? '')
    setFxAmount('')
    setFxOpen(true)
  }

  function openFxAlert(currency: Currency) {
    const rate = rateByCurrency.get(currency)
    setFxAlertCurrency(currency)
    setFxAlertDirection('Above')
    setFxAlertTarget(rate ? String(Math.round(((rate.buyRate + rate.sellRate) / 2) * 10000) / 10000) : '')
    setFxAlertOpen(true)
  }

  function openFxConvert(from?: Currency) {
    const source = from ?? fxConvertibleAccounts[0]?.currency ?? 'USD'
    const target = (['USD', 'EUR', 'XAU'] as Currency[]).find((c) => c !== source) ?? 'EUR'
    setFxConvertFrom(source)
    setFxConvertTo(target)
    setFxConvertAmount('')
    setFxConvertOpen(true)
  }

  const fxFormValid =
    !!fxTryAccountId && Number(fxAmount) > 0 && !!fxPreview &&
    (fxSide === 'Buy' || Number(fxAmount) <= fxSellableBalance)
  const fxAlertValid = Number(fxAlertTarget) > 0 && !!rateByCurrency.get(fxAlertCurrency)
  const fxConvertValid =
    Number(fxConvertAmount) > 0
    && fxConvertFrom !== fxConvertTo
    && !!fxConvertPreview
    && Number(fxConvertAmount) <= fxConvertSourceBalance

  function openFxTradeReceipt(trade: FxTrade) {
    const ok = openFxReceipt({
      trade,
      customerName: user?.fullName ?? '',
    })
    if (!ok) toast.error('Açılır pencere engellendi. Lütfen pop-up iznine bakın.')
  }

  const frozenAccounts = accounts.filter((a) => a.isFrozen)
  const blockedCards = cards.filter((c) => c.status === 'Blocked')
  const pendingCards = cards.filter((c) => c.status === 'Pending')
  const failedPayments = payments.filter((p) => p.status === 'Failed')
  const securityIssueCount = frozenAccounts.length + blockedCards.length + failedPayments.length
  const securityNotifications = notifications
    .filter((n) => {
      const text = `${n.title} ${n.body}`.toLocaleLowerCase('tr-TR')
      return ['güven', 'şifre', 'blok', 'dondur', 'kart', 'havale', 'redded'].some((key) =>
        text.includes(key),
      )
    })
    .slice(0, 4)
  const securityLevel =
    securityIssueCount === 0
      ? { label: 'Güvenli', variant: 'success' as const, desc: 'Hesap ve kartlarınızda kritik uyarı görünmüyor.' }
      : securityIssueCount <= 2
        ? { label: 'Kontrol Gerekli', variant: 'warning' as const, desc: 'İncelemeniz gereken güvenlik kayıtları var.' }
        : { label: 'Riskli', variant: 'error' as const, desc: 'Birden fazla güvenlik uyarısı bulunuyor.' }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function copyIban(iban: string) {
    try {
      await navigator.clipboard.writeText(iban)
      toast.success('IBAN kopyalandı.')
    } catch {
      toast.error('Kopyalanamadı.')
    }
  }

  const firstName = user?.fullName?.split(' ')[0] ?? ''

  const accountOptions = [
    { value: ALL_ACCOUNTS, label: 'Tüm Hesaplar' },
    ...accounts.map((a) => ({
      value: a.id,
      label: `${a.accountType} · ...${a.iban.slice(-4)}`,
    })),
  ]

  function openDeposit(accountId: string) {
    setDepositAccountId(accountId)
    setDepositAmount('')
    setDepositOpen(true)
  }
  function openTransfer(accountId: string) {
    setFromAccountId(accountId)
    setToIban('')
    setTransferAmount('')
    setTransferDesc('')
    setSelectedRecipientId('')
    setSaveRecipientAfterTransfer(false)
    setRecipientNameAfterTransfer('')
    setTransferOpen(true)
  }

  function openRecipientModal() {
    setRecipientName('')
    setRecipientIban('')
    setRecipientNote('')
    setRecipientOpen(true)
  }

  function submitRecipient() {
    saveRecipientMutation.mutate({
      name: recipientName,
      iban: normalizeIban(recipientIban),
      note: recipientNote || undefined,
    })
  }

  // Bir hesaba bağlı kartlar (kapatma/dondurma uyarısında listelenir)
  const cardsForAccount = (acc: Account) =>
    cards.filter((c) => c.accountIban === acc.iban)

  // Kapatma modalını aç: bakiyenin aktarılabileceği uygun hedefleri hazırla
  function openClose(acc: Account) {
    setCloseTarget(acc)
    const firstDest = accounts.find(
      (a) => a.id !== acc.id && a.isActive && !a.isFrozen,
    )
    setCloseDestId(firstDest?.id ?? '')
  }
  // Kapatılacak hesabın bakiyesinin aktarılabileceği diğer aktif hesaplar
  const closeDestOptions = closeTarget
    ? accounts
        .filter((a) => a.id !== closeTarget.id && a.isActive && !a.isFrozen)
        .map((a) => ({
          value: a.id,
          label: `${a.accountType} · ...${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
        }))
    : []

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="dashboard-brand">TurkcellBank</span>
        <div className="dashboard-user">
          <span className="dashboard-username">{user?.fullName}</span>
          <button
            type="button"
            className="dashboard-bell dashboard-header-button"
            onClick={openNotifications}
            aria-label="Bildirimler"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            </svg>
            {unreadCount > 0 && (
              <span className="dashboard-bell-badge">{unreadCount}</span>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="dashboard-header-button text-white"
            onClick={openProfile}
          >
            Profil
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="dashboard-header-button dashboard-header-button--outline text-white"
            onClick={handleLogout}
          >
            Çıkış
          </Button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1 className="dashboard-greeting">{getGreeting(firstName)}</h1>

        <div className="dashboard-summary">
          <p className="dashboard-summary-label">Toplam Bakiye</p>
          <div className="dashboard-summary-value-row">
            <p className="dashboard-summary-value">
              <AnimatedMoney value={totalBalance} hidden={!balanceVisible} />
            </p>
            <button
              type="button"
              className="dashboard-balance-toggle"
              onClick={() => setBalanceVisible((v) => !v)}
              aria-label={balanceVisible ? 'Bakiyeyi gizle' : 'Bakiyeyi göster'}
            >
              {balanceVisible ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
          <div key={activeTab === 'transactions' ? 'cashflow' : 'sparkline'} className="dashboard-summary-chart">
            {activeTab === 'transactions' ? (
              <CashFlowSummary {...cashFlowSummary} />
            ) : (
              <BalanceSparkline
                values={balanceTrend}
                hidden={!balanceVisible}
                loading={balanceTrendLoading}
              />
            )}
          </div>
        </div>

        {/* Bölüm sekmeleri — tıklanınca ilgili bölüm gösterilir (kaydırma yok) */}
        <nav className="dashboard-tabs" aria-label="Panel bölümleri">
          <div className="dashboard-tab-groups" aria-label="Bölüm grupları">
            {visibleTabGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={activeTabGroup?.id === group.id}
                className={
                  activeTabGroup?.id === group.id
                    ? 'dashboard-tab-group active'
                    : 'dashboard-tab-group'
                }
                onClick={() => selectTabGroup(group.tabs)}
              >
                {group.label}
              </button>
            ))}
            <button
              type="button"
              className="dashboard-tab-edit"
              onClick={() => setTabsEditOpen(true)}
              aria-label="Sekmeleri düzenle"
              title="Sekmeleri düzenle"
            >
              Düzenle
            </button>
          </div>
          <div className="dashboard-tab-items" role="tablist" aria-label="Bölümler">
            {activeGroupTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={activeTab === t.id ? 'dashboard-tab active' : 'dashboard-tab'}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Sekme düzenleme modalı — bölüm ekle/çıkar */}
        <Modal
          open={tabsEditOpen}
          onClose={() => setTabsEditOpen(false)}
          title="Sekmeleri Düzenle"
          footer={
            <Button variant="primary" onClick={() => setTabsEditOpen(false)}>
              Tamam
            </Button>
          }
        >
          <p className="dashboard-tab-edit-hint">
            Panelde görmek istediğin bölümleri seç. Bir grubu kapatırsan altındaki
            tüm sekmeler gizlenir; istersen sekmeleri tek tek de açıp kapatabilirsin.
          </p>
          {DASHBOARD_TAB_GROUPS.map((group) => {
            const groupTabs = DASHBOARD_TABS.filter((t) => group.tabs.includes(t.id))
            const onCount = groupTabs.filter((t) => visibleTabs.includes(t.id)).length
            const allOn = onCount === groupTabs.length
            const noneOn = onCount === 0
            return (
              <div key={group.id} className="dashboard-tab-edit-group">
                <div className="dashboard-tab-edit-grouphead">
                  <Checkbox
                    label={group.label}
                    checked={allOn}
                    ref={(el) => {
                      if (el) el.indeterminate = !allOn && !noneOn
                    }}
                    onChange={() => toggleTabGroup(group.id)}
                  />
                </div>
                <div className="dashboard-tab-edit-children">
                  {groupTabs.map((t) => (
                    <div key={t.id} className="dashboard-tab-edit-row">
                      <Checkbox
                        label={t.label}
                        checked={visibleTabs.includes(t.id)}
                        onChange={() => toggleTab(t.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </Modal>

        <div key={activeTab} className="dashboard-tab-panel">
        {activeTab === 'accounts' && (
          <>
        <div className="dashboard-section-head">
          <h2 className="dashboard-section-title">Hesaplarım</h2>
          <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
            + Hesap Aç
          </Button>
        </div>

        {isLoading && (
          <div className="dashboard-accounts">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        )}
        {isError && <Alert variant="error">Hesaplar yüklenemedi.</Alert>}
        {!isLoading && !isError && depositoryAccounts.length === 0 && (
          <div className="dashboard-state">
            Henüz hesabınız yok. “+ Hesap Aç” ile başlayabilirsiniz.
          </div>
        )}

        {depositoryAccounts.length > 0 && (
          <div className="dashboard-accounts">
            {depositoryAccounts.map((acc) => (
              <Card
                key={acc.id}
                className={`dashboard-account-card ${accountCardVariant(acc)}`}
              >
                <CardContent className="dashboard-account-card-content">
                  <div className="dashboard-account-top">
                    <div className="dashboard-account-identity">
                      <span className="dashboard-account-icon">
                        <AccountVisualIcon type={acc.accountType} />
                      </span>
                      <div>
                        <p className="dashboard-account-name">
                          {acc.accountType === 'Bireysel'
                            ? 'Bireysel Hesap'
                            : 'İşletme Hesabı'}
                        </p>
                        <p className="dashboard-account-caption">TurkcellBank</p>
                      </div>
                    </div>
                    {acc.isFrozen && (
                      <Badge variant="warning" className="dashboard-account-status">
                        Dondurulmuş
                      </Badge>
                    )}
                  </div>
                  <div className="dashboard-account-iban-row">
                    <span className="dashboard-account-iban">{formatIban(acc.iban)}</span>
                    <button
                      type="button"
                      className="dashboard-iban-copy"
                      onClick={() => copyIban(acc.iban)}
                    >
                      Kopyala
                    </button>
                  </div>
                  <p className="dashboard-account-balance">
                    <AnimatedMoney value={acc.balance} hidden={!balanceVisible} />
                  </p>
                </CardContent>
                <CardFooter className="dashboard-account-card-footer">
                  <div className="dashboard-account-footer">
                    {acc.isFrozen && acc.freezeType === 'Bank' ? (
                      // Banka bloğu: müşteri kaldıramaz/kapatamaz, sadece bilgilendirilir
                      <div className="dashboard-account-bankhold">
                        🔒 Hesabınız banka tarafından donduruldu. Kaldırmak için
                        şubenize başvurun.
                      </div>
                    ) : acc.isFrozen ? (
                      <>
                        <div className="dashboard-account-actions">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => reactivateMutation.mutate(acc.id)}
                            loading={
                              reactivateMutation.isPending &&
                              reactivateMutation.variables === acc.id
                            }
                          >
                            Aktifleştir
                          </Button>
                        </div>
                        <div className="dashboard-account-close">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openClose(acc)}
                          >
                            Hesabı Kapat
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="dashboard-account-actions">
                          <Button size="sm" variant="primary" onClick={() => openDeposit(acc.id)}>
                            Para Yatır
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openTransfer(acc.id)}>
                            Gönder
                          </Button>
                        </div>
                        {/* Dondurma ve kapatma "tehlikeli" aksiyonlardır; diğer
                            tuşlardan ayrı, kırmızı tonlu olarak birlikte dururlar */}
                        <div className="dashboard-account-close">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-400"
                            onClick={() => setFreezeTarget(acc)}
                          >
                            Dondur
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openClose(acc)}
                          >
                            Hesabı Kapat
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
          </>
        )}

        {activeTab === 'transactions' && (
          <>
        {/* İşlem geçmişi */}
        <div className="dashboard-history-head">
          <div>
            <h2 className="dashboard-section-title">Son İşlemler</h2>
            <p className="dashboard-history-caption">
              {historyTotalCount > 0
                ? `${historyTotalCount} işlem listeleniyor`
                : hasTxFilters
                  ? 'Filtreye uygun işlem bulunamadı'
                  : 'Hesap hareketlerinizi buradan takip edin'}
            </p>
          </div>
          <div className="dashboard-history-actions">
            {accounts.length > 0 && (
              <div className="dashboard-history-select">
                <Select
                  options={accountOptions}
                  value={historyAccountId}
                  onChange={(e) => {
                    setHistoryAccountId(e.target.value)
                    setTxVisible(PAGE_SIZE)
                  }}
                />
              </div>
            )}
            <Button
              size="sm"
              variant={hasTxFilters ? 'primary' : 'secondary'}
              onClick={() => setTxFilterOpen(true)}
            >
              Filtrele{hasTxFilters ? ` (${activeTxFilterCount})` : ''}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={generateAccountStatement}
              disabled={historyBusy || history.length === 0}
            >
              Ekstre (PDF)
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            {historyBusy ? (
              <ListSkeleton />
            ) : history.length === 0 ? (
              <div className="dashboard-state">
                {isAllAccounts ? 'Henüz işlem yok.' : 'Bu hesapta henüz işlem yok.'}
              </div>
            ) : (
              <>
                {visibleHistory.map((tx, idx) => {
                  // Mevcut bakiyeden geriye hesaplayarak her işlem anındaki bakiyeyi bul
                  // Bu satırdan sonraki işlemlerin etkisini mevcut bakiyeden çıkar
                  const accountIban = tx.accountIban ?? accounts.find(a => a.id === historyAccountId)?.iban
                  const currentBalance = accounts.find(a => a.iban === accountIban)?.balance ?? 0
                  // Bu işlemden sonraki (daha yeni) işlemlerin etkisini geri al
                  const laterTxs = history.slice(0, idx)
                    .filter(t => (t.accountIban ?? accountIban) === accountIban)
                  const laterEffect = laterTxs.reduce((sum, t) =>
                    sum + (t.direction === 'In' ? -t.amount : t.amount), 0)
                  const balanceAfterTx = currentBalance + laterEffect

                  return (
                  <div key={tx.id} className="dashboard-tx-row">
                    <div className="dashboard-tx-main">
                      <p className="dashboard-tx-desc">
                        <span>{txTitle(tx)}</span>
                        {isAllAccounts && tx.accountIban && (
                          <span className="dashboard-tx-account">
                            ...{tx.accountIban.slice(-4)}
                          </span>
                        )}
                      </p>
                      <p className="dashboard-tx-sub">
                        {trDate(tx.createdAt)}
                        {tx.description ? ` · ${tx.description}` : ''}
                        {tx.channel === 'Branch' ? ' · Şube' : ''}
                        {tx.channel === 'Automatic' ? ' · Otomatik' : ''}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="dashboard-tx-receipt"
                        onClick={() => openReceipt(tx, accountIban)}
                      >
                        Dekont
                      </Button>
                    </div>
                    <div className="dashboard-tx-right">
                      <span
                        className={`dashboard-tx-amount ${tx.direction === 'In' ? 'in' : 'out'}`}
                      >
                        {tx.direction === 'In' ? '+' : '-'}
                        {formatTL(tx.amount)}
                      </span>
                      <span className="dashboard-tx-balance">
                        Bakiye: {balanceVisible ? formatTL(balanceAfterTx) : '₺*****,**'}
                      </span>
                    </div>
                  </div>
                  )
                })}
                {historyHasMore && (
                  <div className="dashboard-loadmore">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTxVisible((v) => v + PAGE_SIZE)}
                    >
                      Daha fazla göster
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'recipients' && (
          <>
        {/* Kayıtlı alıcılar — kendi sekmesi (yönetim) */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <div className="dashboard-section-heading">
            <h2 className="dashboard-section-title">Kayıtlı Alıcılar</h2>
            {recipients.length > 0 && (
              <span className="dashboard-recipient-count">{recipients.length}</span>
            )}
          </div>
          <Button size="sm" variant="primary" onClick={openRecipientModal}>
            + Alıcı Ekle
          </Button>
        </div>

        <p className="dashboard-section-hint">
          Sık para gönderdiğiniz hesapları kaydedin; transfer ekranında tek tıkla seçin.
        </p>

        {recipients.length > 3 && (
          <div className="dashboard-recipient-toolbar">
            <Input
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Alıcı adı veya IBAN ara"
            />
          </div>
        )}

        <Card>
          <CardContent>
            {recipientsLoading ? (
              <ListSkeleton />
            ) : recipients.length === 0 ? (
              <div className="dashboard-recipient-empty">
                <div className="dashboard-recipient-empty-icon" aria-hidden="true">👥</div>
                <p className="dashboard-recipient-empty-title">Henüz kayıtlı alıcınız yok</p>
                <p className="dashboard-recipient-empty-sub">
                  Sık işlem yaptığınız kişileri ekleyin, sonraki transferleriniz çok daha hızlı olsun.
                </p>
                <Button size="sm" variant="primary" onClick={openRecipientModal}>
                  + İlk alıcıyı ekle
                </Button>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="dashboard-state">"{recipientSearch}" ile eşleşen alıcı yok.</div>
            ) : (
              <div className="dashboard-recipient-list">
                {filteredRecipients.map((recipient) => (
                  <div key={recipient.id} className="dashboard-recipient-row">
                    <div className="dashboard-recipient-main">
                      <div className="dashboard-recipient-avatar" aria-hidden="true">
                        {recipientInitials(recipient.name)}
                      </div>
                      <div>
                        <p className="dashboard-recipient-name">{recipient.name}</p>
                        <p className="dashboard-recipient-iban">{formatIban(recipient.iban)}</p>
                        {recipient.note && (
                          <p className="dashboard-recipient-note">{recipient.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="dashboard-recipient-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setFromAccountId(activeAccounts[0]?.id ?? '')
                          setSelectedRecipientId(recipient.id)
                          setToIban(formatIbanInput(recipient.iban))
                          setTransferAmount('')
                          setTransferDesc(recipient.note ?? '')
                          setSaveRecipientAfterTransfer(false)
                          setRecipientNameAfterTransfer('')
                          setTransferOpen(true)
                        }}
                        disabled={activeAccounts.length === 0}
                      >
                        Gönder
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteRecipientTarget(recipient)}
                      >
                        Sil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'loans' && (
          <>
        {/* Krediler */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Kredilerim</h2>
          <Button size="sm" variant="primary" onClick={openLoanApply}>
            + Kredi Başvur
          </Button>
        </div>

        <Card>
          <CardContent>
            {loansLoading ? (
              <ListSkeleton />
            ) : loans.length === 0 ? (
              <div className="dashboard-state">Henüz kredi başvurunuz yok.</div>
            ) : (
              loans.map((loan) => (
                <div key={loan.id} className="dashboard-loan-row">
                  <div>
                    <p className="dashboard-loan-amount">
                      {formatTL(loan.amount)} · {loan.termMonths} ay
                    </p>
                    <p className="dashboard-loan-sub">
                      {loan.profession} · skor {loan.score} · {trDate(loan.createdAt)}
                    </p>
                    {loan.status === 'Approved' && (
                      <p className="dashboard-loan-sub">
                        {loan.installmentsPaid}/{loan.termMonths} taksit ödendi ·{' '}
                        {loan.installmentsPaid >= loan.termMonths ? (
                          <strong>Kapandı</strong>
                        ) : (
                          <>kalan borç <strong>{formatTL(loan.remainingDebt)}</strong></>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="dashboard-loan-right">
                    <Badge variant={loanBadgeVariant(loan.status)}>
                      {loanLabel(loan.status)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setResultLoan(loan)}
                    >
                      Gerekçe
                    </Button>
                    {loan.status === 'Approved' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPlanLoanId(loan.id)}
                      >
                        Ödeme Planı
                      </Button>
                    )}
                    {loan.status === 'Approved' &&
                      loan.installmentsPaid < loan.termMonths && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => openPayInstallment(loan)}
                        >
                          Taksit Öde
                        </Button>
                      )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'cards' && (
          <>
        {/* Banka (debit) kartları */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Banka Kartlarım</h2>
          <Button size="sm" variant="primary" onClick={openCardModal}>
            + Kart Aç
          </Button>
        </div>

        {cardsLoading ? (
          <div className="dashboard-cards-grid">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : cards.length === 0 ? (
          <Card><CardContent><div className="dashboard-state">Henüz kartınız yok.</div></CardContent></Card>
        ) : (
          <div className="dashboard-cards-grid">
            {cards.map((c, i) => (
              <div key={c.id} className="dashboard-card-cell">
              <div
                className={`bank-card bank-card--${i % 3 === 0 ? 'indigo' : i % 3 === 1 ? 'emerald' : 'slate'} ${c.status === 'Blocked' ? 'bank-card--blocked' : ''}`}
              >
                {/* Üst satır: logo + durum */}
                <div className="bank-card__top">
                  <span className="bank-card__brand">TurkcellBank</span>
                  <Badge variant={cardBadgeVariant(c.status)}>
                    {cardLabel(c.status)}
                  </Badge>
                </div>

                {/* Chip ikonu */}
                <div className="bank-card__chip">
                  <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
                    <rect x="0.5" y="0.5" width="35" height="27" rx="4" fill="#d4a843" stroke="#b8922e"/>
                    <line x1="0" y1="10" x2="36" y2="10" stroke="#b8922e" strokeWidth="0.7"/>
                    <line x1="0" y1="18" x2="36" y2="18" stroke="#b8922e" strokeWidth="0.7"/>
                    <line x1="12" y1="0" x2="12" y2="28" stroke="#b8922e" strokeWidth="0.7"/>
                    <line x1="24" y1="0" x2="24" y2="28" stroke="#b8922e" strokeWidth="0.7"/>
                  </svg>
                </div>

                {/* Kart numarası */}
                <p className="bank-card__number">{c.maskedCardNumber}</p>
                <p className="bank-card__holder">{user?.fullName?.toUpperCase()}</p>

                {/* Alt satır: son kullanma + hesap */}
                <div className="bank-card__bottom">
                  <div>
                    <span className="bank-card__label">SKT</span>
                    <span className="bank-card__expiry">
                      {String(c.expiryMonth).padStart(2, '0')}/{c.expiryYear}
                    </span>
                  </div>
                  <div>
                    <span className="bank-card__label">HESAP</span>
                    <span className="bank-card__expiry">
                      ...{c.accountIban.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
              {(c.status === 'Approved' || c.status === 'Blocked') && (
                <div className="dashboard-card-actions">
                  <Button size="sm" variant="ghost" onClick={() => openStatement(c)}>
                    Ekstre (PDF)
                  </Button>
                </div>
              )}
              </div>
            ))}
          </div>
        )}

        {/* Kredi kartları */}
        <div className="dashboard-section-head" style={{ marginTop: '3rem' }}>
          <h2 className="dashboard-section-title">Kredi Kartlarım</h2>
          {!creditCard && !creditCardsLoading && (
            <Button size="sm" variant="primary" onClick={openCcApply}>
              + Kredi Kartı Başvurusu
            </Button>
          )}
        </div>

        {creditCardsLoading ? (
          <div className="dashboard-cards-grid">
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : !creditCard ? (
          <Card>
            <CardContent>
              <div className="dashboard-state">
                Henüz kredi kartınız yok. Gelir bilgilerinize göre limitiniz anında
                belirlensin.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="dashboard-cards-grid">
              {/* Kart görseli + limit çubuğu */}
              <div className="dashboard-card-cell">
                <div
                  className={`bank-card bank-card--indigo ${creditCard.status !== 'Approved' ? 'bank-card--blocked' : ''}`}
                >
                  <div className="bank-card__top">
                    <span className="bank-card__brand">TurkcellBank · Kredi</span>
                    <Badge variant={creditCardBadgeVariant(creditCard.status)}>
                      {creditCardLabel(creditCard.status)}
                    </Badge>
                  </div>
                  <div className="bank-card__chip">
                    <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
                      <rect x="0.5" y="0.5" width="35" height="27" rx="4" fill="#d4a843" stroke="#b8922e" />
                      <line x1="0" y1="10" x2="36" y2="10" stroke="#b8922e" strokeWidth="0.7" />
                      <line x1="0" y1="18" x2="36" y2="18" stroke="#b8922e" strokeWidth="0.7" />
                      <line x1="12" y1="0" x2="12" y2="28" stroke="#b8922e" strokeWidth="0.7" />
                      <line x1="24" y1="0" x2="24" y2="28" stroke="#b8922e" strokeWidth="0.7" />
                    </svg>
                  </div>
                  <p className="bank-card__number">{creditCard.maskedCardNumber}</p>
                  <p className="bank-card__holder">{user?.fullName?.toUpperCase()}</p>
                  <div className="bank-card__bottom">
                    <div>
                      <span className="bank-card__label">SKT</span>
                      <span className="bank-card__expiry">
                        {String(creditCard.expiryMonth).padStart(2, '0')}/{creditCard.expiryYear}
                      </span>
                    </div>
                    <div>
                      <span className="bank-card__label">KESİM</span>
                      <span className="bank-card__expiry">Her ayın {creditCard.statementDay}'i</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Limit özeti + kullanılabilir limit çubuğu */}
              <div className="dashboard-card-cell">
                <Card>
                  <CardContent>
                    <div className="cc-limit-row">
                      <span>Kullanılabilir Limit</span>
                      <strong className="cc-limit-available">{formatTL(creditCard.availableLimit)}</strong>
                    </div>
                    <div className="cc-limit-bar">
                      <div
                        className="cc-limit-bar-fill"
                        style={{
                          width: `${creditCard.creditLimit > 0 ? Math.min(100, (creditCard.currentDebt / creditCard.creditLimit) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="cc-limit-meta">
                      <span>Güncel Borç: <strong>{formatTL(creditCard.currentDebt)}</strong></span>
                      <span>Toplam Limit: <strong>{formatTL(creditCard.creditLimit)}</strong></span>
                    </div>

                    {creditCard.status === 'Approved' && (
                      <div className="cc-card-actions">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={creditCard.currentDebt <= 0}
                          onClick={openCcPay}
                        >
                          Borç Öde
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={creditCard.availableLimit <= 0}
                          onClick={openCcCashAdvance}
                        >
                          Nakit Avans
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={openCcLimitIncrease}
                        >
                          Limit Artışı
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={ccOnlineShoppingMutation.isPending}
                          onClick={() => ccOnlineShoppingMutation.mutate(!creditCard.onlineShoppingEnabled)}
                        >
                          {creditCard.onlineShoppingEnabled
                            ? 'İnternet Alışverişini Kapat'
                            : 'İnternet Alışverişini Aç'}
                        </Button>
                      </div>
                    )}
                    {creditCard.status === 'PendingApproval' && (
                      <Alert variant="info" className="cc-status-alert">
                        Başvurunuz yüksek limit bandı nedeniyle yetkili onayında.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {creditCard.status === 'Approved' && (
              <>
                {/* Güncel ekstre */}
                <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
                  <h2 className="dashboard-section-title">Güncel Ekstre</h2>
                </div>
                {currentStatement ? (
                  <Card>
                    <CardContent>
                      <div className="cc-statement-grid">
                        <div className="cc-statement-cell">
                          <span className="cc-statement-label">Dönem Borcu</span>
                          <strong className="cc-statement-value">{formatTL(currentStatement.remainingAmount)}</strong>
                        </div>
                        <div className="cc-statement-cell">
                          <span className="cc-statement-label">Asgari Ödeme</span>
                          <strong className="cc-statement-value">{formatTL(currentStatement.minimumPayment)}</strong>
                        </div>
                        <div className="cc-statement-cell">
                          <span className="cc-statement-label">Son Ödeme Tarihi</span>
                          <strong className="cc-statement-value">{trDate(currentStatement.dueDate)}</strong>
                        </div>
                        <div className="cc-statement-cell">
                          <span className="cc-statement-label">Durum</span>
                          <Badge variant={ccStatementBadgeVariant(currentStatement.status)}>
                            {ccStatementLabel(currentStatement.status)}
                          </Badge>
                        </div>
                        <div className="cc-statement-cell">
                          <span className="cc-statement-label">İşletilen Faiz</span>
                          <strong className="cc-statement-value">{formatTL(currentStatement.totalInterestApplied)}</strong>
                        </div>
                      </div>
                      <div className="cc-card-actions">
                        <Button size="sm" variant="primary" onClick={openCcPay}>
                          Borç Öde
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => generateCreditCardStatementPdf(currentStatement.id)}>
                          PDF İndir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent>
                      <div className="dashboard-state">
                        Ödenecek güncel ekstreniz yok. Bir sonraki kesim tarihi:{' '}
                        {trDate(creditCard.nextStatementDate)}.
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Hareketler */}
                <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
                  <h2 className="dashboard-section-title">Kart Hareketleri</h2>
                </div>
                <Card>
                  <CardContent>
                    {ccTxLoading ? (
                      <ListSkeleton />
                    ) : ccTransactions.length === 0 ? (
                      <div className="dashboard-state">Henüz hareket yok.</div>
                    ) : (
                      ccTransactions.map((t) => (
                        <div key={t.id} className="dashboard-loan-row">
                          <div>
                            <p className="dashboard-loan-amount">
                              {formatTL(t.amount)} · {ccTxLabel(t.type)}
                              {t.installmentNo && t.installmentCount
                                ? ` (${t.installmentNo}/${t.installmentCount})`
                                : ''}
                            </p>
                            <p className="dashboard-loan-sub">
                              {trDate(t.createdAt)}
                              {t.description ? ` · ${t.description}` : ''}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Geçmiş ekstreler */}
                {ccStatements.length > 0 && (
                  <>
                    <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
                      <h2 className="dashboard-section-title">Ekstreler</h2>
                    </div>
                    <Card>
                      <CardContent>
                        {ccStatementsLoading ? (
                          <ListSkeleton />
                        ) : (
                          ccStatements.map((s) => (
                            <div key={s.id} className="dashboard-loan-row">
                              <div>
                                <p className="dashboard-loan-amount">
                                  {formatTL(s.totalDue)} · {trDate(s.statementDate)}
                                </p>
                                <p className="dashboard-loan-sub">
                                  Asgari {formatTL(s.minimumPayment)} · Son ödeme {trDate(s.dueDate)}
                                </p>
                              </div>
                              <Badge variant={ccStatementBadgeVariant(s.status)}>
                                {ccStatementLabel(s.status)}
                              </Badge>
                              <Button size="sm" variant="ghost" onClick={() => generateCreditCardStatementPdf(s.id)}>
                                PDF İndir
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {ccLimitRequests.length > 0 && (
                  <>
                    <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
                      <h2 className="dashboard-section-title">Limit Artış Talepleri</h2>
                    </div>
                    <Card>
                      <CardContent>
                        {ccLimitRequestsLoading ? (
                          <ListSkeleton />
                        ) : (
                          ccLimitRequests.map((r) => (
                            <div key={r.id} className="dashboard-loan-row">
                              <div>
                                <p className="dashboard-loan-amount">
                                  {formatTL(r.currentLimit)} → {formatTL(r.requestedLimit)}
                                </p>
                                <p className="dashboard-loan-sub">
                                  Önerilen limit {formatTL(r.recommendedLimit)} · {trDate(r.createdAt)}
                                </p>
                              </div>
                              <Badge variant={r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'error' : 'warning'}>
                                {r.status === 'Approved' ? 'Onaylandı' : r.status === 'Rejected' ? 'Reddedildi' : 'Onay Bekliyor'}
                              </Badge>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </>
        )}
          </>
        )}

        {activeTab === 'payments' && (
          <>
        {/* Sanal POS — Ödemeler */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Ödemelerim</h2>
          <Button size="sm" variant="primary" onClick={openPay}>
            + Ödeme Yap
          </Button>
        </div>

        <Card>
          <CardContent>
            {paymentsLoading ? (
              <ListSkeleton />
            ) : payments.length === 0 ? (
              <div className="dashboard-state">Henüz ödemeniz yok.</div>
            ) : (
              <>
                {payments.slice(0, payVisible).map((p) => (
                  <div key={p.id} className="dashboard-loan-row">
                    <div>
                      <p className="dashboard-loan-amount">
                        {formatTL(p.amount)} · {p.maskedCardNumber}
                      </p>
                      <p className="dashboard-loan-sub">
                        {trDate(p.createdAt)}
                        {p.description ? ` · ${p.description}` : ''}
                      </p>
                    </div>
                    <Badge variant={paymentBadgeVariant(p.status)}>
                      {paymentLabel(p.status)}
                    </Badge>
                  </div>
                ))}
                {payments.length > payVisible && (
                  <div className="dashboard-loadmore">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPayVisible((v) => v + PAGE_SIZE)}
                    >
                      Daha fazla göster
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'bills' && (
          <>
        {/* Fatura Ödeme */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Faturalarım</h2>
          <Button size="sm" variant="primary" onClick={openBillPay}>
            + Fatura Öde
          </Button>
        </div>

        <Card>
          <CardContent>
            {billsLoading ? (
              <ListSkeleton />
            ) : myBills.length === 0 ? (
              <div className="dashboard-state">Henüz ödenmiş faturanız yok.</div>
            ) : (
              <>
                {myBills.slice(0, billVisible).map((b) => (
                  <div key={b.id} className="dashboard-loan-row">
                    <div>
                      <p className="dashboard-loan-amount">
                        {formatTL(b.amount)} · {b.billerName}
                      </p>
                      <p className="dashboard-loan-sub">
                        {trDate(b.createdAt)} · Abone {b.subscriberNo} · Dönem {b.period}
                      </p>
                    </div>
                    <Badge variant="success">Ödendi</Badge>
                  </div>
                ))}
                {myBills.length > billVisible && (
                  <div className="dashboard-loadmore">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setBillVisible((v) => v + PAGE_SIZE)}
                    >
                      Daha fazla göster
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'orders' && (
          <>
        {/* Düzenli Ödeme Talimatları */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Düzenli Ödeme Talimatlarım</h2>
          <Button size="sm" variant="primary" onClick={openOrderCreate}>
            + Yeni Talimat
          </Button>
        </div>

        <Alert variant="info">
          Talimatlar her ayın belirlediğiniz gününde otomatik çalışır; fatura
          ödenir veya havale gönderilir. Sonuç bildirim olarak iletilir.
        </Alert>

        <Card>
          <CardContent>
            {ordersLoading ? (
              <ListSkeleton />
            ) : orders.length === 0 ? (
              <div className="dashboard-state">Henüz talimatınız yok.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="dashboard-order-row">
                  <div className="dashboard-order-main">
                    <p className="dashboard-loan-amount">
                      {o.name}{' '}
                      <Badge variant="neutral">
                        {o.type === 'AutoBill' ? 'Otomatik Fatura' : 'Düzenli Havale'}
                      </Badge>{' '}
                      {!o.isActive && <Badge variant="warning">Duraklatıldı</Badge>}
                    </p>
                    <p className="dashboard-loan-sub">
                      {o.type === 'AutoBill'
                        ? `${o.billerName} · Abone ${o.subscriberNo}`
                        : `${formatTL(o.amount ?? 0)} → ...${(o.targetIban ?? '').slice(-4)}`}
                    </p>
                    <p className="dashboard-loan-sub">
                      Her ayın {o.dayOfMonth}. günü · Kaynak ...{o.sourceIban.slice(-4)} · Sıradaki:{' '}
                      {new Date(o.nextRunDate).toLocaleDateString('tr-TR')}
                      {o.lastStatus ? ` · Son: ${o.lastStatus}` : ''}
                    </p>
                  </div>
                  <div className="dashboard-order-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={
                        toggleOrderMutation.isPending &&
                        toggleOrderMutation.variables?.id === o.id
                      }
                      onClick={() =>
                        toggleOrderMutation.mutate({ id: o.id, isActive: !o.isActive })
                      }
                    >
                      {o.isActive ? 'Duraklat' : 'Etkinleştir'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={
                        deleteOrderMutation.isPending &&
                        deleteOrderMutation.variables === o.id
                      }
                      onClick={() => deleteOrderMutation.mutate(o.id)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'deposits' && (
          <>
        {/* Vadeli Mevduat */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Vadeli Mevduatlarım</h2>
          <Button size="sm" variant="primary" onClick={openDepositCreate}>
            + Yeni Vadeli Hesap
          </Button>
        </div>

        <Alert variant="info">
          Anaparanız vade boyunca bağlanır; vade sonunda anapara + net faiz (stopaj
          düşülmüş) hesabınıza otomatik döner. Vadeden önce bozarsanız faiz işlemez.
        </Alert>

        <Card>
          <CardContent>
            {depositsLoading ? (
              <ListSkeleton />
            ) : myDeposits.length === 0 ? (
              <div className="dashboard-state">Henüz vadeli mevduatınız yok.</div>
            ) : (
              myDeposits.map((d) => (
                <div key={d.id} className="dashboard-order-row">
                  <div className="dashboard-order-main">
                    <p className="dashboard-loan-amount">
                      {formatTL(d.principal)}{' '}
                      <Badge
                        variant={
                          d.status === 'Matured'
                            ? 'success'
                            : d.status === 'ClosedEarly'
                              ? 'neutral'
                              : 'info'
                        }
                      >
                        {d.status === 'Matured'
                          ? 'Vade doldu'
                          : d.status === 'ClosedEarly'
                            ? 'Erken bozuldu'
                            : 'Vade sürüyor'}
                      </Badge>
                    </p>
                    <p className="dashboard-loan-sub">
                      {d.termDays} gün · %{(d.annualRate * 100).toFixed(0)} yıllık · Hesap ...
                      {d.sourceIban.slice(-4)}
                    </p>
                    <p className="dashboard-loan-sub">
                      {d.status === 'Active'
                        ? `Vade: ${new Date(d.maturityDate).toLocaleDateString('tr-TR')} · Net faiz ${formatTL(d.netInterest)} · Ele geçecek ${formatTL(d.maturityAmount)}`
                        : d.status === 'Matured'
                          ? `${new Date(d.closedAt ?? d.maturityDate).toLocaleDateString('tr-TR')} · Net faiz ${formatTL(d.netInterest)} · İade ${formatTL(d.maturityAmount)}`
                          : `${new Date(d.closedAt ?? d.maturityDate).toLocaleDateString('tr-TR')} · Faizsiz · Anapara ${formatTL(d.principal)} iade edildi`}
                    </p>
                  </div>
                  {d.status === 'Active' && (
                    <div className="dashboard-order-actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCloseDepositTarget(d)}
                      >
                        Boz
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'fx' && (
          <>
        {/* Döviz & Altın */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <div className="dashboard-section-heading">
            <h2 className="dashboard-section-title">Döviz & Altın</h2>
            <span className="dashboard-fx-live" title="Kurlar canlı güncellenir">● Canlı</span>
          </div>
          <div className="dashboard-section-actions">
            <Button
              size="sm"
              variant="primary"
              onClick={() => openFxTrade('Buy', 'USD')}
              disabled={tryAccounts.length === 0}
            >
              + Al / Sat
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openFxConvert()}
              disabled={fxConvertibleAccounts.length === 0}
            >
              Dönüştür
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openFxAlert('USD')}
              disabled={rates.length === 0}
            >
              Alarm Kur
            </Button>
          </div>
        </div>
        <p className="dashboard-section-hint">
          Güncel kurlarla döviz ve altın alın, satın. İlk alışınızda ilgili hesap otomatik açılır.
        </p>

        {/* Portföy dağılımı */}
        <Card>
          <CardContent>
            <div className="dashboard-fx-portfolio-head">
              <div>
                <p className="dashboard-fx-portfolio-kicker">Döviz/Altın Portföy Değeri</p>
                <strong>{formatTL(fxPortfolioValue)}</strong>
              </div>
              <span>güncel TL karşılığı</span>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="dashboard-state">Henüz döviz/altın varlığınız yok.</div>
            ) : (
              <div className="dashboard-fx-portfolio">
                {portfolioItems.map((item) => (
                  <div key={item.currency} className={`dashboard-fx-portfolio-row ${item.currency.toLowerCase()}`}>
                    <div className="dashboard-fx-portfolio-label">
                      <span>{CURRENCY_META[item.currency].code}</span>
                      <strong>{formatCurrencyAmount(item.amount, item.currency)}</strong>
                    </div>
                    <div className="dashboard-fx-portfolio-track" aria-hidden="true">
                      <span style={{ width: `${Math.max(item.percent, 3)}%` }} />
                    </div>
                    <div className="dashboard-fx-portfolio-value">
                      <strong>{formatTL(item.tryValue)}</strong>
                      <span>%{item.percent}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Döviz/altın hesaplarım */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Döviz / Altın Hesaplarım</h2>
        </div>
        <Card>
          <CardContent>
            {fxAccounts.length === 0 ? (
              <div className="dashboard-state">
                Henüz döviz/altın hesabınız yok. İlk alışınızda otomatik açılır.
              </div>
            ) : (
              <div className="dashboard-recipient-list">
                {fxAccounts.map((a) => (
                  <div key={a.id} className="dashboard-recipient-row">
                    <div className="dashboard-recipient-main">
                      <div className="dashboard-fx-acc-badge" aria-hidden="true">
                        {CURRENCY_META[a.currency].code}
                      </div>
                      <div>
                        <p className="dashboard-recipient-name">
                          {formatCurrencyAmount(a.balance, a.currency)}
                        </p>
                        <p className="dashboard-recipient-iban">{formatIban(a.iban)}</p>
                        <p className="dashboard-recipient-note">≈ {formatTL(tryValueOf(a))}</p>
                      </div>
                    </div>
                    <div className="dashboard-recipient-actions">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openFxTrade('Buy', a.currency)}
                        disabled={tryAccounts.length === 0}
                      >
                        Al
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openFxTrade('Sell', a.currency)}
                      >
                        Sat
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openFxConvert(a.currency)}
                      >
                        Dönüştür
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kur tahtası */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Kur Tahtası</h2>
        </div>
        <div className="dashboard-fx-board">
          {rates.length === 0 ? (
            <div className="dashboard-state">Kur bilgisi yükleniyor…</div>
          ) : (
            rates.map((r) => (
              <Card key={r.currency}>
                <CardContent>
                  <div className="dashboard-fx-rate">
                    <div className="dashboard-fx-rate-head">
                      <span className="dashboard-fx-rate-code">{r.code}</span>
                      <span className="dashboard-fx-rate-name">{r.name}</span>
                    </div>
                    <div className="dashboard-fx-rate-prices">
                      <div>
                        <span>Alış</span>
                        <strong>{formatTL(r.buyRate)}</strong>
                      </div>
                      <div>
                        <span>Satış</span>
                        <strong>{formatTL(r.sellRate)}</strong>
                      </div>
                    </div>
                    <FxRateSparkline points={fxRateHistory[r.currency] ?? []} />
                    <div className="dashboard-fx-rate-actions">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openFxTrade('Buy', r.currency)}
                        disabled={tryAccounts.length === 0}
                      >
                        Al
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openFxTrade('Sell', r.currency)}
                        disabled={!fxAccounts.some((a) => a.currency === r.currency)}
                      >
                        Sat
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openFxAlert(r.currency)}
                      >
                        Alarm
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Kur alarmları */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Kur Alarmlarım</h2>
        </div>
        <Card>
          <CardContent>
            {fxAlertsLoading ? (
              <ListSkeleton />
            ) : fxAlerts.length === 0 ? (
              <div className="dashboard-state">Henüz kur alarmınız yok.</div>
            ) : (
              <div className="dashboard-fx-alerts">
                {fxAlerts.map((alert) => (
                  <div key={alert.id} className="dashboard-fx-alert-row">
                    <div>
                      <p>
                        {alert.code} {alert.direction === 'Above' ? 'üstüne çıkınca' : 'altına inince'}
                      </p>
                      <span>
                        Hedef {formatTL(alert.targetRate)}
                        {alert.lastCheckedRate ? ` · Son ${formatTL(alert.lastCheckedRate)}` : ''}
                      </span>
                    </div>
                    <div className="dashboard-fx-alert-actions">
                      <Badge variant={alert.isTriggered ? 'success' : alert.isActive ? 'info' : 'warning'}>
                        {alert.isTriggered ? 'Gerçekleşti' : alert.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                      {alert.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteFxAlertMutation.mutate(alert.id)}
                          disabled={deleteFxAlertMutation.isPending}
                        >
                          Sil
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Döviz/altın işlem geçmişi */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Döviz / Altın İşlem Geçmişi</h2>
        </div>
        <Card>
          <CardContent>
            {(fxTradesLoading || fxConversionsLoading) ? (
              <ListSkeleton />
            ) : fxHistory.length === 0 ? (
              <div className="dashboard-state">Henüz döviz/altın işleminiz yok.</div>
            ) : (
              <div className="dashboard-fx-trades">
                {fxHistory.map((item) =>
                  item.kind === 'trade' ? (
                    <div key={item.trade.id} className="dashboard-fx-trade-row">
                      <div className="dashboard-fx-trade-main">
                        <span className={`dashboard-fx-trade-side ${item.trade.side.toLowerCase()}`}>
                          {item.trade.side === 'Buy' ? 'Alış' : 'Satış'}
                        </span>
                        <div>
                          <p>{item.trade.code} · {formatCurrencyAmount(item.trade.amount, item.trade.currency)}</p>
                          <span>{trDate(item.trade.createdAt)} · Kur {formatTL(item.trade.rate)}</span>
                        </div>
                      </div>
                      <div className="dashboard-fx-trade-right">
                        <strong>{formatTL(item.trade.tryAmount)}</strong>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="dashboard-tx-receipt"
                          onClick={() => openFxTradeReceipt(item.trade)}
                        >
                          Dekont
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.conv.id} className="dashboard-fx-trade-row">
                      <div className="dashboard-fx-trade-main">
                        <span className="dashboard-fx-trade-side convert">Çevir</span>
                        <div>
                          <p>{item.conv.fromCode} → {item.conv.toCode}</p>
                          <span>
                            {formatCurrencyAmount(item.conv.fromAmount, item.conv.fromCurrency)}
                            {' → '}
                            {formatCurrencyAmount(item.conv.toAmount, item.conv.toCurrency)}
                            {' · '}{trDate(item.conv.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="dashboard-fx-trade-right">
                        <strong>{formatTL(item.conv.tryAmount)}</strong>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'security' && (
          <>
        {/* Güvenlik Merkezi */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Güvenlik Merkezi</h2>
        </div>

        <div className="dashboard-security-summary">
          <Card className="dashboard-security-hero">
            <CardContent>
              <div className="dashboard-security-hero-head">
                <div className="dashboard-security-shield" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-5" />
                  </svg>
                </div>
                <div>
                  <p className="dashboard-security-title">Genel Güvenlik Durumu</p>
                  <p className="dashboard-security-sub">{securityLevel.desc}</p>
                </div>
              </div>
              <Badge variant={securityLevel.variant}>{securityLevel.label}</Badge>
            </CardContent>
          </Card>

          <div className="dashboard-security-kpis">
            <div className="dashboard-security-kpi">
              <span>{frozenAccounts.length}</span>
              <p>Dondurulmuş hesap</p>
            </div>
            <div className="dashboard-security-kpi">
              <span>{blockedCards.length}</span>
              <p>Bloke kart</p>
            </div>
            <div className="dashboard-security-kpi">
              <span>{failedPayments.length}</span>
              <p>Başarısız ödeme</p>
            </div>
          </div>
        </div>

        <div className="dashboard-security-grid">
          <Card>
            <CardContent>
              <p className="dashboard-security-card-title">Hesap Güvenliği</p>
              {accounts.length === 0 ? (
                <p className="dashboard-security-empty">Görüntülenecek hesap yok.</p>
              ) : (
                <div className="dashboard-security-list">
                  {accounts.map((account) => (
                    <div key={account.id} className="dashboard-security-row">
                      <div>
                        <p className="dashboard-security-main">...{account.iban.slice(-4)}</p>
                        <p className="dashboard-security-sub">
                          {account.accountType}
                          {account.freezeType === 'Bank' ? ' · Banka bloğu' : ''}
                        </p>
                      </div>
                      <Badge variant={account.isFrozen ? 'warning' : 'success'}>
                        {account.isFrozen ? 'Dondurulmuş' : 'Aktif'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="dashboard-security-card-title">Kart Güvenliği</p>
              {cards.length === 0 ? (
                <p className="dashboard-security-empty">Görüntülenecek kart yok.</p>
              ) : (
                <div className="dashboard-security-list">
                  {cards.map((card) => (
                    <div key={card.id} className="dashboard-security-row">
                      <div>
                        <p className="dashboard-security-main">{card.maskedCardNumber}</p>
                        <p className="dashboard-security-sub">Hesap ...{card.accountIban.slice(-4)}</p>
                      </div>
                      <Badge variant={cardBadgeVariant(card.status)}>
                        {cardLabel(card.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="dashboard-security-card-title">Güvenlik Aksiyonları</p>
              <div className="dashboard-security-actions">
                <button type="button" onClick={openPasswordModal}>
                  <span>Şifre değiştir</span>
                  <strong>Hesap parolanızı güncelleyin</strong>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLimitInput(user?.dailyTransferLimit ? String(user.dailyTransferLimit) : '')
                    setLimitOpen(true)
                  }}
                >
                  <span>Günlük havale limiti</span>
                  <strong>
                    {user?.dailyTransferLimit
                      ? `${user.dailyTransferLimit.toLocaleString('tr-TR')} ₺ / gün`
                      : 'Limit tanımlı değil'}
                  </strong>
                </button>
                <button type="button" onClick={() => setCardShopOpen(true)}>
                  <span>Kart internet alışverişi</span>
                  <strong>
                    {approvedCards.filter((c) => c.onlineShoppingEnabled).length}/{approvedCards.length} kart açık
                  </strong>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="dashboard-security-card-title">Son Güvenlik Bildirimleri</p>
              {securityNotifications.length === 0 ? (
                <p className="dashboard-security-empty">Güvenlik bildirimi bulunmuyor.</p>
              ) : (
                <div className="dashboard-security-list">
                  {securityNotifications.map((notification) => (
                    <div key={notification.id} className="dashboard-security-event">
                      <p className="dashboard-security-main">{notification.title}</p>
                      <p className="dashboard-security-sub">{notification.body}</p>
                      <span>{trDate(notification.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {pendingCards.length > 0 && (
          <div className="dashboard-security-note">
            {pendingCards.length} kart başvurunuz onay sürecinde. Onaylanana kadar ödeme işlemlerinde kullanılamaz.
          </div>
        )}
          </>
        )}
        </div>
      </div>

      {/* --- Hesap açma modalı --- */}
      {/* --- İşlem filtreleme modalı --- */}
      <Modal
        open={txFilterOpen}
        onClose={() => setTxFilterOpen(false)}
        title="İşlemleri Filtrele"
        className="max-w-2xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={clearTransactionFilters}
              disabled={!hasTxFilters}
            >
              Filtreleri temizle
            </Button>
            <Button variant="primary" onClick={() => setTxFilterOpen(false)}>
              Tamam
            </Button>
          </>
        }
      >
        <div className="dashboard-tx-filters">
          <Input
            label="Başlangıç"
            type="date"
            value={txFromDate}
            onChange={(e) => setTxFromDate(e.target.value)}
          />
          <Input
            label="Bitiş"
            type="date"
            value={txToDate}
            onChange={(e) => setTxToDate(e.target.value)}
          />
          <Select
            label="Tip"
            options={txTypeOptions}
            value={txType}
            onChange={(e) => setTxType(e.target.value as TransactionHistoryFilters['type'])}
          />
          <Select
            label="Yön"
            options={txDirectionOptions}
            value={txDirection}
            onChange={(e) => setTxDirection(e.target.value as TransactionHistoryFilters['direction'])}
          />
          <Input
            label="Min. tutar"
            type="number"
            min="0"
            value={txMinAmount}
            onChange={(e) => setTxMinAmount(e.target.value)}
          />
          <Input
            label="Maks. tutar"
            type="number"
            min="0"
            value={txMaxAmount}
            onChange={(e) => setTxMaxAmount(e.target.value)}
          />
          <Input
            label="Ara"
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            placeholder="Açıklama, IBAN, kanal"
          />
        </div>

        <div
          className="dashboard-tx-summary"
          aria-label="Filtreli işlem özeti"
          style={{ marginTop: '1.25rem' }}
        >
          <div>
            <span>Gelen</span>
            <strong className="in">{formatTL(historyIncome)}</strong>
          </div>
          <div>
            <span>Giden</span>
            <strong className="out">{formatTL(historyExpense)}</strong>
          </div>
          <div>
            <span>Net</span>
            <strong>{formatTL(historyIncome - historyExpense)}</strong>
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yeni Hesap Aç"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(selectedType)}
            >
              Hesap Aç
            </Button>
          </>
        }
      >
        <Select
          label="Hesap Tipi"
          options={accountTypeOptions}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as AccountType)}
        />
      </Modal>

      {/* --- Para yatırma modalı --- */}
      <Modal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        title="Para Yatır"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDepositOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={depositMutation.isPending}
              onClick={() => depositMutation.mutate()}
            >
              Yatır
            </Button>
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Input
            label="Tutar (₺)"
            type="number"
            placeholder="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </div>
      </Modal>

      {/* --- Transfer modalı --- */}
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Para Gönder (Banka içi)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTransferOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={transferMutation.isPending}
              onClick={() => transferMutation.mutate()}
            >
              Gönder
            </Button>
          </>
        }
      >
        {recipients.length > 0 && (
          <div className="dashboard-modal-field">
            <Select
              label="Kayıtlı alıcı"
              value={selectedRecipientId || '__manual__'}
              onChange={(e) => {
                const value = e.target.value
                if (value === '__manual__') {
                  setSelectedRecipientId('')
                  setToIban('')
                  setTransferDesc('')
                  return
                }
                const recipient = recipients.find((r) => r.id === value)
                setSelectedRecipientId(value)
                setToIban(formatIbanInput(recipient?.iban ?? ''))
                setTransferDesc(recipient?.note ?? '')
                setSaveRecipientAfterTransfer(false)
                setRecipientNameAfterTransfer('')
              }}
              options={[
                { value: '__manual__', label: 'Manuel IBAN gir' },
                ...recipients.map((recipient) => ({
                  value: recipient.id,
                  label: `${recipient.name} · ...${recipient.iban.slice(-4)}`,
                })),
              ]}
            />
          </div>
        )}
        <div className="dashboard-modal-field">
          <Input
            label="Alıcı IBAN"
            placeholder="TR12 3456 7890 1234 5678 9012 34"
            inputMode="numeric"
            maxLength={32}
            value={toIban}
            disabled={!!selectedRecipient}
            onChange={(e) => setToIban(formatIbanInput(e.target.value))}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Tutar (₺)"
            type="number"
            placeholder="0"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Açıklama (opsiyonel)"
            placeholder="Örn. Kira"
            maxLength={20}
            value={transferDesc}
            onChange={(e) => setTransferDesc(e.target.value)}
          />
        </div>
        {showSaveRecipientOption && (
          <div className="dashboard-save-recipient">
            <Checkbox
              label="Bu alıcıyı kaydet"
              checked={saveRecipientAfterTransfer}
              onChange={(e) => setSaveRecipientAfterTransfer(e.target.checked)}
            />
            {saveRecipientAfterTransfer && (
              <Input
                label="Alıcı adı"
                placeholder="Örn. Ev sahibi"
                maxLength={80}
                value={recipientNameAfterTransfer}
                onChange={(e) => setRecipientNameAfterTransfer(e.target.value)}
              />
            )}
          </div>
        )}
      </Modal>

      {/* --- Kayıtlı alıcı ekleme modalı --- */}
      <Modal
        open={recipientOpen}
        onClose={() => setRecipientOpen(false)}
        title="Kayıtlı Alıcı Ekle"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRecipientOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={saveRecipientMutation.isPending}
              onClick={submitRecipient}
            >
              Kaydet
            </Button>
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Input
            label="Alıcı adı"
            placeholder="Örn. Ayşe Yılmaz"
            maxLength={80}
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="IBAN"
            placeholder="TR12 3456 7890 1234 5678 9012 34"
            inputMode="numeric"
            maxLength={32}
            value={recipientIban}
            onChange={(e) => setRecipientIban(formatIbanInput(e.target.value))}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Not (opsiyonel)"
            placeholder="Örn. Kira"
            maxLength={50}
            value={recipientNote}
            onChange={(e) => setRecipientNote(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteRecipientTarget}
        title="Alıcı silinsin mi?"
        message={
          deleteRecipientTarget
            ? `${deleteRecipientTarget.name} kayıtlı alıcılarınızdan kaldırılacak.`
            : ''
        }
        confirmLabel="Sil"
        confirmVariant="destructive"
        loading={deleteRecipientMutation.isPending}
        onConfirm={() => deleteRecipientTarget && deleteRecipientMutation.mutate(deleteRecipientTarget.id)}
        onClose={() => setDeleteRecipientTarget(null)}
      />

      {/* --- Bildirimler modalı --- */}
      <Modal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Bildirimler"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => markReadMutation.mutate()}
              disabled={unreadCount === 0 || markReadMutation.isPending}
            >
              Tümünü okundu yap
            </Button>
            <Button variant="primary" onClick={() => setNotifOpen(false)}>
              Kapat
            </Button>
          </>
        }
      >
        {notifications.length === 0 ? (
          <div className="dashboard-state">Henüz bildiriminiz yok.</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`dashboard-notif ${n.isRead ? '' : 'unread'}`}>
              <div>
                <div className="dashboard-notif-head">
                  <p className="dashboard-notif-title">{n.title}</p>
                  {!n.isRead && <span>Yeni</span>}
                </div>
                <p className="dashboard-notif-body">{n.body}</p>
                <p className="dashboard-notif-date">{trDate(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markOneReadMutation.mutate(n.id)}
                  disabled={markOneReadMutation.isPending}
                >
                  Okundu
                </Button>
              )}
            </div>
          ))
        )}
      </Modal>

      {/* --- Profil modalı --- */}
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Profilim"
        footer={
          <>
            <Button variant="ghost" onClick={() => setProfileOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={profileMutation.isPending}
              disabled={!profileName.trim() || profileName.trim() === user?.fullName}
              onClick={() => profileMutation.mutate()}
            >
              Kaydet
            </Button>
          </>
        }
      >
        {/* Profil başlığı: baş harf avatarı + ad + rol rozeti */}
        <div className="dashboard-profile-head">
          <div className="dashboard-profile-avatar" aria-hidden="true">
            {(user?.fullName ?? '?')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <p className="dashboard-profile-name">{user?.fullName}</p>
            <Badge variant="info">Bireysel Müşteri</Badge>
          </div>
        </div>

        {/* Hesap özeti */}
        <div className="dashboard-profile-stats">
          <div className="dashboard-profile-stat">
            <span>{accounts.length}</span>
            <p>Hesap</p>
          </div>
          <div className="dashboard-profile-stat">
            <span>{balanceVisible ? formatTL(accounts.reduce((s, a) => s + a.balance, 0)) : '₺*****'}</span>
            <p>Toplam bakiye</p>
          </div>
          <div className="dashboard-profile-stat">
            <span>{cards.length}</span>
            <p>Kart</p>
          </div>
        </div>

        {/* Bilgi satırları */}
        <div className="dashboard-profile-info">
          <div className="dashboard-profile-info-row">
            <span>E-posta</span>
            <strong>{user?.email}</strong>
          </div>
          {user?.createdAt && (
            <div className="dashboard-profile-info-row">
              <span>Üyelik tarihi</span>
              <strong>{new Date(user.createdAt).toLocaleDateString('tr-TR')}</strong>
            </div>
          )}
          <div className="dashboard-profile-info-row">
            <span>Günlük havale limiti</span>
            <strong>
              {user?.dailyTransferLimit
                ? `${user.dailyTransferLimit.toLocaleString('tr-TR')} ₺`
                : 'Limitsiz'}
            </strong>
          </div>
        </div>

        {/* Düzenlenebilir ad + güvenlik */}
        <div className="dashboard-modal-field">
          <Input
            label="Ad Soyad"
            placeholder="Adınız ve soyadınız"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
        </div>
        <div className="dashboard-profile-security">
          <span>Güvenlik</span>
          <Button variant="outline" size="sm" onClick={openPasswordModal}>
            Şifre Değiştir
          </Button>
        </div>
      </Modal>

      {/* --- Şifre değiştir modalı --- */}
      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Şifre Değiştir"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPwOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={changePwMutation.isPending}
              disabled={!currentPw || newPw.length < 6 || newPw !== confirmPw}
              onClick={() => changePwMutation.mutate()}
            >
              Güncelle
            </Button>
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Input
            label="Mevcut şifre"
            type="password"
            placeholder="••••••••"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Yeni şifre"
            type="password"
            placeholder="En az 6 karakter"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Yeni şifre (tekrar)"
            type="password"
            placeholder="Yeni şifreyi tekrar girin"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            error={pwMismatch ? 'Şifreler eşleşmiyor.' : undefined}
          />
        </div>
      </Modal>

      {/* --- Günlük havale limiti modalı --- */}
      <Modal
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        title="Günlük Havale Limiti"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLimitOpen(false)}>
              İptal
            </Button>
            {user?.dailyTransferLimit != null && (
              <Button
                variant="outline"
                loading={limitMutation.isPending && limitMutation.variables === null}
                onClick={() => limitMutation.mutate(null)}
              >
                Limiti Kaldır
              </Button>
            )}
            <Button
              variant="primary"
              loading={limitMutation.isPending && limitMutation.variables !== null}
              disabled={!limitInput || Number(limitInput) <= 0}
              onClick={() => limitMutation.mutate(Number(limitInput))}
            >
              Kaydet
            </Button>
          </>
        }
      >
        <p className="dashboard-modal-hint">
          İnternet bankacılığından yapılan günlük havale toplamı bu tutarı aşamaz.
          Boş bırakıp “Limiti Kaldır” ile limiti kaldırabilirsiniz.
        </p>
        <div className="dashboard-modal-field">
          <Input
            label="Günlük limit (₺)"
            type="number"
            placeholder="Örn. 50000"
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
          />
        </div>
      </Modal>

      {/* --- Kart internet alışverişi modalı --- */}
      <Modal
        open={cardShopOpen}
        onClose={() => setCardShopOpen(false)}
        title="Kart İnternet Alışverişi"
        footer={
          <Button variant="primary" onClick={() => setCardShopOpen(false)}>
            Kapat
          </Button>
        }
      >
        <p className="dashboard-modal-hint">
          Kapatılan kartla internet/e-ticaret ödemesi yapılamaz. İstediğinizde tekrar açabilirsiniz.
        </p>
        {approvedCards.length === 0 ? (
          <p className="dashboard-security-empty">Onaylı kartınız bulunmuyor.</p>
        ) : (
          <div className="dashboard-cardshop-list">
            {approvedCards.map((card) => (
              <div key={card.id} className="dashboard-cardshop-row">
                <div>
                  <p className="dashboard-security-main">{card.maskedCardNumber}</p>
                  <p className="dashboard-security-sub">Hesap ...{card.accountIban.slice(-4)}</p>
                </div>
                <Button
                  size="sm"
                  variant={card.onlineShoppingEnabled ? 'outline' : 'primary'}
                  loading={cardShopMutation.isPending && cardShopMutation.variables?.id === card.id}
                  onClick={() =>
                    cardShopMutation.mutate({ id: card.id, enabled: !card.onlineShoppingEnabled })
                  }
                >
                  {card.onlineShoppingEnabled ? 'Kapat' : 'Aç'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* --- Kredi başvuru modalı --- */}
      <Modal
        open={loanOpen}
        onClose={() => setLoanOpen(false)}
        title="Kredi Başvurusu"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLoanOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitLoan}>
              Başvur
            </Button>
          </>
        }
      >
        <div className="dashboard-loan-grid">
        <div className="dashboard-modal-field">
          <Input
            label="TC Kimlik No"
            inputMode="numeric"
            maxLength={11}
            placeholder="Kayıtlı TC kimlik numaranız"
            value={loanNationalId}
            disabled
            onChange={(e) => setLoanNationalId(digitsOnly(e.target.value))}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Yaş"
            type="number"
            placeholder="Örn. 35"
            value={loanAge}
            onChange={(e) => setLoanAge(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Select
            label="Medeni Hal"
            value={loanMarital}
            onChange={(e) => setLoanMarital(e.target.value as 'Single' | 'Married')}
            options={[
              { value: 'Single', label: 'Bekar' },
              { value: 'Married', label: 'Evli' },
            ]}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Çocuk Sayısı"
            type="number"
            placeholder="0"
            value={loanChildren}
            onChange={(e) => setLoanChildren(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Select
            label="Konut Durumu"
            value={loanHousing}
            onChange={(e) => setLoanHousing(e.target.value as 'Tenant' | 'Owner')}
            options={[
              { value: 'Tenant', label: 'Kiracı' },
              { value: 'Owner', label: 'Ev sahibi' },
            ]}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Aylık Gelir (₺)"
            type="number"
            placeholder="Örn. 45000"
            value={loanIncome}
            onChange={(e) => setLoanIncome(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Aylık Gider (₺)"
            type="number"
            placeholder="Örn. 20000"
            value={loanExpenses}
            onChange={(e) => setLoanExpenses(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Çalışma Kıdemi (ay)"
            type="number"
            placeholder="Örn. 36"
            value={loanEmployment}
            onChange={(e) => setLoanEmployment(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Meslek"
            placeholder="Örn. Mühendis"
            value={loanProfession}
            onChange={(e) => setLoanProfession(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Kredi Tutarı (₺)"
            type="number"
            placeholder="Örn. 100000"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Vade (ay)"
            type="number"
            placeholder="12"
            value={loanTerm}
            onChange={(e) => setLoanTerm(e.target.value)}
          />
        </div>
        </div>
        {activeAccounts.length === 0 ? (
          <Alert variant="warning">
            Kredi onaylanırsa para bir hesaba yatırılır. Önce aktif bir hesabınız olmalı.
          </Alert>
        ) : (
          <div className="dashboard-modal-field">
            <Select
              label="Krediyi yatıracağımız hesap"
              options={activeAccounts.map((a) => ({
                value: a.id,
                label: `${a.accountType} · ...${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
              }))}
              value={loanAccountId}
              onChange={(e) => setLoanAccountId(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* --- "Değerlendiriliyor" bekleme ekranı --- */}
      <Modal
        open={applyMutation.isPending}
        onClose={() => {}}
        title="Başvurunuz değerlendiriliyor"
      >
        <div className="dashboard-state dashboard-loan-evaluating">
          <Spinner />
          <p>Başvurunuz yapay zeka tarafından değerlendiriliyor, lütfen bekleyin…</p>
        </div>
      </Modal>

      {/* --- Başvuru sonucu (onay/red + gerekçe) modalı --- */}
      <Modal
        open={!!resultLoan}
        onClose={() => setResultLoan(null)}
        title={
          resultLoan?.status === 'Approved'
            ? 'Başvurunuz Onaylandı'
            : resultLoan?.status === 'Rejected'
              ? 'Başvurunuz Reddedildi'
              : resultLoan?.status === 'PendingApproval'
                ? 'Başvurunuz Onaya Gönderildi'
                : 'Başvuru Sonucu'
        }
        footer={
          <>
            {resultLoan?.status === 'Approved' && (
              <Button
                variant="ghost"
                onClick={() => {
                  const id = resultLoan.id
                  setResultLoan(null)
                  setPlanLoanId(id)
                }}
              >
                Ödeme Planı
              </Button>
            )}
            <Button variant="primary" onClick={() => setResultLoan(null)}>
              Kapat
            </Button>
          </>
        }
      >
        {resultLoan && (
          <>
            <div className="dashboard-loan-result-head">
              <LoanResultMark status={resultLoan.status} />
              <div className="dashboard-loan-result-badge">
                <Badge variant={loanBadgeVariant(resultLoan.status)}>
                  {loanLabel(resultLoan.status)}
                </Badge>
              </div>
            </div>
            <div className="dashboard-plan-summary">
              Talep: <strong>{formatTL(resultLoan.amount)}</strong>
              {' · '}Maks. limit: <strong>{formatTL(resultLoan.maxLimit)}</strong>
              {' · '}Mevcut borç: <strong>{formatTL(resultLoan.existingDebt)}</strong>
              {' · '}Net limit: <strong>{formatTL(resultLoan.netLimit)}</strong>
            </div>
            <p className="dashboard-loan-reason">{resultLoan.aiReason}</p>
            {resultLoan.decisionNote && (
              <p className="dashboard-loan-note">
                <strong>Yetkili notu:</strong> {resultLoan.decisionNote}
              </p>
            )}
          </>
        )}
      </Modal>

      {/* --- Ödeme planı modalı --- */}
      <Modal
        open={!!planLoanId}
        onClose={() => setPlanLoanId(null)}
        title="Ödeme Planı"
        footer={
          <Button variant="primary" onClick={() => setPlanLoanId(null)}>
            Kapat
          </Button>
        }
      >
        {planLoading && (
          <div className="dashboard-state">
            <Spinner />
          </div>
        )}
        {planLoan?.paymentPlan && (
          <>
            <div className="dashboard-plan-summary">
              Aylık taksit: <strong>{formatTL(planLoan.paymentPlan.monthlyPayment)}</strong>
              {' · '}Toplam: <strong>{formatTL(planLoan.paymentPlan.totalPayment)}</strong>
              {' · '}Faiz: %{(planLoan.paymentPlan.monthlyRate * 100).toFixed(1)}/ay
            </div>
            {planLoan.paymentPlan.installments.map((ins) => {
              const paid = ins.no <= planLoan.installmentsPaid
              return (
                <div key={ins.no} className="dashboard-plan-row">
                  <span>
                    {ins.no}. taksit · {trDate(ins.dueDate)}
                    {paid && <span className="dashboard-plan-paid"> · Ödendi</span>}
                  </span>
                  <span>{formatTL(ins.amount)}</span>
                </div>
              )
            })}
          </>
        )}
      </Modal>

      {/* --- Taksit ödeme modalı --- */}
      <Modal
        open={!!payLoan}
        onClose={() => setPayLoan(null)}
        title="Taksit Öde"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayLoan(null)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={payInstallmentMutation.isPending}
              disabled={!payLoanAccountId}
              onClick={() => payInstallmentMutation.mutate()}
            >
              Öde
            </Button>
          </>
        }
      >
        {payLoan && (
          <>
            <div className="dashboard-plan-summary">
              Aylık taksit: <strong>{formatTL(payLoan.monthlyInstallment)}</strong>
              {' · '}Kalan borç: <strong>{formatTL(payLoan.remainingDebt)}</strong>
              {' · '}{payLoan.installmentsPaid}/{payLoan.termMonths} ödendi
            </div>
            {activeAccounts.length === 0 ? (
              <Alert variant="warning">Taksit ödemek için aktif bir hesabınız olmalı.</Alert>
            ) : (
              <div className="dashboard-modal-field">
                <Select
                  label="Taksitin çekileceği hesap"
                  options={activeAccounts.map((a) => ({
                    value: a.id,
                    label: `${a.accountType} · ...${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
                  }))}
                  value={payLoanAccountId}
                  onChange={(e) => setPayLoanAccountId(e.target.value)}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* --- Sanal POS ödeme modalı (2 adım: kart -> 3D Secure) --- */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={payStep === 'form' ? 'Ödeme' : '3D Secure Doğrulama'}
        footer={
          payStep === 'form' ? (
            <>
              <Button variant="ghost" onClick={() => setPayOpen(false)}>
                İptal
              </Button>
              <Button
                variant="primary"
                disabled={payInstrument === 'credit' ? !activeCreditCard : !payCardId}
                onClick={() => setPayStep('3ds')}
              >
                Devam Et
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setPayStep('form')}>
                Geri
              </Button>
              <Button
                variant="primary"
                loading={payMutation.isPending}
                onClick={() => payMutation.mutate()}
              >
                Öde
              </Button>
            </>
          )
        }
      >
        {payStep === 'form' ? (
          approvedCards.length === 0 && !activeCreditCard ? (
            <Alert variant="warning">
              Ödeme yapmak için önce onaylı bir kartınız olmalı. “Kartlarım”dan banka
              kartı ya da “Kredi Kartı”ndan kredi kartı başvurusu yapabilirsiniz.
            </Alert>
          ) : (
            <>
              {/* Ödeme aracı: banka kartı (hesaptan) veya kredi kartı (limitten, taksitli) */}
              {approvedCards.length > 0 && activeCreditCard && (
                <div className="dashboard-modal-field">
                  <Select
                    label="Ödeme Aracı"
                    options={[
                      { value: 'debit', label: 'Banka Kartı (hesaptan)' },
                      { value: 'credit', label: 'Kredi Kartı (taksitli)' },
                    ]}
                    value={payInstrument}
                    onChange={(e) => setPayInstrument(e.target.value as 'debit' | 'credit')}
                  />
                </div>
              )}

              {payInstrument === 'credit' && activeCreditCard ? (
                <>
                  <div className="dashboard-modal-field">
                    <Select
                      label="Kredi Kartı"
                      options={[
                        {
                          value: activeCreditCard.id,
                          label: `${activeCreditCard.maskedCardNumber} · Kullanılabilir ${formatTL(activeCreditCard.availableLimit)}`,
                        },
                      ]}
                      value={activeCreditCard.id}
                      onChange={() => {}}
                    />
                  </div>
                  <div className="dashboard-modal-field">
                    <Select
                      label="Taksit"
                      options={[1, 2, 3, 6, 9, 12].map((n) => ({
                        value: String(n),
                        label: n === 1 ? 'Tek Çekim' : `${n} Taksit`,
                      }))}
                      value={payInstallments}
                      onChange={(e) => setPayInstallments(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="dashboard-modal-field">
                  <Select
                    label="Kart"
                    options={sortedPayCards.map((c) => {
                      // Müşteri hesabı numarasından değil bakiyesinden tanır:
                      // karta bağlı hesabın bakiyesini göster, boşsa işaretle
                      const balance = cardBalance(c.accountIban)
                      const suffix =
                        balance > 0
                          ? ` · ${formatTL(balance)}`
                          : ` · ${formatTL(0)} · bakiye yetersiz`
                      return {
                        value: c.id,
                        label: `${c.maskedCardNumber} · Hesap ...${c.accountIban.slice(-4)}${suffix}`,
                      }
                    })}
                    value={payCardId}
                    onChange={(e) => setPayCardId(e.target.value)}
                  />
                </div>
              )}
              <div className="dashboard-modal-field">
                <Input
                  label="Tutar (₺)"
                  type="number"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                {payInstrument === 'credit' && Number(payInstallments) > 1 && Number(payAmount) > 0 && (
                  <p className="dashboard-field-hint">
                    {payInstallments} taksit × {formatTL(Number(payAmount) / Number(payInstallments))}
                  </p>
                )}
              </div>
              <div className="dashboard-modal-field">
                <Input
                  label="Açıklama (opsiyonel)"
                  placeholder="Örn. Market alışverişi"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                />
              </div>
            </>
          )
        ) : (
          <>
            <p style={{ marginTop: 0, color: '#374151', fontSize: '0.9rem' }}>
              Bankanız tarafından gönderilen 6 haneli kodu girin.
              <br />
              <span style={{ color: '#9ca3af' }}>(test kodu: 123456)</span>
            </p>
            <div className="dashboard-modal-field">
              <Input
                label="Doğrulama Kodu"
                placeholder="123456"
                value={threeDS}
                onChange={(e) => setThreeDS(digitsOnly(e.target.value, 6))}
              />
            </div>
          </>
        )}
      </Modal>

      {/* --- Kredi kartı başvuru modalı --- */}
      <Modal
        open={ccApplyOpen}
        onClose={() => setCcApplyOpen(false)}
        title="Kredi Kartı Başvurusu"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCcApplyOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitCcApply}>
              Başvur
            </Button>
          </>
        }
      >
        <div className="dashboard-loan-grid">
          <div className="dashboard-modal-field">
            <Input
              label="TC Kimlik No"
              inputMode="numeric"
              maxLength={11}
              placeholder="Kayıtlı TC kimlik numaranız"
              value={ccNationalId}
              disabled
              onChange={(e) => setCcNationalId(digitsOnly(e.target.value))}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Yaş"
              type="number"
              placeholder="Örn. 35"
              value={ccAge}
              onChange={(e) => setCcAge(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Select
              label="Medeni Hal"
              value={ccMarital}
              onChange={(e) => setCcMarital(e.target.value as 'Single' | 'Married')}
              options={[
                { value: 'Single', label: 'Bekar' },
                { value: 'Married', label: 'Evli' },
              ]}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Çocuk Sayısı"
              type="number"
              placeholder="0"
              value={ccChildren}
              onChange={(e) => setCcChildren(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Select
              label="Konut Durumu"
              value={ccHousing}
              onChange={(e) => setCcHousing(e.target.value as 'Tenant' | 'Owner')}
              options={[
                { value: 'Tenant', label: 'Kiracı' },
                { value: 'Owner', label: 'Ev sahibi' },
              ]}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Aylık Gelir (₺)"
              type="number"
              placeholder="Örn. 45000"
              value={ccIncome}
              onChange={(e) => setCcIncome(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Aylık Gider (₺)"
              type="number"
              placeholder="Örn. 20000"
              value={ccExpenses}
              onChange={(e) => setCcExpenses(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Çalışma Kıdemi (ay)"
              type="number"
              placeholder="Örn. 36"
              value={ccEmployment}
              onChange={(e) => setCcEmployment(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Meslek"
              placeholder="Örn. Mühendis"
              value={ccProfession}
              onChange={(e) => setCcProfession(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Select
              label="Kesim Günü"
              value={ccStatementDay}
              onChange={(e) => setCcStatementDay(e.target.value)}
              options={Array.from({ length: 28 }, (_, i) => ({
                value: String(i + 1),
                label: `Her ayın ${i + 1}'i`,
              }))}
            />
          </div>
        </div>
        <p className="dashboard-loan-note">
          Son ödeme tarihiniz kesim gününden 10 gün sonradır. Limitiniz gelir/gider
          profilinize göre otomatik belirlenir.
        </p>
      </Modal>

      {/* --- Kredi kartı "değerlendiriliyor" bekleme ekranı --- */}
      <Modal
        open={ccApplyMutation.isPending}
        onClose={() => {}}
        title="Başvurunuz değerlendiriliyor"
      >
        <div className="dashboard-state dashboard-loan-evaluating">
          <Spinner />
          <p>Başvurunuz yapay zeka tarafından değerlendiriliyor, lütfen bekleyin…</p>
        </div>
      </Modal>

      {/* --- Kredi kartı başvuru sonucu modalı --- */}
      <Modal
        open={!!resultCreditCard}
        onClose={() => setResultCreditCard(null)}
        title={
          resultCreditCard?.status === 'Approved'
            ? 'Kredi Kartınız Onaylandı'
            : resultCreditCard?.status === 'Rejected'
              ? 'Başvurunuz Reddedildi'
              : resultCreditCard?.status === 'PendingApproval'
                ? 'Başvurunuz Onaya Gönderildi'
                : 'Başvuru Sonucu'
        }
        footer={
          <Button variant="primary" onClick={() => setResultCreditCard(null)}>
            Kapat
          </Button>
        }
      >
        {resultCreditCard && (
          <>
            <div className="dashboard-loan-result-head">
              <div className="dashboard-loan-result-badge">
                <Badge variant={creditCardBadgeVariant(resultCreditCard.status)}>
                  {creditCardLabel(resultCreditCard.status)}
                </Badge>
              </div>
            </div>
            {resultCreditCard.status !== 'Rejected' && (
              <div className="dashboard-plan-summary">
                Kart limiti: <strong>{formatTL(resultCreditCard.creditLimit)}</strong>
                {' · '}Kesim: <strong>Her ayın {resultCreditCard.statementDay}'i</strong>
              </div>
            )}
            <p className="dashboard-loan-reason">{resultCreditCard.aiReason}</p>
          </>
        )}
      </Modal>

      {/* --- Kredi kartı borç öde modalı --- */}
      <Modal
        open={ccPayOpen}
        onClose={() => setCcPayOpen(false)}
        title="Kredi Kartı Borcu Öde"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCcPayOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={ccPayMutation.isPending}
              disabled={!ccPayAccountId || !(Number(ccPayAmount) > 0)}
              onClick={() => ccPayMutation.mutate()}
            >
              Öde
            </Button>
          </>
        }
      >
        {tryPayAccounts.length === 0 ? (
          <Alert variant="warning">
            Kredi kartı borcu ödemek için aktif bir TL hesabınız olmalı.
          </Alert>
        ) : (
          <>
            {creditCard && (
              <div className="cc-pay-quickrow">
                {currentStatement && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCcPayAmount(String(currentStatement.minimumPayment))}
                    >
                      Asgari {formatTL(currentStatement.minimumPayment)}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCcPayAmount(String(currentStatement.remainingAmount))}
                    >
                      Ekstre {formatTL(currentStatement.remainingAmount)}
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCcPayAmount(String(creditCard.currentDebt))}
                >
                  Tüm Borç {formatTL(creditCard.currentDebt)}
                </Button>
              </div>
            )}
            <div className="dashboard-modal-field">
              <Select
                label="Ödeme yapılacak hesap"
                options={tryPayAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.accountType} · ...${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
                }))}
                value={ccPayAccountId}
                onChange={(e) => setCcPayAccountId(e.target.value)}
              />
            </div>
            <div className="dashboard-modal-field">
              <Input
                label="Tutar (₺)"
                type="number"
                placeholder="0"
                value={ccPayAmount}
                onChange={(e) => setCcPayAmount(e.target.value)}
              />
            </div>
          </>
        )}
      </Modal>

      {/* --- Kredi kartı nakit avans modalı --- */}
      <Modal
        open={ccCashOpen}
        onClose={() => setCcCashOpen(false)}
        title="Nakit Avans"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCcCashOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={ccCashMutation.isPending}
              disabled={!ccCashAccountId || !(Number(ccCashAmount) > 0)}
              onClick={submitCcCashAdvance}
            >
              Kullan
            </Button>
          </>
        }
      >
        {tryPayAccounts.length === 0 ? (
          <Alert variant="warning">
            Nakit avans kullanmak için aktif bir TL hesabınız olmalı.
          </Alert>
        ) : (
          <>
            <Alert variant="info">
              Komisyon ve günlük faiz işlem anında kredi kartı borcunuza yansıtılır.
            </Alert>
            <div className="dashboard-modal-field">
              <Select
                label="Aktarılacak hesap"
                options={tryPayAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.accountType} · ...${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
                }))}
                value={ccCashAccountId}
                onChange={(e) => setCcCashAccountId(e.target.value)}
              />
            </div>
            <div className="dashboard-modal-field">
              <Input
                label="Tutar (₺)"
                type="number"
                placeholder="0"
                value={ccCashAmount}
                onChange={(e) => setCcCashAmount(e.target.value)}
              />
              {ccCashPrincipal > 0 && (
                <p className="dashboard-field-hint">
                  Komisyon/faiz dahil kart borcuna yansıyacak tutar: {formatTL(ccCashDebtIncrease)}
                </p>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* --- Kredi kartı limit artış talebi modalı --- */}
      <Modal
        open={ccLimitOpen}
        onClose={() => setCcLimitOpen(false)}
        title="Limit Artış Talebi"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCcLimitOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" loading={ccLimitMutation.isPending} onClick={submitCcLimitIncrease}>
              Talep Et
            </Button>
          </>
        }
      >
        <div className="dashboard-loan-grid">
          <div className="dashboard-modal-field">
            <Input
              label="Yeni Toplam Limit (₺)"
              type="number"
              placeholder="Örn. 120000"
              value={ccLimitRequested}
              onChange={(e) => setCcLimitRequested(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Yaş"
              type="number"
              placeholder="Örn. 35"
              value={ccLimitAge}
              onChange={(e) => setCcLimitAge(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Select
              label="Medeni Hal"
              value={ccLimitMarital}
              onChange={(e) => setCcLimitMarital(e.target.value as 'Single' | 'Married')}
              options={[
                { value: 'Single', label: 'Bekar' },
                { value: 'Married', label: 'Evli' },
              ]}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Çocuk Sayısı"
              type="number"
              placeholder="0"
              value={ccLimitChildren}
              onChange={(e) => setCcLimitChildren(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Select
              label="Konut Durumu"
              value={ccLimitHousing}
              onChange={(e) => setCcLimitHousing(e.target.value as 'Tenant' | 'Owner')}
              options={[
                { value: 'Tenant', label: 'Kiracı' },
                { value: 'Owner', label: 'Ev sahibi' },
              ]}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Aylık Gelir (₺)"
              type="number"
              placeholder="Örn. 45000"
              value={ccLimitIncome}
              onChange={(e) => setCcLimitIncome(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Aylık Gider (₺)"
              type="number"
              placeholder="Örn. 20000"
              value={ccLimitExpenses}
              onChange={(e) => setCcLimitExpenses(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Çalışma Kıdemi (ay)"
              type="number"
              placeholder="Örn. 36"
              value={ccLimitEmployment}
              onChange={(e) => setCcLimitEmployment(e.target.value)}
            />
          </div>
          <div className="dashboard-modal-field">
            <Input
              label="Meslek"
              placeholder="Örn. Mühendis"
              value={ccLimitProfession}
              onChange={(e) => setCcLimitProfession(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* --- Fatura ödeme modalı (sorgula -> öde) --- */}
      <Modal
        open={billOpen}
        onClose={() => setBillOpen(false)}
        title="Fatura Öde"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBillOpen(false)}>
              İptal
            </Button>
            {billInquiry && !billInquiry.isPaid ? (
              <Button
                variant="primary"
                loading={payBillMutation.isPending}
                disabled={!billAccountId || activeAccounts.length === 0}
                onClick={() => payBillMutation.mutate()}
              >
                {formatTL(billInquiry.amount)} Öde
              </Button>
            ) : (
              <Button
                variant="primary"
                loading={inquireMutation.isPending}
                disabled={!billerCode || subscriberNo.length < 6}
                onClick={() => inquireMutation.mutate()}
              >
                Sorgula
              </Button>
            )}
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Select
            label="Kurum Türü"
            options={BILL_CATEGORIES}
            value={billCategory}
            onChange={(e) => changeBillCategory(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Select
            label="Kurum"
            options={[
              { value: '', label: 'Kurum seçiniz…' },
              ...categoryBillers.map((b) => ({ value: b.code, label: b.name })),
            ]}
            value={billerCode}
            onChange={(e) => {
              setBillerCode(e.target.value)
              setBillInquiry(null)
            }}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Abone / Tesisat No"
            placeholder="Örn. 1002003004"
            value={subscriberNo}
            onChange={(e) => {
              setSubscriberNo(digitsOnly(e.target.value, 20))
              setBillInquiry(null)
            }}
          />
        </div>

        {billInquiry &&
          (billInquiry.isPaid ? (
            <Alert variant="success">
              {billInquiry.billerName} · {billInquiry.period} dönemi faturası zaten
              ödenmiş. Borç bulunmuyor.
            </Alert>
          ) : (
            <>
              <div className="dashboard-bill-summary">
                <div className="dashboard-bill-summary-row">
                  <span>Güncel borç</span>
                  <strong>{formatTL(billInquiry.amount)}</strong>
                </div>
                <div className="dashboard-bill-summary-row">
                  <span>Son ödeme tarihi</span>
                  <span>{new Date(billInquiry.dueDate).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="dashboard-bill-summary-row">
                  <span>Dönem</span>
                  <span>{billInquiry.period}</span>
                </div>
              </div>
              {activeAccounts.length === 0 ? (
                <Alert variant="warning">
                  Fatura ödemek için aktif bir hesabınız olmalı.
                </Alert>
              ) : (
                <div className="dashboard-modal-field">
                  <Select
                    label="Ödenecek hesap"
                    options={activeAccounts.map((a) => ({
                      value: a.id,
                      label: `${a.accountType} · ...${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
                    }))}
                    value={billAccountId}
                    onChange={(e) => setBillAccountId(e.target.value)}
                  />
                </div>
              )}
            </>
          ))}
      </Modal>

      {/* --- Düzenli ödeme talimatı oluşturma modalı --- */}
      <Modal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="Yeni Düzenli Ödeme Talimatı"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOrderOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={createOrderMutation.isPending}
              disabled={!orderFormValid || activeAccounts.length === 0}
              onClick={() => createOrderMutation.mutate()}
            >
              Talimat Oluştur
            </Button>
          </>
        }
      >
        {activeAccounts.length === 0 ? (
          <Alert variant="warning">
            Talimat oluşturmak için aktif bir hesabınız olmalı.
          </Alert>
        ) : (
          <>
            <div className="dashboard-modal-field">
              <Select
                label="Talimat Tipi"
                options={[
                  { value: 'AutoBill', label: 'Otomatik Fatura Ödeme' },
                  { value: 'RecurringTransfer', label: 'Düzenli Havale' },
                ]}
                value={orderType}
                onChange={(e) =>
                  setOrderType(e.target.value as 'AutoBill' | 'RecurringTransfer')
                }
              />
            </div>
            <div className="dashboard-modal-field">
              <Input
                label="Talimat Adı"
                placeholder={orderType === 'AutoBill' ? 'Örn. Evin doğalgazı' : 'Örn. Ev kirası'}
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
              />
            </div>

            {orderType === 'AutoBill' ? (
              <>
                <div className="dashboard-modal-field">
                  <Select
                    label="Kurum Türü"
                    options={BILL_CATEGORIES}
                    value={orderCategory}
                    onChange={(e) => {
                      setOrderCategory(e.target.value)
                      setOrderBillerCode('')
                    }}
                  />
                </div>
                <div className="dashboard-modal-field">
                  <Select
                    label="Kurum"
                    options={[
                      { value: '', label: 'Kurum seçiniz…' },
                      ...orderCategoryBillers.map((b) => ({ value: b.code, label: b.name })),
                    ]}
                    value={orderBillerCode}
                    onChange={(e) => setOrderBillerCode(e.target.value)}
                  />
                </div>
                <div className="dashboard-modal-field">
                  <Input
                    label="Abone / Tesisat No"
                    placeholder="Örn. 1002003004"
                    value={orderSubscriberNo}
                    onChange={(e) => setOrderSubscriberNo(digitsOnly(e.target.value, 20))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="dashboard-modal-field">
                  <Input
                    label="Alıcı IBAN"
                    placeholder="TR.. .. .. .."
                    value={orderTargetIban}
                    onChange={(e) => setOrderTargetIban(formatIbanInput(e.target.value))}
                  />
                </div>
                <div className="dashboard-modal-field">
                  <Input
                    label="Tutar (₺)"
                    type="number"
                    placeholder="0"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="dashboard-modal-field">
              <Select
                label="Ödeme yapılacak hesap"
                options={activeAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.accountType} · ...${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
                }))}
                value={orderAccountId}
                onChange={(e) => setOrderAccountId(e.target.value)}
              />
            </div>
            <div className="dashboard-modal-field">
              <Select
                label="Her ayın kaçında çalışsın"
                options={Array.from({ length: 28 }, (_, i) => ({
                  value: String(i + 1),
                  label: `Her ayın ${i + 1}. günü`,
                }))}
                value={orderDay}
                onChange={(e) => setOrderDay(e.target.value)}
              />
            </div>
          </>
        )}
      </Modal>

      {/* --- Vadeli mevduat açma modalı --- */}
      <Modal
        open={timeDepositOpen}
        onClose={() => setTimeDepositOpen(false)}
        title="Yeni Vadeli Mevduat"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTimeDepositOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={openDepositMutation.isPending}
              disabled={
                activeAccounts.length === 0 ||
                !depositTerm ||
                Number(depositPrincipal) < 1000
              }
              onClick={() => openDepositMutation.mutate()}
            >
              Vadeli Hesap Aç
            </Button>
          </>
        }
      >
        {activeAccounts.length === 0 ? (
          <Alert variant="warning">
            Vadeli mevduat açmak için aktif bir hesabınız olmalı.
          </Alert>
        ) : (
          <>
            <div className="dashboard-modal-field">
              <Select
                label="Vade"
                options={depositProducts.map((p) => ({
                  value: String(p.termDays),
                  label: `${p.label} · %${(p.annualRate * 100).toFixed(0)} yıllık`,
                }))}
                value={depositTerm}
                onChange={(e) => setDepositTerm(e.target.value)}
              />
            </div>
            <div className="dashboard-modal-field">
              <Input
                label="Anapara (₺)"
                type="number"
                placeholder="En az 1.000"
                value={depositPrincipal}
                onChange={(e) => setDepositPrincipal(e.target.value)}
              />
            </div>
            <div className="dashboard-modal-field">
              <Select
                label="Anaparanın çekileceği hesap"
                options={activeAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.accountType} · ...${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
                }))}
                value={timeDepositAccountId}
                onChange={(e) => setTimeDepositAccountId(e.target.value)}
              />
            </div>

            {depositPreview && (
              <div className="dashboard-bill-summary">
                <div className="dashboard-bill-summary-row">
                  <span>Brüt faiz</span>
                  <span>{formatTL(depositPreview.gross)}</span>
                </div>
                <div className="dashboard-bill-summary-row">
                  <span>Stopaj (%7,5)</span>
                  <span>-{formatTL(depositPreview.withholding)}</span>
                </div>
                <div className="dashboard-bill-summary-row">
                  <span>Net faiz</span>
                  <span>{formatTL(depositPreview.net)}</span>
                </div>
                <div className="dashboard-bill-summary-row">
                  <span>Vade sonu toplam</span>
                  <strong>{formatTL(depositPreview.total)}</strong>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* --- Vadeli mevduat erken bozma onayı --- */}
      <Modal
        open={closeDepositTarget !== null}
        onClose={() => setCloseDepositTarget(null)}
        title="Vadeli Mevduatı Boz"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCloseDepositTarget(null)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              loading={closeDepositMutation.isPending}
              onClick={() =>
                closeDepositTarget && closeDepositMutation.mutate(closeDepositTarget.id)
              }
            >
              Bozmayı Onayla
            </Button>
          </>
        }
      >
        {closeDepositTarget && (
          <p style={{ margin: 0, color: '#374151', fontSize: '0.9rem' }}>
            <strong>{formatTL(closeDepositTarget.principal)}</strong> tutarındaki vadeli
            mevduatı vadesinden önce bozuyorsunuz. <strong>Faiz işlemez</strong>; yalnızca
            anapara hesabınıza geri yatar. Devam edilsin mi?
          </p>
        )}
      </Modal>

      {/* --- Döviz / Altın al-sat modalı --- */}
      <Modal
        open={fxOpen}
        onClose={() => setFxOpen(false)}
        title={fxSide === 'Buy' ? 'Döviz / Altın Al' : 'Döviz / Altın Sat'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFxOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={fxTradeMutation.isPending}
              disabled={!fxFormValid}
              onClick={() => fxTradeMutation.mutate()}
            >
              {fxSide === 'Buy' ? 'Al' : 'Sat'}
            </Button>
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Select
            label="İşlem"
            options={[
              { value: 'Buy', label: 'Al' },
              { value: 'Sell', label: 'Sat' },
            ]}
            value={fxSide}
            onChange={(e) => setFxSide(e.target.value as FxTradeSide)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Select
            label="Birim"
            options={rates.map((r) => ({ value: r.currency, label: `${r.code} · ${r.name}` }))}
            value={fxCurrency}
            onChange={(e) => setFxCurrency(e.target.value as Currency)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Select
            label="TL Hesabı"
            options={tryAccounts.map((a) => ({
              value: a.id,
              label: `${formatIban(a.iban)} · ${formatTL(a.balance)}`,
            }))}
            value={fxTryAccountId}
            onChange={(e) => setFxTryAccountId(e.target.value)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label={`Miktar (${CURRENCY_META[fxCurrency].code})`}
            type="number"
            min="0"
            placeholder="0"
            value={fxAmount}
            onChange={(e) => setFxAmount(e.target.value)}
          />
          {fxSide === 'Sell' && (
            <p className="dashboard-fx-hint">
              Mevcut bakiye: {formatCurrencyAmount(fxSellableBalance, fxCurrency)}
            </p>
          )}
        </div>
        {fxPreview && (
          <div className="dashboard-bill-summary">
            <div>
              <span>Kur (1 {CURRENCY_META[fxCurrency].code})</span>
              <strong>{formatTL(fxPreview.rate)}</strong>
            </div>
            <div>
              <span>{fxSide === 'Buy' ? 'Ödenecek tutar' : 'Alınacak tutar'}</span>
              <strong>{formatTL(fxPreview.tryAmount)}</strong>
            </div>
          </div>
        )}
      </Modal>

      {/* --- Kur alarmı modalı --- */}
      <Modal
        open={fxAlertOpen}
        onClose={() => setFxAlertOpen(false)}
        title="Kur Alarmı Kur"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFxAlertOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={createFxAlertMutation.isPending}
              disabled={!fxAlertValid}
              onClick={() => createFxAlertMutation.mutate()}
            >
              Alarm Kur
            </Button>
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Select
            label="Birim"
            options={rates.map((r) => ({ value: r.currency, label: `${r.code} · ${r.name}` }))}
            value={fxAlertCurrency}
            onChange={(e) => setFxAlertCurrency(e.target.value as Currency)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Select
            label="Koşul"
            options={[
              { value: 'Above', label: 'Hedefin üstüne çıkınca' },
              { value: 'Below', label: 'Hedefin altına inince' },
            ]}
            value={fxAlertDirection}
            onChange={(e) => setFxAlertDirection(e.target.value as FxAlertDirection)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label="Hedef Kur (₺)"
            type="number"
            min="0"
            step="0.0001"
            value={fxAlertTarget}
            onChange={(e) => setFxAlertTarget(e.target.value)}
          />
        </div>
        {rateByCurrency.get(fxAlertCurrency) && (
          <div className="dashboard-bill-summary">
            <div>
              <span>Güncel Ortalama</span>
              <strong>
                {formatTL(
                  ((rateByCurrency.get(fxAlertCurrency)?.buyRate ?? 0)
                    + (rateByCurrency.get(fxAlertCurrency)?.sellRate ?? 0)) / 2,
                )}
              </strong>
            </div>
            <div>
              <span>Alarm</span>
              <strong>{fxAlertDirection === 'Above' ? 'Yükselince' : 'Düşünce'}</strong>
            </div>
          </div>
        )}
      </Modal>

      {/* --- Çapraz dönüşüm modalı --- */}
      <Modal
        open={fxConvertOpen}
        onClose={() => setFxConvertOpen(false)}
        title="Döviz / Altın Dönüştür"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFxConvertOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={fxConvertMutation.isPending}
              disabled={!fxConvertValid}
              onClick={() => fxConvertMutation.mutate()}
            >
              Dönüştür
            </Button>
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Select
            label="Kaynak Birim"
            options={fxAccounts.map((a) => ({
              value: a.currency,
              label: `${CURRENCY_META[a.currency].code} · ${formatCurrencyAmount(a.balance, a.currency)}`,
            }))}
            value={fxConvertFrom}
            onChange={(e) => {
              const next = e.target.value as Currency
              setFxConvertFrom(next)
              if (next === fxConvertTo) {
                setFxConvertTo((['USD', 'EUR', 'XAU'] as Currency[]).find((c) => c !== next) ?? 'EUR')
              }
            }}
          />
        </div>
        <div className="dashboard-modal-field">
          <Select
            label="Hedef Birim"
            options={rates
              .filter((r) => r.currency !== fxConvertFrom)
              .map((r) => ({ value: r.currency, label: `${r.code} · ${r.name}` }))}
            value={fxConvertTo}
            onChange={(e) => setFxConvertTo(e.target.value as Currency)}
          />
        </div>
        <div className="dashboard-modal-field">
          <Input
            label={`Miktar (${CURRENCY_META[fxConvertFrom].code})`}
            type="number"
            min="0"
            placeholder="0"
            value={fxConvertAmount}
            onChange={(e) => setFxConvertAmount(e.target.value)}
          />
          <p className="dashboard-fx-hint">
            Mevcut bakiye: {formatCurrencyAmount(fxConvertSourceBalance, fxConvertFrom)}
          </p>
        </div>
        {fxConvertPreview && (
          <div className="dashboard-bill-summary">
            <div>
              <span>TL Ara Karşılığı</span>
              <strong>{formatTL(fxConvertPreview.tryAmount)}</strong>
            </div>
            <div>
              <span>Hesaba Geçecek</span>
              <strong>{formatCurrencyAmount(fxConvertPreview.toAmount, fxConvertTo)}</strong>
            </div>
          </div>
        )}
      </Modal>

      {/* --- Kart açma modalı --- */}
      <Modal
        open={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        title="Kart Aç"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCardModalOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={createCardMutation.isPending}
              disabled={!cardAccountId}
              onClick={() => createCardMutation.mutate()}
            >
              Kart Aç
            </Button>
          </>
        }
      >
        {activeAccounts.length === 0 ? (
          <Alert variant="warning">
            Kart açmak için önce aktif bir hesabınız olmalı.
          </Alert>
        ) : (
          <div className="dashboard-modal-field">
            <Select
              label="Bağlanacak Hesap"
              options={activeAccounts.map((a) => ({
                value: a.id,
                label: `${a.accountType} · ...${a.iban.slice(-4)}`,
              }))}
              value={cardAccountId}
              onChange={(e) => setCardAccountId(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* --- Kart ekstresi (PDF) modalı --- */}
      <Modal
        open={!!statementCard}
        onClose={() => setStatementCard(null)}
        title="Kart Ekstresi"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStatementCard(null)}>
              İptal
            </Button>
            <Button variant="primary" onClick={generateStatement}>
              PDF İndir
            </Button>
          </>
        }
      >
        {statementCard && (
          <>
            <p className="dashboard-close-lead">
              <strong>{statementCard.maskedCardNumber}</strong> kartının seçtiğiniz
              aydaki harcamalarını PDF olarak indirin.
            </p>
            <div className="dashboard-modal-field">
              <Select
                label="Dönem"
                options={statementMonthOptions}
                value={statementMonth}
                onChange={(e) => setStatementMonth(e.target.value)}
              />
            </div>
          </>
        )}
      </Modal>

      {/* --- Hesap kapatma onayı (bakiye aktarımı + bağlı kart silme) --- */}
      <Modal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        title="Hesabı Kapat"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCloseTarget(null)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              loading={closeMutation.isPending}
              disabled={
                !!closeTarget &&
                closeTarget.balance > 0 &&
                closeDestOptions.length === 0
              }
              onClick={() => closeMutation.mutate()}
            >
              Hesabı Kapat
            </Button>
          </>
        }
      >
        {closeTarget && (
          <>
            <p className="dashboard-close-lead">
              <strong>...{closeTarget.iban.slice(-4)}</strong> numaralı hesabı kapatmak
              üzeresiniz. Bu işlem geri alınamaz.
            </p>

            {closeTarget.balance > 0 &&
              (closeDestOptions.length > 0 ? (
                <div className="dashboard-modal-field">
                  <Select
                    label={`Bakiye (${formatTL(closeTarget.balance)}) şu hesaba aktarılsın`}
                    options={closeDestOptions}
                    value={closeDestId}
                    onChange={(e) => setCloseDestId(e.target.value)}
                  />
                </div>
              ) : (
                <Alert variant="warning">
                  Hesapta {formatTL(closeTarget.balance)} bakiye var ama aktarılacak
                  başka aktif hesabınız yok. Önce yeni bir hesap açın.
                </Alert>
              ))}

            {cardsForAccount(closeTarget).length > 0 && (
              <Alert variant="warning">
                Bu hesaba bağlı aşağıdaki kart(lar) da kapatılıp silinecek:
                <ul className="dashboard-close-cards">
                  {cardsForAccount(closeTarget).map((c) => (
                    <li key={c.id}>{c.maskedCardNumber}</li>
                  ))}
                </ul>
                Onaylıyor musunuz?
              </Alert>
            )}
          </>
        )}
      </Modal>

      {/* --- Hesap dondurma onayı (kartlar bloke edilir) --- */}
      <Modal
        open={!!freezeTarget}
        onClose={() => setFreezeTarget(null)}
        title="Hesabı Dondur"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFreezeTarget(null)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              loading={freezeMutation.isPending}
              onClick={() => freezeTarget && freezeMutation.mutate(freezeTarget.id)}
            >
              Hesabı Dondur
            </Button>
          </>
        }
      >
        {freezeTarget && (
          <>
            <p className="dashboard-close-lead">
              <strong>...{freezeTarget.iban.slice(-4)}</strong> numaralı hesap dondurulacak.
              Dondurulan hesapta işlem yapılamaz; istediğiniz zaman “Aktifleştir” ile geri
              açabilirsiniz.
            </p>
            {cardsForAccount(freezeTarget).some((c) => c.status === 'Approved') && (
              <Alert variant="info">
                Bu hesaba bağlı kart(lar) geçici olarak bloke edilecek; hesabı
                aktifleştirince tekrar kullanılabilir olacak.
              </Alert>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
