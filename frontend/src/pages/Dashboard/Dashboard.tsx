import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'
import { getAccounts, createAccount, closeAccount } from '../../api/accountApi'
import { updateProfile } from '../../api/authApi'
import { deposit, transfer, getHistory } from '../../api/transactionApi'
import { applyLoan, getMyLoans, getLoanDetail } from '../../api/loanApi'
import { pay, getMyPayments } from '../../api/paymentApi'
import { getApiErrorMessage } from '../../lib/apiError'
import { usePageTitle } from '../../lib/usePageTitle'
import { formatCardNumber, digitsOnly } from '../../lib/format'
import type { AccountType, LoanStatus, PaymentStatus } from '../../lib/types'
import './Dashboard.css'

const accountTypeOptions = [
  { value: 'Bireysel', label: 'Bireysel Hesap' },
  { value: 'Isletme', label: 'İşletme Hesabı' },
]

const PAGE_SIZE = 5

// Kredi durumu -> rozet rengi / Türkçe etiket
const loanBadgeVariant = (s: LoanStatus) =>
  s === 'Approved' ? 'success' : s === 'Rejected' ? 'error' : 'warning'
const loanLabel = (s: LoanStatus) =>
  s === 'Approved' ? 'Onaylandı' : s === 'Rejected' ? 'Reddedildi' : 'Bekliyor'

// Ödeme durumu -> rozet rengi / Türkçe etiket
const paymentBadgeVariant = (s: PaymentStatus) =>
  s === 'Success' ? 'success' : s === 'Failed' ? 'error' : 'info'
const paymentLabel = (s: PaymentStatus) =>
  s === 'Success' ? 'Başarılı' : s === 'Failed' ? 'Başarısız' : 'İade'

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

export function Dashboard() {
  usePageTitle('Panel')
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const queryClient = useQueryClient()

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

  // Hesap kapatma onayı
  const [closeAccountId, setCloseAccountId] = useState<string | null>(null)

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
    mutationFn: (id: string) => closeAccount(id),
    onSuccess: () => {
      refresh()
      setCloseAccountId(null)
      toast.success('Hesap kapatıldı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Hesap kapatılamadı.')),
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

  // --- İşlem geçmişi (seçili hesap) ---
  const [historyAccountId, setHistoryAccountId] = useState('')
  const [txVisible, setTxVisible] = useState(PAGE_SIZE)
  useEffect(() => {
    if (!historyAccountId && accounts.length > 0) {
      setHistoryAccountId(accounts[0].id)
    }
  }, [accounts, historyAccountId])

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['transactions', historyAccountId],
    queryFn: () => getHistory(historyAccountId),
    enabled: !!historyAccountId,
  })
  const history = historyData?.data ?? []

  // --- Krediler ---
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: getMyLoans,
  })
  const loans = loansData?.data ?? []

  const [loanOpen, setLoanOpen] = useState(false)
  const [loanIncome, setLoanIncome] = useState('')
  const [loanProfession, setLoanProfession] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [loanTerm, setLoanTerm] = useState('12')

  const applyMutation = useMutation({
    mutationFn: () =>
      applyLoan({
        income: Number(loanIncome),
        profession: loanProfession,
        amount: Number(loanAmount),
        termMonths: Number(loanTerm),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      setLoanOpen(false)
      toast.success('Kredi başvurunuz alındı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Başvuru yapılamadı.')),
  })

  function openLoanApply() {
    setLoanIncome('')
    setLoanProfession('')
    setLoanAmount('')
    setLoanTerm('12')
    setLoanOpen(true)
  }

  // Ödeme planı modalı (onaylı kredi detayı)
  const [planLoanId, setPlanLoanId] = useState<string | null>(null)
  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ['loan', planLoanId],
    queryFn: () => getLoanDetail(planLoanId!),
    enabled: !!planLoanId,
  })
  const planLoan = planData?.data ?? null

  // --- Sanal POS (ödemeler) ---
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: getMyPayments,
  })
  const payments = paymentsData?.data ?? []
  const [payVisible, setPayVisible] = useState(PAGE_SIZE)

  const [payOpen, setPayOpen] = useState(false)
  const [payStep, setPayStep] = useState<'form' | '3ds'>('form')
  const [cardNumber, setCardNumber] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDesc, setPayDesc] = useState('')
  const [threeDS, setThreeDS] = useState('')

  const payMutation = useMutation({
    mutationFn: () =>
      pay({
        cardNumber,
        expiryMonth: Number(expMonth),
        expiryYear: Number(expYear),
        cvv,
        amount: Number(payAmount),
        threeDSCode: threeDS,
        description: payDesc || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setPayOpen(false)
      toast.success('Ödeme başarılı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Ödeme başarısız.')),
  })

  function openPay() {
    setPayStep('form')
    setCardNumber('')
    setExpMonth('')
    setExpYear('')
    setCvv('')
    setPayAmount('')
    setPayDesc('')
    setThreeDS('')
    setPayOpen(true)
  }

  function handleLogout() {
    logout()
    navigate('/login')
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

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.accountType} · ...${a.iban.slice(-4)}`,
  }))

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="dashboard-brand">TurkcellBank</span>
        <div className="dashboard-user">
          <span className="dashboard-username">{user?.fullName}</span>
          <Button variant="ghost" size="sm" onClick={openProfile}>
            Profil
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
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
                    {!acc.isActive && <Badge variant="error">Kapalı</Badge>}
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
                {acc.isActive && (
                  <CardFooter>
                    <div className="dashboard-account-footer">
                      <div className="dashboard-account-actions">
                        <Button size="sm" variant="primary" onClick={() => openDeposit(acc.id)}>
                          Para Yatır
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openTransfer(acc.id)}>
                          Gönder
                        </Button>
                      </div>
                      <div className="dashboard-account-close">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setCloseAccountId(acc.id)}
                        >
                          Hesabı Kapat
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}

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
            {historyLoading ? (
              <ListSkeleton />
            ) : history.length === 0 ? (
              <div className="dashboard-state">Bu hesapta henüz işlem yok.</div>
            ) : (
              <>
                {history.slice(0, txVisible).map((tx) => (
                  <div key={tx.id} className="dashboard-tx-row">
                    <div>
                      <p className="dashboard-tx-desc">
                        {tx.type === 'Deposit'
                          ? 'Para Yatırma'
                          : tx.direction === 'Out'
                            ? `Transfer → ${tx.counterpartyIban}`
                            : `Transfer ← ${tx.counterpartyIban}`}
                      </p>
                      <p className="dashboard-tx-sub">
                        {trDate(tx.createdAt)}
                        {tx.description ? ` · ${tx.description}` : ''}
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
            <Button
              variant="primary"
              loading={applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              Başvur
            </Button>
          </>
        }
      >
        <div className="dashboard-modal-field">
          <Input
            label="Aylık Gelir (₺)"
            type="number"
            placeholder="0"
            value={loanIncome}
            onChange={(e) => setLoanIncome(e.target.value)}
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
            placeholder="0"
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
              <Button variant="primary" onClick={() => setPayStep('3ds')}>
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
          <>
            <div className="dashboard-modal-field">
              <Input
                label="Kart Numarası"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="dashboard-modal-field" style={{ flex: 1 }}>
                <Input
                  label="Ay"
                  type="number"
                  placeholder="12"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                />
              </div>
              <div className="dashboard-modal-field" style={{ flex: 1 }}>
                <Input
                  label="Yıl"
                  type="number"
                  placeholder="2030"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                />
              </div>
              <div className="dashboard-modal-field" style={{ flex: 1 }}>
                <Input
                  label="CVV"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(digitsOnly(e.target.value, 4))}
                />
              </div>
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

      {/* --- Hesap kapatma onayı --- */}
      <ConfirmDialog
        open={!!closeAccountId}
        title="Hesabı Kapat"
        message="Bu hesabı kapatmak istediğinize emin misiniz? Kapalı hesaplar pasifleştirilir."
        confirmLabel="Hesabı Kapat"
        confirmVariant="destructive"
        loading={closeMutation.isPending}
        onConfirm={() => closeAccountId && closeMutation.mutate(closeAccountId)}
        onClose={() => setCloseAccountId(null)}
      />
    </div>
  )
}
