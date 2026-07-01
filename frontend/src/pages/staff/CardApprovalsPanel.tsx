import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPendingCards, getPendingCreditCards } from '../../api/approvalApi'
import { CardApprovalQueue } from './CardApprovalQueue'
import { CreditCardApprovalQueue } from './CreditCardApprovalQueue'
import './LoanApprovalQueue.css'

/**
 * Birleşik kart onay paneli (şube müdürü). Banka kartı ve kredi kartı başvuru
 * onaylarını tek sekmede, alt sekmelerle toplar; her alt sekme bekleyen sayısını
 * rozet olarak gösterir.
 */
export function CardApprovalsPanel() {
  const [kind, setKind] = useState<'debit' | 'credit'>('debit')

  // Alt sekme rozetleri için bekleyen sayıları (hafif sorgular)
  const { data: debitData } = useQuery({ queryKey: ['pending-cards'], queryFn: getPendingCards })
  const { data: creditData } = useQuery({ queryKey: ['pending-credit-cards'], queryFn: getPendingCreditCards })
  const debitCount = debitData?.data?.length ?? 0
  const creditCount = creditData?.data?.length ?? 0

  return (
    <>
      <div className="approval-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'debit'}
          className={`approval-toggle-tab${kind === 'debit' ? ' is-active' : ''}`}
          onClick={() => setKind('debit')}
        >
          Banka Kartları
          {debitCount ? <span className="approval-toggle-badge">{debitCount}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'credit'}
          className={`approval-toggle-tab${kind === 'credit' ? ' is-active' : ''}`}
          onClick={() => setKind('credit')}
        >
          Kredi Kartları
          {creditCount ? <span className="approval-toggle-badge">{creditCount}</span> : null}
        </button>
      </div>

      {kind === 'debit' ? <CardApprovalQueue /> : <CreditCardApprovalQueue />}
    </>
  )
}
