import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardFooter } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Select'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../context/AuthContext'
import { getAccounts, createAccount, closeAccount } from '../../api/accountApi'
import { updateProfile } from '../../api/authApi'
import { deposit, transfer, getHistory } from '../../api/transactionApi'
import { applyLoan, getMyLoans, getLoanDetail } from '../../api/loanApi'
import { getApiErrorMessage } from '../../lib/apiError'
import type { AccountType, LoanStatus } from '../../lib/types'
import './Dashboard.css'

const accountTypeOptions = [
  { value: 'Bireysel', label: 'Bireysel Hesap' },
  { value: 'Isletme', label: 'İşletme Hesabı' },
]

// Kredi durumu -> rozet rengi / Türkçe etiket
const loanBadgeVariant = (s: LoanStatus) =>
  s === 'Approved' ? 'success' : s === 'Rejected' ? 'error' : 'warning'
const loanLabel = (s: LoanStatus) =>
  s === 'Approved' ? 'Onaylandı' : s === 'Rejected' ? 'Reddedildi' : 'Bekliyor'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

const trDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

export function Dashboard() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const queryClient = useQueryClient()

  // Profil modalı
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const profileMutation = useMutation({
    mutationFn: () => updateProfile(profileName),
    onSuccess: (res) => {
      if (res.data) updateUser(res.data) // header/karşılama anında güncellenir
      setProfileOpen(false)
    },
  })

  function openProfile() {
    setProfileName(user?.fullName ?? '')
    profileMutation.reset()
    setProfileOpen(true)
  }

  // --- Hesaplar ---
  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })
  const accounts = data?.data ?? []

  // İşlem sonrası hem hesapları hem geçmişi tazele
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

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: (type: AccountType) => createAccount(type),
    onSuccess: () => {
      refresh()
      setCreateOpen(false)
    },
  })
  const closeMutation = useMutation({
    mutationFn: (id: string) => closeAccount(id),
    onSuccess: refresh,
  })
  const depositMutation = useMutation({
    mutationFn: () => deposit(depositAccountId, Number(depositAmount)),
    onSuccess: () => {
      refresh()
      setDepositOpen(false)
    },
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
    },
  })

  // --- İşlem geçmişi (seçili hesap) ---
  const [historyAccountId, setHistoryAccountId] = useState('')
  useEffect(() => {
    if (!historyAccountId && accounts.length > 0) {
      setHistoryAccountId(accounts[0].id)
    }
  }, [accounts, historyAccountId])

  const { data: historyData } = useQuery({
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
    },
  })

  function openLoanApply() {
    setLoanIncome('')
    setLoanProfession('')
    setLoanAmount('')
    setLoanTerm('12')
    applyMutation.reset()
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

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const totalBalance = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0)
  const firstName = user?.fullName?.split(' ')[0] ?? ''

  // Hesap seçici opsiyonları (kısa etiket)
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.accountType} · ...${a.iban.slice(-4)}`,
  }))

  function openDeposit(accountId: string) {
    setDepositAccountId(accountId)
    setDepositAmount('')
    depositMutation.reset()
    setDepositOpen(true)
  }
  function openTransfer(accountId: string) {
    setFromAccountId(accountId)
    setToIban('')
    setTransferAmount('')
    setTransferDesc('')
    transferMutation.reset()
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
          <div className="dashboard-state">
            <Spinner />
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
                  <p className="dashboard-account-iban">{acc.iban}</p>
                  <p className="dashboard-account-balance">
                    {formatTL(acc.balance)}
                  </p>
                </CardContent>
                {acc.isActive && (
                  <CardFooter>
                    <div className="dashboard-account-actions">
                      <Button size="sm" variant="primary" onClick={() => openDeposit(acc.id)}>
                        Para Yatır
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openTransfer(acc.id)}>
                        Gönder
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={closeMutation.isPending && closeMutation.variables === acc.id}
                        onClick={() => closeMutation.mutate(acc.id)}
                      >
                        Kapat
                      </Button>
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
                onChange={(e) => setHistoryAccountId(e.target.value)}
              />
            </div>
          )}
        </div>

        <Card>
          <CardContent>
            {history.length === 0 ? (
              <div className="dashboard-state">Bu hesapta henüz işlem yok.</div>
            ) : (
              history.map((tx) => (
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
              ))
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
            {loansLoading && (
              <div className="dashboard-state">
                <Spinner />
              </div>
            )}
            {!loansLoading && loans.length === 0 && (
              <div className="dashboard-state">Henüz kredi başvurunuz yok.</div>
            )}
            {loans.map((loan) => (
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
            ))}
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
        {createMutation.isError && (
          <div style={{ marginTop: '1rem' }}>
            <Alert variant="error">Hesap açılamadı, tekrar deneyin.</Alert>
          </div>
        )}
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
        {depositMutation.isError && (
          <Alert variant="error">
            {getApiErrorMessage(depositMutation.error, 'Para yatırılamadı.')}
          </Alert>
        )}
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
            value={transferDesc}
            onChange={(e) => setTransferDesc(e.target.value)}
          />
        </div>
        {transferMutation.isError && (
          <Alert variant="error">
            {getApiErrorMessage(transferMutation.error, 'Transfer başarısız.')}
          </Alert>
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
        {profileMutation.isError && (
          <Alert variant="error">
            {getApiErrorMessage(profileMutation.error, 'Profil güncellenemedi.')}
          </Alert>
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
        {applyMutation.isError && (
          <Alert variant="error">
            {getApiErrorMessage(applyMutation.error, 'Başvuru yapılamadı.')}
          </Alert>
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
    </div>
  )
}
