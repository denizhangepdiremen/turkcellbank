import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, CardContent } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Skeleton } from '../../components/Skeleton'
import { Modal } from '../../components/Modal'
import { getPendingLoans, approveLoan, rejectLoan } from '../../api/approvalApi'
import { getApiErrorMessage } from '../../lib/apiError'
import { roleLabel } from '../../lib/roles'
import type { PendingLoan } from '../../lib/types'
import './LoanApprovalQueue.css'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
const trDate = (s: string) => new Date(s).toLocaleString('tr-TR')
const maritalLabel = (m: string) => (m === 'Married' ? 'Evli' : 'Bekâr')
const housingLabel = (h: string) => (h === 'Owner' ? 'Ev sahibi' : 'Kiracı')

type Action = 'approve' | 'reject'

/**
 * Yetkili kredi onay kuyruğu. Şube/il müdürü ve direktör panellerinde aynı
 * komponent kullanılır; backend her krediye CanApprove bilgisini koyar.
 * Yetkili olunan krediler onaylanır/reddedilir, diğerleri salt görüntülenir.
 */
export function LoanApprovalQueue() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pending-loans'],
    queryFn: getPendingLoans,
  })
  const loans = data?.data ?? []

  // Karar modalı durumu
  const [decision, setDecision] = useState<{ loan: PendingLoan; action: Action } | null>(null)
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: ({ loan, action }: { loan: PendingLoan; action: Action }) =>
      action === 'approve' ? approveLoan(loan.id, note) : rejectLoan(loan.id, note),
    onSuccess: (_res, vars) => {
      toast.success(vars.action === 'approve' ? 'Başvuru onaylandı.' : 'Başvuru reddedildi.')
      queryClient.invalidateQueries({ queryKey: ['pending-loans'] })
      setDecision(null)
      setNote('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  function openDecision(loan: PendingLoan, action: Action) {
    setNote('')
    setDecision({ loan, action })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="approval-skeletons">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent>
          <div className="approval-empty">Onay kuyruğu yüklenemedi.</div>
        </CardContent>
      </Card>
    )
  }

  if (loans.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="approval-empty">Şu an onay bekleyen kredi başvurusu yok.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="approval-list">
        {loans.map((loan) => (
          <Card key={loan.id}>
            <CardContent>
              <div className="approval-card">
                <div className="approval-card-head">
                  <div>
                    <p className="approval-applicant">{loan.applicantName}</p>
                    <p className="approval-applicant-sub">{loan.applicantEmail}</p>
                  </div>
                  <div className="approval-amount">
                    <span className="approval-amount-value">{formatTL(loan.amount)}</span>
                    <span className="approval-amount-term">{loan.termMonths} ay</span>
                  </div>
                </div>

                <div className="approval-badges">
                  <Badge variant="info">{roleLabel(loan.requiredApproverRole)} bandı</Badge>
                  <Badge variant={loan.recommendedStatus === 'Approved' ? 'success' : 'warning'}>
                    AI önerisi: {loan.recommendedStatus === 'Approved' ? 'Onay' : 'Red'}
                  </Badge>
                  <span className="approval-score">Risk skoru: {loan.score}</span>
                </div>

                <div className="approval-grid">
                  <div><span>Gelir</span><strong>{formatTL(loan.income)}</strong></div>
                  <div><span>Gider</span><strong>{formatTL(loan.monthlyExpenses)}</strong></div>
                  <div><span>Maks. limit</span><strong>{formatTL(loan.maxLimit)}</strong></div>
                  <div><span>Mevcut borç</span><strong>{formatTL(loan.existingDebt)}</strong></div>
                  <div><span>Net limit</span><strong>{formatTL(loan.netLimit)}</strong></div>
                  <div><span>Meslek</span><strong>{loan.profession}</strong></div>
                  <div><span>Yaş / kıdem</span><strong>{loan.age} / {loan.employmentMonths} ay</strong></div>
                  <div><span>Profil</span><strong>{maritalLabel(loan.maritalStatus)}, {loan.childrenCount} çocuk, {housingLabel(loan.housingStatus)}</strong></div>
                </div>

                <p className="approval-reason">{loan.aiReason}</p>
                <p className="approval-date">Başvuru: {trDate(loan.createdAt)}</p>

                {loan.canApprove ? (
                  <div className="approval-actions">
                    <Button size="sm" variant="primary" onClick={() => openDecision(loan, 'approve')}>
                      Onayla
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openDecision(loan, 'reject')}>
                      Reddet
                    </Button>
                  </div>
                ) : (
                  <p className="approval-readonly">
                    Bu kredi {roleLabel(loan.requiredApproverRole)} yetkisindedir — görüntüleme.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Karar (onay/red) modalı — yetkili notu */}
      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.action === 'approve' ? 'Krediyi Onayla' : 'Krediyi Reddet'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecision(null)}>
              Vazgeç
            </Button>
            <Button
              variant={decision?.action === 'approve' ? 'primary' : 'destructive'}
              loading={mutation.isPending}
              onClick={() => decision && mutation.mutate(decision)}
            >
              {decision?.action === 'approve' ? 'Onayla' : 'Reddet'}
            </Button>
          </>
        }
      >
        {decision && (
          <div className="approval-decision">
            <p className="approval-decision-info">
              <strong>{decision.loan.applicantName}</strong> · {formatTL(decision.loan.amount)}
              {decision.loan.recommendedStatus !== (decision.action === 'approve' ? 'Approved' : 'Rejected') && (
                <span className="approval-override-warn">
                  {' '}— AI önerisinin aksine karar veriyorsunuz.
                </span>
              )}
            </p>
            <label className="approval-note-label">
              Karar notu (müşteriye gösterilir, opsiyonel)
              <textarea
                className="approval-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Kararınızla ilgili kısa açıklama…"
              />
            </label>
          </div>
        )}
      </Modal>
    </>
  )
}
