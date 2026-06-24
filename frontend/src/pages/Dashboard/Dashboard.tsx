import { useEffect, useState } from 'react'
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
import { useAuth } from '../../context/AuthContext'
import {
  getAccounts,
  createAccount,
  closeAccount,
  freezeAccount,
  reactivateAccount,
} from '../../api/accountApi'
import { updateProfile } from '../../api/authApi'
import { getNotifications, markAllNotificationsRead } from '../../api/notificationApi'
import { deposit, transfer, getHistory } from '../../api/transactionApi'
import { applyLoan, getMyLoans, getLoanDetail } from '../../api/loanApi'
import { pay, getMyPayments } from '../../api/paymentApi'
import { createCard, getMyCards } from '../../api/cardApi'
import { getApiErrorMessage } from '../../lib/apiError'
import { usePageTitle } from '../../lib/usePageTitle'
import { digitsOnly } from '../../lib/format'
import type {
  Account,
  AccountType,
  CardStatus,
  Loan,
  LoanStatus,
  PaymentStatus,
  Transaction,
} from '../../lib/types'
import './Dashboard.css'

const accountTypeOptions = [
  { value: 'Bireysel', label: 'Bireysel Hesap' },
  { value: 'Isletme', label: 'İşletme Hesabı' },
]

const PAGE_SIZE = 5

// İşlem geçmişinde "tüm hesaplar" seçeneğinin özel değeri
const ALL_ACCOUNTS = '__all__'

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

// İşlem geçmişi satır başlığı (tipe göre)
const txTitle = (tx: Transaction) => {
  if (tx.type === 'Deposit') return 'Para Yatırma'
  if (tx.type === 'Payment') return 'POS Ödemesi'
  if (tx.type === 'Refund') return 'POS İade'
  return tx.direction === 'Out'
    ? `Transfer → ${tx.counterpartyIban}`
    : `Transfer ← ${tx.counterpartyIban}`
}

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

const trDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

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

// Garanti gibi: üstte sekmeler, tek seferde tek bölüm görünür (aşağı kaydırma derdi yok)
const DASHBOARD_TABS = [
  { id: 'accounts', label: 'Hesaplarım' },
  { id: 'transactions', label: 'İşlemler' },
  { id: 'loans', label: 'Krediler' },
  { id: 'cards', label: 'Kartlar' },
  { id: 'payments', label: 'Ödemeler' },
] as const
type DashboardTab = (typeof DASHBOARD_TABS)[number]['id']

// Kullanıcının görmek istediği sekmeler localStorage'da saklanır (kişiselleştirme)
const TABS_STORAGE_KEY = 'turkcellbank_dashboard_tabs'

export function Dashboard() {
  usePageTitle('Panel')
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const queryClient = useQueryClient()

  // Aktif sekme — varsayılan: Hesaplarım
  const [activeTab, setActiveTab] = useState<DashboardTab>('accounts')

  // Görünür sekmeler (kullanıcı ekleyip çıkarabilir; localStorage'da kalıcı)
  const [visibleTabs, setVisibleTabs] = useState<DashboardTab[]>(() => {
    try {
      const raw = localStorage.getItem(TABS_STORAGE_KEY)
      if (raw) {
        const arr = JSON.parse(raw) as DashboardTab[]
        const valid = arr.filter((id) => DASHBOARD_TABS.some((t) => t.id === id))
        if (valid.length > 0) return valid
      }
    } catch {
      /* bozuk kayıt -> varsayılana dön */
    }
    return DASHBOARD_TABS.map((t) => t.id)
  })
  const [tabsEditOpen, setTabsEditOpen] = useState(false)

  // Tercihi kaydet; aktif sekme gizlendiyse ilk görünür sekmeye geç
  useEffect(() => {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(visibleTabs))
    if (!visibleTabs.includes(activeTab)) setActiveTab(visibleTabs[0])
  }, [visibleTabs, activeTab])

  function toggleTab(id: DashboardTab) {
    setVisibleTabs((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev // en az bir bölüm görünür kalsın
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
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
  function openNotifications() {
    setNotifOpen(true)
    if (unreadCount > 0) markReadMutation.mutate() // açınca okundu işaretle
  }

  // --- Hesaplar ---
  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })
  const accounts = data?.data ?? []

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
        toIban,
        amount: Number(transferAmount),
        description: transferDesc || undefined,
      }),
    onSuccess: () => {
      refresh()
      setTransferOpen(false)
      toast.success('Transfer başarılı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Transfer başarısız.')),
  })

  // --- İşlem geçmişi (seçili hesap ya da tüm hesaplar) ---
  const [historyAccountId, setHistoryAccountId] = useState('')
  const [txVisible, setTxVisible] = useState(PAGE_SIZE)
  useEffect(() => {
    // Varsayılan: tüm hesapların işlemleri birlikte görünsün
    if (!historyAccountId && accounts.length > 0) {
      setHistoryAccountId(ALL_ACCOUNTS)
    }
  }, [accounts, historyAccountId])

  const isAllAccounts = historyAccountId === ALL_ACCOUNTS

  // Tek hesap görünümü
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['transactions', historyAccountId],
    queryFn: () => getHistory(historyAccountId),
    enabled: !!historyAccountId && !isAllAccounts,
  })

  // Tüm hesaplar görünümü — her hesabın geçmişini paralel çek, sonra birleştir
  const allHistories = useQueries({
    queries: accounts.map((a) => ({
      queryKey: ['transactions', a.id],
      queryFn: () => getHistory(a.id),
      enabled: isAllAccounts,
    })),
  })

  // Birleşik liste: her işlemi ait olduğu hesabın IBAN'ı ile etiketle, tarihe göre sırala
  type HistoryRow = Transaction & { accountIban?: string }
  const mergedHistory: HistoryRow[] = isAllAccounts
    ? accounts
        .flatMap((a, i) =>
          (allHistories[i]?.data?.data ?? []).map((tx) => ({
            ...tx,
            accountIban: a.iban,
          })),
        )
        .sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))
    : []

  const history: HistoryRow[] = isAllAccounts ? mergedHistory : (historyData?.data ?? [])
  const historyBusy = isAllAccounts
    ? allHistories.some((q) => q.isLoading)
    : historyLoading

  // --- Krediler ---
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: getMyLoans,
  })
  const loans = loansData?.data ?? []

  const [loanOpen, setLoanOpen] = useState(false)
  const [loanNationalId, setLoanNationalId] = useState('')
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
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      if (res.data) setResultLoan(res.data) // sonuç modalını aç
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Başvuru yapılamadı.')),
  })

  function openLoanApply() {
    setLoanNationalId('')
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
    setLoanOpen(false) // formu kapat -> "değerlendiriliyor" ekranı görünsün
    applyMutation.mutate()
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
  // Kart açılabilir hesaplar: aktif ve dondurulmamış (dondurulmuş hesaba kart açılamaz)
  const activeAccounts = accounts.filter((a) => a.isActive && !a.isFrozen)

  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [cardAccountId, setCardAccountId] = useState('')
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

  // --- Sanal POS (ödemeler) ---
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: getMyPayments,
  })
  const payments = paymentsData?.data ?? []
  const [payVisible, setPayVisible] = useState(PAGE_SIZE)

  const [payOpen, setPayOpen] = useState(false)
  const [payStep, setPayStep] = useState<'form' | '3ds'>('form')
  const [payCardId, setPayCardId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDesc, setPayDesc] = useState('')
  const [threeDS, setThreeDS] = useState('')

  const payMutation = useMutation({
    mutationFn: () =>
      pay({
        cardId: payCardId,
        amount: Number(payAmount),
        threeDSCode: threeDS,
        description: payDesc || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setPayOpen(false)
      toast.success('Ödeme başarılı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Ödeme başarısız.')),
  })

  function openPay() {
    setPayStep('form')
    // Varsayılan: bakiyesi olan kartlardan en yükseği (yoksa ilk onaylı kart)
    const funded = sortedPayCards.find((c) => cardBalance(c.accountIban) > 0)
    setPayCardId(funded?.id ?? sortedPayCards[0]?.id ?? '')
    setPayAmount('')
    setPayDesc('')
    setThreeDS('')
    setPayOpen(true)
  }

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

  const totalBalance = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0)
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
    setTransferOpen(true)
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
            className="dashboard-bell"
            onClick={openNotifications}
            aria-label="Bildirimler"
          >
            🔔
            {unreadCount > 0 && (
              <span className="dashboard-bell-badge">{unreadCount}</span>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15"
            onClick={openProfile}
          >
            Profil
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/70 text-white hover:bg-white/15"
            onClick={handleLogout}
          >
            Çıkış
          </Button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1 className="dashboard-greeting">Merhaba, {firstName} 👋</h1>

        <div className="dashboard-summary">
          <p className="dashboard-summary-label">Toplam Bakiye</p>
          <p className="dashboard-summary-value">{formatTL(totalBalance)}</p>
        </div>

        {/* Bölüm sekmeleri — tıklanınca ilgili bölüm gösterilir (kaydırma yok) */}
        <nav className="dashboard-tabs">
          {DASHBOARD_TABS.filter((t) => visibleTabs.includes(t.id)).map((t) => (
            <button
              key={t.id}
              type="button"
              className={activeTab === t.id ? 'dashboard-tab active' : 'dashboard-tab'}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className="dashboard-tab-edit"
            onClick={() => setTabsEditOpen(true)}
            aria-label="Sekmeleri düzenle"
            title="Sekmeleri düzenle"
          >
            ✎ Düzenle
          </button>
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
            Panelde görmek istediğin bölümleri seç:
          </p>
          {DASHBOARD_TABS.map((t) => (
            <div key={t.id} className="dashboard-tab-edit-row">
              <Checkbox
                label={t.label}
                checked={visibleTabs.includes(t.id)}
                onChange={() => toggleTab(t.id)}
              />
            </div>
          ))}
        </Modal>

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
        {!isLoading && !isError && accounts.length === 0 && (
          <div className="dashboard-state">
            Henüz hesabınız yok. “+ Hesap Aç” ile başlayabilirsiniz.
          </div>
        )}

        {accounts.length > 0 && (
          <div className="dashboard-accounts">
            {accounts.map((acc) => (
              <Card key={acc.id}>
                <CardContent>
                  <div className="dashboard-account-top">
                    <Badge variant="info">
                      {acc.accountType === 'Bireysel' ? 'Bireysel' : 'İşletme'}
                    </Badge>
                    {acc.isFrozen && <Badge variant="warning">Dondurulmuş</Badge>}
                  </div>
                  <div className="dashboard-account-iban-row">
                    <span className="dashboard-account-iban">{acc.iban}</span>
                    <button
                      type="button"
                      className="dashboard-iban-copy"
                      onClick={() => copyIban(acc.iban)}
                    >
                      Kopyala
                    </button>
                  </div>
                  <p className="dashboard-account-balance">{formatTL(acc.balance)}</p>
                </CardContent>
                <CardFooter>
                  <div className="dashboard-account-footer">
                    {acc.isFrozen ? (
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
          <h2 className="dashboard-section-title">Son İşlemler</h2>
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
                {history.slice(0, txVisible).map((tx) => (
                  <div key={tx.id} className="dashboard-tx-row">
                    <div>
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
                      </p>
                    </div>
                    <span
                      className={`dashboard-tx-amount ${tx.direction === 'In' ? 'in' : 'out'}`}
                    >
                      {tx.direction === 'In' ? '+' : '-'}
                      {formatTL(tx.amount)}
                    </span>
                  </div>
                ))}
                {history.length > txVisible && (
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
        {/* Kartlarım */}
        <div className="dashboard-section-head" style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Kartlarım</h2>
          <Button size="sm" variant="primary" onClick={openCardModal}>
            + Kart Aç
          </Button>
        </div>

        <Card>
          <CardContent>
            {cardsLoading ? (
              <ListSkeleton />
            ) : cards.length === 0 ? (
              <div className="dashboard-state">Henüz kartınız yok.</div>
            ) : (
              cards.map((c) => (
                <div key={c.id} className="dashboard-loan-row">
                  <div>
                    <p className="dashboard-loan-amount">{c.maskedCardNumber}</p>
                    <p className="dashboard-loan-sub">
                      Son kullanma {String(c.expiryMonth).padStart(2, '0')}/{c.expiryYear}
                      {' · '}
                      Hesap ...{c.accountIban.slice(-4)}
                    </p>
                  </div>
                  <Badge variant={cardBadgeVariant(c.status)}>
                    {cardLabel(c.status)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
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
      </div>

      {/* --- Hesap açma modalı --- */}
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
        <div className="dashboard-modal-field">
          <Input
            label="Alıcı IBAN"
            placeholder="TR..."
            value={toIban}
            onChange={(e) => setToIban(e.target.value)}
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
      </Modal>

      {/* --- Bildirimler modalı --- */}
      <Modal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Bildirimler"
        footer={
          <Button variant="primary" onClick={() => setNotifOpen(false)}>
            Kapat
          </Button>
        }
      >
        {notifications.length === 0 ? (
          <div className="dashboard-state">Henüz bildiriminiz yok.</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="dashboard-notif">
              <p className="dashboard-notif-title">{n.title}</p>
              <p className="dashboard-notif-body">{n.body}</p>
              <p className="dashboard-notif-date">{trDate(n.createdAt)}</p>
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
              onClick={() => profileMutation.mutate()}
            >
              Kaydet
            </Button>
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Input
            label="Ad Soyad"
            placeholder="Adınız ve soyadınız"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
        </div>
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
            placeholder="11 haneli"
            value={loanNationalId}
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
            <div className="dashboard-loan-result-badge">
              <Badge variant={loanBadgeVariant(resultLoan.status)}>
                {loanLabel(resultLoan.status)}
              </Badge>
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
            {planLoan.paymentPlan.installments.map((ins) => (
              <div key={ins.no} className="dashboard-plan-row">
                <span>{ins.no}. taksit · {trDate(ins.dueDate)}</span>
                <span>{formatTL(ins.amount)}</span>
              </div>
            ))}
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
                disabled={!payCardId}
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
          approvedCards.length === 0 ? (
            <Alert variant="warning">
              Ödeme yapmak için önce onaylı bir kartınız olmalı. “Kartlarım”dan
              kart açıp admin onayını bekleyin.
            </Alert>
          ) : (
            <>
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
              <div className="dashboard-modal-field">
                <Input
                  label="Tutar (₺)"
                  type="number"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
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
