import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell } from '../staff/StaffShell'
import { Card, CardContent } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Modal } from '../../components/Modal'
import { getApiErrorMessage } from '../../lib/apiError'
import * as branchApi from '../../api/branchApi'
import type { CustomerLookup } from '../../api/branchApi'
import type { AccountType, Loan } from '../../lib/types'
import './BranchEmployeePanel.css'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)

type ActionModal = 'account' | 'deposit' | 'transfer' | 'card' | 'loan' | null

const loanStatusLabel = (s: string) =>
  s === 'Approved'
    ? 'Onaylandı'
    : s === 'Rejected'
      ? 'Reddedildi'
      : s === 'PendingApproval'
        ? 'onaya gönderildi'
        : 'alındı'

/**
 * Şube çalışanı paneli. Masaya gelen müşteriyi (TC/e-posta) bulur ve onun ADINA
 * hesap açma, para yatırma, havale, kart ve kredi başvurusu yapar. Tüm kayıtlar
 * Şube kanalı + çalışan damgasıyla yazılır.
 */
export function BranchEmployeePanel() {
  usePageTitle('Şube Çalışanı')

  const [query, setQuery] = useState('')
  const [customer, setCustomer] = useState<CustomerLookup | null>(null)
  const [modal, setModal] = useState<ActionModal>(null)

  // --- Müşteri arama ---
  const searchMutation = useMutation({
    mutationFn: (q: string) => branchApi.searchCustomer(q),
    onSuccess: (res) => {
      if (res.data) setCustomer(res.data)
    },
    onError: (err) => {
      setCustomer(null)
      toast.error(getApiErrorMessage(err, 'Müşteri bulunamadı.'))
    },
  })

  function refreshCustomer() {
    if (query.trim()) searchMutation.mutate(query.trim())
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) searchMutation.mutate(query.trim())
  }

  // --- Ortak: işlem sonrası ---
  function afterAction(message: string) {
    toast.success(message)
    setModal(null)
    refreshCustomer()
  }

  const activeAccounts = (customer?.accounts ?? []).filter((a) => a.isActive)
  const accountOptions = activeAccounts.map((a) => ({
    value: a.id,
    label: `…${a.iban.slice(-4)} · ${formatTL(a.balance)}`,
  }))

  return (
    <StaffShell
      title="Şube Çalışanı Paneli"
      subtitle="Müşteriyi bulun ve adına işlem yapın."
    >
      {/* Müşteri arama */}
      <Card>
        <CardContent>
          <form className="branch-search" onSubmit={onSearch}>
            <Input
              label="Müşteri (TC kimlik no / e-posta)"
              placeholder="12345678950 veya ornek@eposta.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" variant="primary" loading={searchMutation.isPending}>
              Ara
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Seçili müşteri + işlemler */}
      {customer && (
        <div className="branch-customer">
          <Card>
            <CardContent>
              <div className="branch-customer-head">
                <div>
                  <p className="branch-customer-name">{customer.fullName}</p>
                  <p className="branch-customer-sub">
                    {customer.email}
                    {customer.nationalId ? ` · TC ${customer.nationalId}` : ''}
                  </p>
                </div>
              </div>

              <div className="branch-accounts">
                {customer.accounts.length === 0 ? (
                  <p className="branch-empty">Müşterinin hesabı yok.</p>
                ) : (
                  customer.accounts.map((a) => (
                    <div key={a.id} className="branch-account-row">
                      <span className="branch-account-iban">{a.iban}</span>
                      <span className="branch-account-bal">
                        {formatTL(a.balance)}
                        {!a.isActive && ' · kapalı'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="branch-actions">
                <Button size="sm" variant="primary" onClick={() => setModal('account')}>
                  Hesap Aç
                </Button>
                <Button size="sm" variant="ghost" disabled={activeAccounts.length === 0} onClick={() => setModal('deposit')}>
                  Para Yatır
                </Button>
                <Button size="sm" variant="ghost" disabled={activeAccounts.length === 0} onClick={() => setModal('transfer')}>
                  Havale
                </Button>
                <Button size="sm" variant="ghost" disabled={activeAccounts.length === 0} onClick={() => setModal('card')}>
                  Kart Başvur
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setModal('loan')}>
                  Kredi Başvur
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {customer && (
        <>
          <AccountModal
            open={modal === 'account'}
            onClose={() => setModal(null)}
            customerId={customer.id}
            onDone={() => afterAction('Hesap açıldı.')}
          />
          <DepositModal
            open={modal === 'deposit'}
            onClose={() => setModal(null)}
            customerId={customer.id}
            accountOptions={accountOptions}
            onDone={() => afterAction('Para yatırıldı.')}
          />
          <TransferModal
            open={modal === 'transfer'}
            onClose={() => setModal(null)}
            customerId={customer.id}
            accountOptions={accountOptions}
            onDone={(status) =>
              afterAction(
                status === 'PendingApproval'
                  ? 'Yüksek tutarlı havale şube müdürü onayına gönderildi.'
                  : 'Transfer tamamlandı.',
              )
            }
          />
          <CardModal
            open={modal === 'card'}
            onClose={() => setModal(null)}
            customerId={customer.id}
            accountOptions={accountOptions}
            onDone={() => afterAction('Kart başvurusu alındı.')}
          />
          <LoanModal
            open={modal === 'loan'}
            onClose={() => setModal(null)}
            customerId={customer.id}
            nationalId={customer.nationalId ?? ''}
            onDone={(loan) =>
              afterAction(`Kredi başvurusu ${loanStatusLabel(loan.status)}.`)
            }
          />
        </>
      )}
    </StaffShell>
  )
}

// ---- Modaller ----

type AccountOption = { value: string; label: string }

function AccountModal({ open, onClose, customerId, onDone }: {
  open: boolean; onClose: () => void; customerId: string; onDone: () => void
}) {
  const [type, setType] = useState<AccountType>('Bireysel')
  const m = useMutation({
    mutationFn: () => branchApi.openAccount(customerId, type),
    onSuccess: onDone,
    onError: (err) => toast.error(getApiErrorMessage(err, 'Hesap açılamadı.')),
  })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Müşteri Adına Hesap Aç"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Aç</Button>
        </>
      }
    >
      <Select
        label="Hesap Türü"
        options={[
          { value: 'Bireysel', label: 'Bireysel' },
          { value: 'Isletme', label: 'İşletme' },
        ]}
        value={type}
        onChange={(e) => setType(e.target.value as AccountType)}
      />
    </Modal>
  )
}

function DepositModal({ open, onClose, customerId, accountOptions, onDone }: {
  open: boolean; onClose: () => void; customerId: string; accountOptions: AccountOption[]; onDone: () => void
}) {
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const m = useMutation({
    mutationFn: () => branchApi.deposit(customerId, accountId || accountOptions[0]?.value, Number(amount)),
    onSuccess: onDone,
    onError: (err) => toast.error(getApiErrorMessage(err, 'Para yatırılamadı.')),
  })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Müşteri Adına Para Yatır"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Yatır</Button>
        </>
      }
    >
      <Select label="Hesap" options={accountOptions} value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Hesap seçin" />
      <Input label="Tutar (₺)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
    </Modal>
  )
}

function TransferModal({ open, onClose, customerId, accountOptions, onDone }: {
  open: boolean; onClose: () => void; customerId: string; accountOptions: AccountOption[]; onDone: (status: string) => void
}) {
  const [fromAccountId, setFromAccountId] = useState('')
  const [toIban, setToIban] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const m = useMutation({
    mutationFn: () =>
      branchApi.transfer(customerId, {
        fromAccountId: fromAccountId || accountOptions[0]?.value,
        toIban: toIban.trim(),
        amount: Number(amount),
        description: description.trim() || undefined,
      }),
    onSuccess: (res) => res.data && onDone(res.data.status),
    onError: (err) => toast.error(getApiErrorMessage(err, 'Transfer yapılamadı.')),
  })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Müşteri Adına Havale"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Gönder</Button>
        </>
      }
    >
      <Select label="Gönderen hesap" options={accountOptions} value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} placeholder="Hesap seçin" />
      <Input label="Alıcı IBAN" placeholder="TR..." value={toIban} onChange={(e) => setToIban(e.target.value)} />
      <Input label="Tutar (₺)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} />
    </Modal>
  )
}

function CardModal({ open, onClose, customerId, accountOptions, onDone }: {
  open: boolean; onClose: () => void; customerId: string; accountOptions: AccountOption[]; onDone: () => void
}) {
  const [accountId, setAccountId] = useState('')
  const m = useMutation({
    mutationFn: () => branchApi.applyCard(customerId, accountId || accountOptions[0]?.value),
    onSuccess: onDone,
    onError: (err) => toast.error(getApiErrorMessage(err, 'Kart başvurusu alınamadı.')),
  })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Müşteri Adına Kart Başvurusu"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Başvur</Button>
        </>
      }
    >
      <Select label="Bağlı hesap" options={accountOptions} value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Hesap seçin" />
    </Modal>
  )
}

function LoanModal({ open, onClose, customerId, nationalId, onDone }: {
  open: boolean; onClose: () => void; customerId: string; nationalId: string; onDone: (loan: Loan) => void
}) {
  const [tc, setTc] = useState(nationalId)
  const [age, setAge] = useState('')
  const [marital, setMarital] = useState<'Single' | 'Married'>('Single')
  const [children, setChildren] = useState('0')
  const [housing, setHousing] = useState<'Tenant' | 'Owner'>('Tenant')
  const [income, setIncome] = useState('')
  const [expenses, setExpenses] = useState('')
  const [employment, setEmployment] = useState('')
  const [profession, setProfession] = useState('')
  const [amount, setAmount] = useState('')
  const [term, setTerm] = useState('12')

  const m = useMutation({
    mutationFn: () =>
      branchApi.applyLoan(customerId, {
        nationalId: (tc || nationalId).trim(),
        age: Number(age),
        maritalStatus: marital,
        childrenCount: Number(children),
        housingStatus: housing,
        income: Number(income),
        monthlyExpenses: Number(expenses),
        employmentMonths: Number(employment),
        profession: profession.trim(),
        amount: Number(amount),
        termMonths: Number(term),
      }),
    onSuccess: (res) => res.data && onDone(res.data),
    onError: (err) => toast.error(getApiErrorMessage(err, 'Kredi başvurusu alınamadı.')),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Müşteri Adına Kredi Başvurusu"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Başvur</Button>
        </>
      }
    >
      <div className="branch-loan-grid">
        <Input label="TC Kimlik No" value={tc} onChange={(e) => setTc(e.target.value)} />
        <Input label="Yaş" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
        <Select label="Medeni Hal" options={[{ value: 'Single', label: 'Bekâr' }, { value: 'Married', label: 'Evli' }]} value={marital} onChange={(e) => setMarital(e.target.value as 'Single' | 'Married')} />
        <Input label="Çocuk Sayısı" type="number" value={children} onChange={(e) => setChildren(e.target.value)} />
        <Select label="Konut Durumu" options={[{ value: 'Tenant', label: 'Kiracı' }, { value: 'Owner', label: 'Ev sahibi' }]} value={housing} onChange={(e) => setHousing(e.target.value as 'Tenant' | 'Owner')} />
        <Input label="Aylık Gelir (₺)" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
        <Input label="Aylık Gider (₺)" type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
        <Input label="Çalışma Kıdemi (ay)" type="number" value={employment} onChange={(e) => setEmployment(e.target.value)} />
        <Input label="Meslek" value={profession} onChange={(e) => setProfession(e.target.value)} />
        <Input label="Kredi Tutarı (₺)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Vade (ay)" type="number" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
    </Modal>
  )
}
