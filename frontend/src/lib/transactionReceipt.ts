import type { Transaction } from './types'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

const trDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const txTypeLabel = (type: Transaction['type']) => {
  if (type === 'Deposit') return 'Para Yatırma'
  if (type === 'Transfer') return 'Havale'
  if (type === 'Payment') return 'Kart Ödemesi'
  if (type === 'Refund') return 'İade'
  if (type === 'LoanDisbursement') return 'Kredi Kullandırımı'
  if (type === 'LoanRepayment') return 'Kredi Taksiti'
  if (type === 'BillPayment') return 'Fatura Ödemesi'
  return type
}

export interface TransactionReceiptInput {
  transaction: Transaction
  customerName: string
  accountIban?: string | null
}

export function openTransactionReceipt({
  transaction,
  customerName,
  accountIban,
}: TransactionReceiptInput) {
  const iban = accountIban ?? transaction.accountIban
  const amountSign = transaction.direction === 'In' ? '+' : '-'
  const directionLabel = transaction.direction === 'In' ? 'Gelen' : 'Giden'
  const counterpartyLabel = transaction.direction === 'In' ? 'Gönderen / Kaynak' : 'Alıcı / Hedef'

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>İşlem Dekontu - ${esc(transaction.id.slice(0, 8))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
  .brand { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
  .doc-title { font-size: 14px; color: #64748b; margin-top: 2px; }
  .meta { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; }
  .meta-row { display: flex; justify-content: space-between; gap: 24px; font-size: 13px; padding: 4px 0; }
  .meta-row span:first-child { color: #64748b; }
  .meta-row span:last-child { font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th { text-align: left; background: #f1f5f9; color: #475569; padding: 10px; border-bottom: 2px solid #e2e8f0; }
  th.amount, td.amount { text-align: right; }
  td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; }
  .totals { margin-top: 16px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
  .totals .row { display: flex; gap: 24px; font-size: 13px; }
  .totals .row span:first-child { color: #64748b; }
  .totals .net { font-size: 15px; font-weight: 800; color: #4f46e5; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="brand">TurkcellBank</div>
  <div class="doc-title">İşlem Dekontu</div>

  <div class="meta">
    <div class="meta-row"><span>Müşteri</span><span>${esc(customerName)}</span></div>
    <div class="meta-row"><span>İşlem No</span><span>${esc(transaction.id)}</span></div>
    <div class="meta-row"><span>İşlem Tarihi</span><span>${trDate(transaction.createdAt)}</span></div>
    <div class="meta-row"><span>Kanal</span><span>${transaction.channel === 'Branch' ? 'Şube' : 'İnternet'}</span></div>
    <div class="meta-row"><span>Hesap</span><span>${iban ? esc(iban) : '-'}</span></div>
    <div class="meta-row"><span>${counterpartyLabel}</span><span>${transaction.counterpartyIban ? esc(transaction.counterpartyIban) : '-'}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>İşlem</th>
        <th>Yön</th>
        <th>Açıklama</th>
        <th class="amount">Tutar</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${txTypeLabel(transaction.type)}</td>
        <td>${directionLabel}</td>
        <td>${esc(transaction.description || '-')}</td>
        <td class="amount">${amountSign}${formatTL(transaction.amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="row net"><span>İşlem Tutarı</span><span>${amountSign}${formatTL(transaction.amount)}</span></div>
  </div>

  <div class="footer">
    Bu belge TurkcellBank tarafından oluşturulmuş işlem dekontudur (eğitim simülasyonu).
  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}
