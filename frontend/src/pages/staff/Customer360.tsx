import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { formatIban } from '../../lib/format'
import { openTransactionReceipt } from '../../lib/transactionReceipt'
import type { Account, AdminCard, Loan, Transaction } from '../../lib/types'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)

const trDate = (s: string) => new Date(s).toLocaleString('tr-TR')

function cardStatusLabel(status: string) {
  if (status === 'Approved') return 'Onaylı'
  if (status === 'Rejected') return 'Reddedildi'
  if (status === 'Blocked') return 'Bloke'
  return 'Bekliyor'
}

function loanStatusLabel(status: string) {
  if (status === 'Approved') return 'Onaylandı'
  if (status === 'Rejected') return 'Reddedildi'
  if (status === 'PendingApproval') return 'Onay Bekliyor'
  return 'Bekliyor'
}

function statusVariant(status: string) {
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'error'
  if (status === 'Blocked' || status === 'PendingApproval' || status === 'Pending') return 'warning'
  return 'neutral'
}

function txTypeLabel(type: string) {
  if (type === 'Deposit') return 'Para Yatırma'
  if (type === 'Transfer') return 'Havale'
  if (type === 'Payment') return 'Kart Ödemesi'
  if (type === 'Refund') return 'İade'
  if (type === 'LoanDisbursement') return 'Kredi Kullandırımı'
  if (type === 'LoanRepayment') return 'Kredi Taksiti'
  return type
}

export function Customer360({
  customerName,
  accounts,
  cards,
  loans,
  recentTransactions,
}: {
  customerName: string
  accounts: Account[]
  cards: AdminCard[]
  loans: Loan[]
  recentTransactions: Transaction[]
}) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
  const activeLoans = loans.filter((loan) => loan.status === 'Approved' && loan.remainingDebt > 0)
  const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.remainingDebt, 0)
  const pendingItems =
    cards.filter((card) => card.status === 'Pending').length +
    loans.filter((loan) => loan.status === 'PendingApproval' || loan.status === 'Pending').length

  return (
    <div className="customer360">
      <div className="customer360-kpis">
        <div className="customer360-kpi">
          <span className="customer360-kpi-value">{formatTL(totalBalance)}</span>
          <span className="customer360-kpi-label">Toplam bakiye</span>
        </div>
        <div className="customer360-kpi">
          <span className="customer360-kpi-value">{cards.length}</span>
          <span className="customer360-kpi-label">Kart sayısı</span>
        </div>
        <div className="customer360-kpi">
          <span className="customer360-kpi-value">{formatTL(totalDebt)}</span>
          <span className="customer360-kpi-label">Aktif kredi borcu</span>
        </div>
        <div className="customer360-kpi">
          <span className="customer360-kpi-value">{pendingItems}</span>
          <span className="customer360-kpi-label">Bekleyen kayıt</span>
        </div>
      </div>

      <div className="customer360-grid">
        <Customer360Panel title="Hesaplar" empty="Müşterinin aktif hesabı yok.">
          {accounts.map((account) => (
            <div key={account.id} className="customer360-row">
              <div>
                <p className="customer360-main">{formatIban(account.iban)}</p>
                <p className="customer360-sub">{account.accountType} · {formatTL(account.balance)}</p>
              </div>
              <Badge variant={account.isFrozen ? 'warning' : 'success'}>
                {account.isFrozen ? 'Dondurulmuş' : 'Aktif'}
              </Badge>
            </div>
          ))}
        </Customer360Panel>

        <Customer360Panel title="Kartlar" empty="Kart başvurusu yok.">
          {cards.map((card) => (
            <div key={card.id} className="customer360-row">
              <div>
                <p className="customer360-main">{card.maskedCardNumber}</p>
                <p className="customer360-sub">Hesap ...{card.accountIban.slice(-4)}</p>
              </div>
              <Badge variant={statusVariant(card.status)}>{cardStatusLabel(card.status)}</Badge>
            </div>
          ))}
        </Customer360Panel>

        <Customer360Panel title="Krediler" empty="Kredi başvurusu yok.">
          {loans.slice(0, 4).map((loan) => (
            <div key={loan.id} className="customer360-row">
              <div>
                <p className="customer360-main">{formatTL(loan.amount)} · {loan.termMonths} ay</p>
                <p className="customer360-sub">
                  Kalan {formatTL(loan.remainingDebt)} · Skor {loan.score}
                </p>
              </div>
              <Badge variant={statusVariant(loan.status)}>{loanStatusLabel(loan.status)}</Badge>
            </div>
          ))}
        </Customer360Panel>

        <Customer360Panel title="Son İşlemler" empty="Henüz işlem yok.">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="customer360-row">
              <div>
                <p className="customer360-main">{txTypeLabel(tx.type)}</p>
                <p className="customer360-sub">
                  {trDate(tx.createdAt)}
                  {tx.description ? ` · ${tx.description}` : ''}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const ok = openTransactionReceipt({
                      transaction: tx,
                      customerName,
                      accountIban: tx.accountIban,
                    })
                    if (!ok) toast.error('Açılır pencere engellendi. Lütfen pop-up iznine bakın.')
                  }}
                >
                  Dekont
                </Button>
              </div>
              <span className={tx.direction === 'In' ? 'customer360-amount in' : 'customer360-amount out'}>
                {tx.direction === 'In' ? '+' : '-'}{formatTL(tx.amount)}
              </span>
            </div>
          ))}
        </Customer360Panel>
      </div>
    </div>
  )
}

function Customer360Panel({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: ReactNode[]
}) {
  const hasItems = children.length > 0

  return (
    <Card>
      <CardContent>
        <p className="customer360-title">{title}</p>
        {hasItems ? <div className="customer360-list">{children}</div> : <p className="customer360-empty">{empty}</p>}
      </CardContent>
    </Card>
  )
}
