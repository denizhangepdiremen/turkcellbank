import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, CardContent } from '../../components/Card'
import { Button } from '../../components/Button'
import { Skeleton } from '../../components/Skeleton'
import { Modal } from '../../components/Modal'
import { getPendingTransfers, approveTransfer, rejectTransfer } from '../../api/approvalApi'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PendingTransfer } from '../../lib/types'
import { ApprovalHistory, ApprovalViewTabs } from './ApprovalHistory'
import './LoanApprovalQueue.css'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
const trDate = (s: string) => new Date(s).toLocaleString('tr-TR')

type Action = 'approve' | 'reject'

/** Yüksek tutarlı havale onay kuyruğu (yalnızca şube müdürü). */
export function TransferApprovalQueue() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['pending-transfers'], queryFn: getPendingTransfers })
  const transfers = data?.data ?? []

  const [view, setView] = useState<'pending' | 'history'>('pending')
  const [decision, setDecision] = useState<{ t: PendingTransfer; action: Action } | null>(null)
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: ({ t, action }: { t: PendingTransfer; action: Action }) =>
      action === 'approve' ? approveTransfer(t.id, note) : rejectTransfer(t.id, note),
    onSuccess: (_res, vars) => {
      toast.success(vars.action === 'approve' ? 'Havale onaylandı ve gerçekleştirildi.' : 'Havale reddedildi.')
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] })
      setDecision(null)
      setNote('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  return (
    <>
      <ApprovalViewTabs view={view} onChange={setView} pendingCount={transfers.length} />
      {view === 'history' ? (
        <ApprovalHistory kind="transfers" />
      ) : isLoading ? (
        <Card><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
      ) : transfers.length === 0 ? (
        <Card><CardContent><div className="approval-empty">Onay bekleyen havale yok.</div></CardContent></Card>
      ) : (
        <div className="approval-list">
          {transfers.map((t) => (
          <Card key={t.id}>
            <CardContent>
              <div className="approval-card">
                <div className="approval-card-head">
                  <div>
                    <p className="approval-applicant">{t.customerName}</p>
                    <p className="approval-applicant-sub">{t.fromIban} → {t.toIban}</p>
                  </div>
                  <div className="approval-amount">
                    <span className="approval-amount-value">{formatTL(t.amount)}</span>
                  </div>
                </div>
                {t.description && <p className="approval-reason">{t.description}</p>}
                <p className="approval-date">Başvuru: {trDate(t.createdAt)}</p>
                <div className="approval-actions">
                  <Button size="sm" variant="primary" onClick={() => { setNote(''); setDecision({ t, action: 'approve' }) }}>Onayla</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setNote(''); setDecision({ t, action: 'reject' }) }}>Reddet</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.action === 'approve' ? 'Havaleyi Onayla' : 'Havaleyi Reddet'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecision(null)}>Vazgeç</Button>
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
              <strong>{decision.t.customerName}</strong> · {formatTL(decision.t.amount)}
            </p>
            <label className="approval-note-label">
              Karar notu (opsiyonel)
              <textarea className="approval-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
        )}
      </Modal>
    </>
  )
}
