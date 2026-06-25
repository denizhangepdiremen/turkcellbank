import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent } from '../../components/Card'
import { Button } from '../../components/Button'
import { Skeleton } from '../../components/Skeleton'
import { getCardHistory, getPendingCards, approveCard, rejectCard } from '../../api/approvalApi'
import { getApiErrorMessage } from '../../lib/apiError'
import type { AdminCard } from '../../lib/types'
import { ApprovalHistory, ApprovalViewTabs } from './ApprovalHistory'
import './LoanApprovalQueue.css'

const trDate = (s: string) => new Date(s).toLocaleString('tr-TR')
const trDay = (d: Date) => d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })

const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#e11d48',
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function buildDailyApplications(cards: AdminCard[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - (6 - index))
    return { key: dateKey(day), day: trDay(day), basvuru: 0 }
  })
  const byKey = new Map(days.map((d) => [d.key, d]))

  cards.forEach((card) => {
    const row = byKey.get(dateKey(new Date(card.createdAt)))
    if (row) row.basvuru += 1
  })

  return days
}

/** Kart başvuru onay kuyruğu (şube müdürü). */
export function CardApprovalQueue() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'pending' | 'history'>('pending')
  const { data, isLoading } = useQuery({ queryKey: ['pending-cards'], queryFn: getPendingCards })
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['card-history'],
    queryFn: getCardHistory,
  })
  const cards = data?.data ?? []
  const historyCards = historyData?.data ?? []
  const allCards = useMemo(() => [...cards, ...historyCards], [cards, historyCards])
  const statusChart = useMemo(
    () => [
      { name: 'Bekleyen', value: cards.length, color: STATUS_COLORS.pending },
      {
        name: 'Onaylanan',
        value: historyCards.filter((c) => c.status === 'Approved').length,
        color: STATUS_COLORS.approved,
      },
      {
        name: 'Reddedilen',
        value: historyCards.filter((c) => c.status === 'Rejected').length,
        color: STATUS_COLORS.rejected,
      },
    ].filter((item) => item.value > 0),
    [cards.length, historyCards],
  )
  const dailyApplications = useMemo(() => buildDailyApplications(allCards), [allCards])
  const hasChartData = allCards.length > 0

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      action === 'approve' ? approveCard(id) : rejectCard(id),
    onSuccess: (_res, vars) => {
      toast.success(vars.action === 'approve' ? 'Kart onaylandı.' : 'Kart reddedildi.')
      queryClient.invalidateQueries({ queryKey: ['pending-cards'] })
      queryClient.invalidateQueries({ queryKey: ['card-history'] })
      queryClient.invalidateQueries({ queryKey: ['approval-history', 'cards'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  return (
    <>
      <ApprovalViewTabs view={view} onChange={setView} pendingCount={cards.length} />

      <div className="card-approval-charts">
        <Card>
          <CardContent>
            <div className="card-chart-head">
              <p className="approval-history-chart-title">Kart Başvuruları Durum Dağılımı</p>
              <span className="card-chart-total">{allCards.length} kayıt</span>
            </div>
            {isLoading || isHistoryLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : hasChartData ? (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={statusChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {statusChart.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${Number(value)} adet`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="approval-empty">Grafik için kart başvurusu yok.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="card-chart-head">
              <p className="approval-history-chart-title">Son 7 Gün Başvuru Trendi</p>
              <span className="card-chart-total">Bekleyen + geçmiş</span>
            </div>
            {isLoading || isHistoryLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : hasChartData ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={dailyApplications} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${Number(value)} adet`, 'Başvuru']} />
                  <Bar dataKey="basvuru" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="approval-empty">Son 7 gün için başvuru yok.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {view === 'history' ? (
        <ApprovalHistory kind="cards" />
      ) : isLoading ? (
        <Card><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
      ) : cards.length === 0 ? (
        <Card><CardContent><div className="approval-empty">Onay bekleyen kart başvurusu yok.</div></CardContent></Card>
      ) : (
        <div className="approval-list">
          {cards.map((c) => (
            <Card key={c.id}>
              <CardContent>
                <div className="approval-card">
                  <div className="approval-card-head">
                    <div>
                      <p className="approval-applicant">{c.holderName}</p>
                      <p className="approval-applicant-sub">{c.holderEmail}</p>
                    </div>
                    <div className="approval-amount">
                      <span className="approval-amount-value">{c.maskedCardNumber}</span>
                      <span className="approval-amount-term">Hesap …{c.accountIban.slice(-4)}</span>
                    </div>
                  </div>
                  <p className="approval-date">Başvuru: {trDate(c.createdAt)}</p>
                  <div className="approval-actions">
                    <Button size="sm" variant="primary" loading={mutation.isPending} onClick={() => mutation.mutate({ id: c.id, action: 'approve' })}>Onayla</Button>
                    <Button size="sm" variant="destructive" loading={mutation.isPending} onClick={() => mutation.mutate({ id: c.id, action: 'reject' })}>Reddet</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
