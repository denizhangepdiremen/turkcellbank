import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Skeleton } from '../../components/Skeleton'
import { getCardHistory, getLoanHistory, getTransferHistory } from '../../api/approvalApi'
import type { AdminCard, ApiResponse, LoanHistory, TransferHistory } from '../../lib/types'

type HistoryItem = LoanHistory | TransferHistory | AdminCard

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
const trDate = (s: string | null) => (s ? new Date(s).toLocaleString('tr-TR') : '—')

const APPROVED = '#10b981' // emerald-500
const REJECTED = '#e11d48' // rose-600

type ApprovalKind = 'loans' | 'transfers' | 'cards'

/**
 * Onay geçmişi: karara bağlanmış (onaylanan/reddedilen) kayıtların detaylı listesi
 * + onay/ret dağılımı donut grafiği. Krediler ve havaleler için ortak kullanılır.
 */
export function ApprovalHistory({ kind }: { kind: ApprovalKind }) {
  const isLoans = kind === 'loans'
  const isCards = kind === 'cards'
  const fetchHistory = (): Promise<ApiResponse<HistoryItem[]>> =>
    isLoans
      ? getLoanHistory()
      : isCards
        ? getCardHistory()
        : getTransferHistory()
  const { data, isLoading } = useQuery({
    queryKey: ['approval-history', kind],
    queryFn: fetchHistory,
  })

  if (isLoading) {
    return <Card><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
  }

  const items: HistoryItem[] = data?.data ?? []
  if (items.length === 0) {
    return <Card><CardContent><div className="approval-empty">Henüz karara bağlanmış kayıt yok.</div></CardContent></Card>
  }

  const approvedCount = items.filter((i) => i.status === 'Approved').length
  const rejectedCount = items.length - approvedCount
  const donut = [
    { name: 'Onaylanan', value: approvedCount, color: APPROVED },
    { name: 'Reddedilen', value: rejectedCount, color: REJECTED },
  ].filter((d) => d.value > 0)

  return (
    <div>
      {/* Onay/ret dağılımı */}
      <Card>
        <CardContent>
          <p className="approval-history-chart-title">Onay / Ret Dağılımı ({items.length} kayıt)</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                {donut.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${Number(v)} adet`, '']} />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detaylı liste */}
      <div className="approval-history-list">
        {items.map((item) => {
          const approved = item.status === 'Approved'
          const card = item as AdminCard
          return (
            <Card key={item.id}>
              <CardContent>
                <div className="approval-history-row">
                  <div className="approval-history-main">
                    {isCards ? (
                      <>
                        <p className="approval-applicant">{card.holderName}</p>
                        <p className="approval-applicant-sub">{card.holderEmail}</p>
                      </>
                    ) : isLoans ? (
                      <>
                        <p className="approval-applicant">{(item as LoanHistory).applicantName}</p>
                        <p className="approval-applicant-sub">{(item as LoanHistory).applicantEmail}</p>
                      </>
                    ) : (
                      <>
                        <p className="approval-applicant">{(item as TransferHistory).customerName}</p>
                        <p className="approval-applicant-sub">
                          {(item as TransferHistory).fromIban} → {(item as TransferHistory).toIban}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="approval-history-right">
                    {isCards ? (
                      <>
                        <span className="approval-amount-value">{card.maskedCardNumber}</span>
                        <span className="approval-amount-term">Hesap …{card.accountIban.slice(-4)}</span>
                      </>
                    ) : (
                      <span className="approval-amount-value">{formatTL((item as LoanHistory | TransferHistory).amount)}</span>
                    )}
                    {isLoans && !isCards && (
                      <span className="approval-amount-term">{(item as LoanHistory).termMonths} ay</span>
                    )}
                  </div>
                </div>

                <div className="approval-history-meta">
                  <Badge variant={approved ? 'success' : 'error'}>
                    {approved ? 'Onaylandı' : 'Reddedildi'}
                  </Badge>
                  <span className="approval-history-by">
                    {isCards
                      ? `Hesap …${card.accountIban.slice(-4)}`
                      : (item as LoanHistory | TransferHistory).decidedByName}
                    {isLoans && !isCards && (item as LoanHistory).decidedByRole
                      ? ` · ${(item as LoanHistory).decidedByRole}`
                      : ''}
                  </span>
                  <span className="approval-history-date">{trDate(item.decidedAt)}</span>
                </div>

                {!isCards && (item as LoanHistory | TransferHistory).decisionNote ? (
                  <p className="approval-history-note">“{(item as LoanHistory | TransferHistory).decisionNote}”</p>
                ) : isCards ? (
                  <p className="approval-history-note">
                    Kart başvurusu {approved ? 'onaylandı' : 'reddedildi'}.
                  </p>
                ) : (
                  <p className="approval-history-note approval-history-note-empty">Gerekçe notu girilmemiş.</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Onay kuyruğu üst geçişi: Bekleyenler | Geçmiş. Bekleyen sayısını rozette gösterir.
 */
export function ApprovalViewTabs({
  view,
  onChange,
  pendingCount,
}: {
  view: 'pending' | 'history'
  onChange: (v: 'pending' | 'history') => void
  pendingCount?: number
}) {
  return (
    <div className="approval-toggle" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'pending'}
        className={`approval-toggle-tab${view === 'pending' ? ' is-active' : ''}`}
        onClick={() => onChange('pending')}
      >
        Bekleyenler
        {pendingCount ? <span className="approval-toggle-badge">{pendingCount}</span> : null}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'history'}
        className={`approval-toggle-tab${view === 'history' ? ' is-active' : ''}`}
        onClick={() => onChange('history')}
      >
        Geçmiş
      </button>
    </div>
  )
}
