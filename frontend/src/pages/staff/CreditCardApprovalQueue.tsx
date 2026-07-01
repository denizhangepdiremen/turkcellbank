import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, CardContent } from '../../components/Card'
import { Button } from '../../components/Button'
import { Skeleton } from '../../components/Skeleton'
import {
  getPendingCreditCards,
  approveCreditCard,
  rejectCreditCard,
  approveCreditCardLimitIncrease,
  rejectCreditCardLimitIncrease,
} from '../../api/approvalApi'
import { getApiErrorMessage } from '../../lib/apiError'
import './LoanApprovalQueue.css'

const trDate = (s: string) => new Date(s).toLocaleString('tr-TR')
const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)

/** Kredi kartı başvuru onay kuyruğu (yüksek limit bandı — şube müdürü). */
export function CreditCardApprovalQueue() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['pending-credit-cards'],
    queryFn: getPendingCreditCards,
  })
  const cards = data?.data ?? []

  const mutation = useMutation({
    mutationFn: ({ id, action, type }: { id: string; action: 'approve' | 'reject'; type: 'Application' | 'LimitIncrease' }) =>
      type === 'LimitIncrease'
        ? action === 'approve'
          ? approveCreditCardLimitIncrease(id)
          : rejectCreditCardLimitIncrease(id)
        : action === 'approve'
          ? approveCreditCard(id)
          : rejectCreditCard(id),
    onSuccess: (_res, vars) => {
      toast.success(
        vars.type === 'LimitIncrease'
          ? vars.action === 'approve'
            ? 'Limit artış talebi onaylandı.'
            : 'Limit artış talebi reddedildi.'
          : vars.action === 'approve'
            ? 'Kredi kartı onaylandı.'
            : 'Kredi kartı reddedildi.',
      )
      queryClient.invalidateQueries({ queryKey: ['pending-credit-cards'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="approval-empty">Onay bekleyen kredi kartı başvurusu yok.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="approval-list">
      {cards.map((c) => (
        <Card key={c.id}>
          <CardContent>
            <div className="approval-card">
              <div className="approval-card-head">
                <div>
                  <p className="approval-applicant">{c.holderName}</p>
                  <p className="approval-applicant-sub">{c.holderEmail}</p>
                  <p className="approval-applicant-sub">
                    {c.approvalType === 'LimitIncrease' ? 'Limit artış talebi' : 'Yeni kredi kartı başvurusu'}
                  </p>
                </div>
                <div className="approval-amount">
                  <span className="approval-amount-value">
                    {formatTL(c.approvalType === 'LimitIncrease' ? c.requestedLimit : c.creditLimit)}
                  </span>
                  <span className="approval-amount-term">
                    {c.maskedCardNumber} · Skor {c.score}
                    {c.approvalType === 'LimitIncrease'
                      ? ` · Mevcut ${formatTL(c.currentLimit)} · Öneri ${formatTL(c.recommendedLimit)}`
                      : ''}
                  </span>
                </div>
              </div>
              {c.aiReason && <p className="approval-reason">{c.aiReason}</p>}
              <p className="approval-date">Başvuru: {trDate(c.openedAt)}</p>
              <div className="approval-actions">
                <Button
                  size="sm"
                  variant="primary"
                  loading={mutation.isPending}
                  onClick={() => mutation.mutate({ id: c.id, action: 'approve', type: c.approvalType })}
                >
                  Onayla
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  loading={mutation.isPending}
                  onClick={() => mutation.mutate({ id: c.id, action: 'reject', type: c.approvalType })}
                >
                  Reddet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
