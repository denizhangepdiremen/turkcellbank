import type { Transaction } from './types'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

const trDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

const txTypeLabel = (type: Transaction['type']) => {
  if (type === 'Deposit') return 'Para Yatırma'
  if (type === 'Transfer') return 'Havale'
  if (type === 'Payment') return 'Kart Ödemesi'
  if (type === 'Refund') return 'İade'
  if (type === 'LoanDisbursement') return 'Kredi Kullandırımı'
  if (type === 'LoanRepayment') return 'Kredi Taksiti'
  if (type === 'BillPayment') return 'Fatura Ödemesi'
  if (type === 'TimeDepositOpen') return 'Vadeli Mevduat Açılışı'
  if (type === 'TimeDepositMaturity') return 'Vadeli Mevduat Getirisi'
  return type
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface AccountStatementInput {
  customerName: string
  accountLabel: string
  accountIban?: string | null
  transactions: Transaction[]
  fromDate?: string
  toDate?: string
}

export function openAccountStatement({
  customerName,
  accountLabel,
  accountIban,
  transactions,
  fromDate,
  toDate,
}: AccountStatementInput) {
  const sorted = [...transactions].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  )
  const income = sorted
    .filter((tx) => tx.direction === 'In')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const expense = sorted
    .filter((tx) => tx.direction === 'Out')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const period = fromDate || toDate
    ? `${fromDate || 'Başlangıç'} - ${toDate || 'Bugün'}`
    : 'Tüm dönem'

  const rows = sorted
    .map((tx) => {
      const sign = tx.direction === 'In' ? '+' : '-'
      return `
        <tr>
          <td>${trDate(tx.createdAt)}</td>
          <td>${txTypeLabel(tx.type)}</td>
          <td>${esc(tx.description || '-')}</td>
          <td>${tx.counterpartyIban ? esc(tx.counterpartyIban) : '-'}</td>
          <td class="amount ${tx.direction === 'In' ? 'in' : 'out'}">${sign}${formatTL(tx.amount)}</td>
        </tr>`
    })
    .join('')

  const emptyRow = '<tr><td colspan="5" class="empty">Bu dönemde işlem bulunmuyor.</td></tr>'

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Hesap Ekstresi - ${esc(accountLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
  .brand { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
  .doc-title { font-size: 14px; color: #64748b; margin-top: 2px; }
  .meta { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; }
  .meta-row { display: flex; justify-content: space-between; gap: 24px; font-size: 13px; padding: 4px 0; }
  .meta-row span:first-child { color: #64748b; }
  .meta-row span:last-child { font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th { text-align: left; background: #f1f5f9; color: #475569; padding: 10px; border-bottom: 2px solid #e2e8f0; }
  th.amount, td.amount { text-align: right; white-space: nowrap; }
  td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  td.empty { text-align: center; color: #94a3b8; padding: 24px; }
  td.in { color: #059669; font-weight: 700; }
  td.out { color: #dc2626; font-weight: 700; }
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
  <div class="doc-title">Hesap Hareketleri Ekstresi</div>

  <div class="meta">
    <div class="meta-row"><span>Müşteri</span><span>${esc(customerName)}</span></div>
    <div class="meta-row"><span>Hesap</span><span>${esc(accountLabel)}</span></div>
    <div class="meta-row"><span>IBAN</span><span>${accountIban ? esc(accountIban) : '-'}</span></div>
    <div class="meta-row"><span>Dönem</span><span>${esc(period)}</span></div>
    <div class="meta-row"><span>Düzenleme Tarihi</span><span>${trDate(new Date().toISOString())}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tarih</th>
        <th>İşlem</th>
        <th>Açıklama</th>
        <th>Karşı Hesap</th>
        <th class="amount">Tutar</th>
      </tr>
    </thead>
    <tbody>${rows || emptyRow}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Toplam Gelen</span><span>${formatTL(income)}</span></div>
    <div class="row"><span>Toplam Giden</span><span>${formatTL(expense)}</span></div>
    <div class="row net"><span>Net Hareket</span><span>${formatTL(income - expense)}</span></div>
  </div>

  <div class="footer">
    Bu belge TurkcellBank tarafından oluşturulmuş hesap hareketleri ekstresidir (eğitim simülasyonu).
  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=900')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}
