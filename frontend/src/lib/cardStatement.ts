import type { Card, CreditCard, CreditCardStatement, CreditCardTransaction, Payment } from './types'

// Kart ekstresi (aylık) — ayrı bir yazdırma penceresinde şık HTML üretip
// tarayıcının "PDF olarak kaydet" diyaloğunu açar. Böylece Türkçe karakterler
// kusursuz görünür (jsPDF varsayılan fontlarının aksine) ve kullanıcı tek
// tıkla PDF indirir.

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

const trDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const statusLabel = (s: Payment['status']) =>
  s === 'Success' ? 'Başarılı' : s === 'Refunded' ? 'İade' : 'Başarısız'

// Basit HTML kaçışı (açıklama serbest metin olabilir)
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface CardStatementInput {
  card: Card
  payments: Payment[] // bu karta ait, ilgili aydaki ödemeler (filtrelenmiş gelir)
  year: number
  month: number // 0-11
  customerName: string
}

export function openCardStatement({
  card,
  payments,
  year,
  month,
  customerName,
}: CardStatementInput) {
  const donem = `${TR_MONTHS[month]} ${year}`
  const sorted = [...payments].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  )

  const harcama = sorted
    .filter((p) => p.status === 'Success')
    .reduce((sum, p) => sum + p.amount, 0)
  const iade = sorted
    .filter((p) => p.status === 'Refunded')
    .reduce((sum, p) => sum + p.amount, 0)

  const rows = sorted
    .map(
      (p) => `
        <tr>
          <td>${trDate(p.createdAt)}</td>
          <td>${esc(p.description || 'POS Ödemesi')}</td>
          <td>${statusLabel(p.status)}</td>
          <td class="amount">${formatTL(p.amount)}</td>
        </tr>`,
    )
    .join('')

  const emptyRow = `<tr><td colspan="4" class="empty">Bu dönemde işlem bulunmuyor.</td></tr>`

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Kart Ekstresi - ${donem}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
  .brand { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
  .doc-title { font-size: 14px; color: #64748b; margin-top: 2px; }
  .meta { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; }
  .meta-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .meta-row span:first-child { color: #64748b; }
  .meta-row span:last-child { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th { text-align: left; background: #f1f5f9; color: #475569; padding: 10px; border-bottom: 2px solid #e2e8f0; }
  th.amount, td.amount { text-align: right; }
  td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; }
  td.empty { text-align: center; color: #94a3b8; padding: 24px; }
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
  <div class="doc-title">Kart Ekstresi</div>

  <div class="meta">
    <div class="meta-row"><span>Müşteri</span><span>${esc(customerName)}</span></div>
    <div class="meta-row"><span>Kart</span><span>${esc(card.maskedCardNumber)}</span></div>
    <div class="meta-row"><span>Bağlı Hesap</span><span>...${card.accountIban.slice(-4)}</span></div>
    <div class="meta-row"><span>Dönem</span><span>${donem}</span></div>
    <div class="meta-row"><span>Düzenleme Tarihi</span><span>${trDate(new Date().toISOString())}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tarih</th>
        <th>Açıklama</th>
        <th>Durum</th>
        <th class="amount">Tutar</th>
      </tr>
    </thead>
    <tbody>${rows || emptyRow}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Toplam Harcama</span><span>${formatTL(harcama)}</span></div>
    <div class="row"><span>Toplam İade</span><span>${formatTL(iade)}</span></div>
    <div class="row net"><span>Net Harcama</span><span>${formatTL(harcama - iade)}</span></div>
  </div>

  <div class="footer">
    Bu belge TurkcellBank tarafından oluşturulmuş bir kart ekstresidir (eğitim simülasyonu).
  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return false // popup engellendi
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}

const ccTxLabel = (t: CreditCardTransaction['type']) =>
  t === 'Purchase'
    ? 'Harcama'
    : t === 'Installment'
      ? 'Taksit'
      : t === 'Payment'
        ? 'Ödeme'
        : t === 'Refund'
          ? 'İade'
          : t === 'Fee'
            ? 'Ücret/Komisyon'
            : t === 'Interest'
              ? 'Faiz'
              : 'Nakit Avans'

const ccStatusLabel = (s: CreditCardStatement['status']) =>
  s === 'Paid' ? 'Ödendi' : s === 'Overdue' ? 'Gecikmiş' : s === 'Due' ? 'Ödenecek' : 'Açık'

export interface CreditCardStatementInput {
  card: CreditCard
  statement: CreditCardStatement
  transactions: CreditCardTransaction[]
  customerName: string
}

export function openCreditCardStatement({
  card,
  statement,
  transactions,
  customerName,
}: CreditCardStatementInput) {
  const rows = [...transactions]
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .map(
      (t) => `
        <tr>
          <td>${trDate(t.createdAt)}</td>
          <td>${esc(t.description || ccTxLabel(t.type))}</td>
          <td>${ccTxLabel(t.type)}${t.installmentNo && t.installmentCount ? ` (${t.installmentNo}/${t.installmentCount})` : ''}</td>
          <td class="amount">${formatTL(t.amount)}</td>
        </tr>`,
    )
    .join('')

  const emptyRow = `<tr><td colspan="4" class="empty">Bu ekstrede hareket bulunmuyor.</td></tr>`

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Kredi Kartı Ekstresi - ${trDate(statement.statementDate)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
  .brand { font-size: 22px; font-weight: 800; color: #4f46e5; }
  .doc-title { font-size: 14px; color: #64748b; margin-top: 2px; }
  .meta, .summary { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; }
  .meta-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; gap: 24px; }
  .meta-row span:first-child { color: #64748b; }
  .meta-row span:last-child { font-weight: 600; text-align: right; }
  .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; }
  .summary .meta-row { display: block; }
  .summary .meta-row span { display: block; text-align: left; }
  .summary .meta-row span:last-child { font-size: 16px; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th { text-align: left; background: #f1f5f9; color: #475569; padding: 10px; border-bottom: 2px solid #e2e8f0; }
  th.amount, td.amount { text-align: right; }
  td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; }
  td.empty { text-align: center; color: #94a3b8; padding: 24px; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="brand">TurkcellBank</div>
  <div class="doc-title">Kredi Kartı Ekstresi</div>

  <div class="meta">
    <div class="meta-row"><span>Müşteri</span><span>${esc(customerName)}</span></div>
    <div class="meta-row"><span>Kredi Kartı</span><span>${esc(card.maskedCardNumber)}</span></div>
    <div class="meta-row"><span>Dönem</span><span>${trDate(statement.periodStart)} - ${trDate(statement.periodEnd)}</span></div>
    <div class="meta-row"><span>Kesim Tarihi</span><span>${trDate(statement.statementDate)}</span></div>
    <div class="meta-row"><span>Son Ödeme Tarihi</span><span>${trDate(statement.dueDate)}</span></div>
    <div class="meta-row"><span>Durum</span><span>${ccStatusLabel(statement.status)}</span></div>
    <div class="meta-row"><span>Düzenleme Tarihi</span><span>${trDate(new Date().toISOString())}</span></div>
  </div>

  <div class="summary">
    <div class="meta-row"><span>Dönem Borcu</span><span>${formatTL(statement.totalDue)}</span></div>
    <div class="meta-row"><span>Kalan Borç</span><span>${formatTL(statement.remainingAmount)}</span></div>
    <div class="meta-row"><span>Asgari Ödeme</span><span>${formatTL(statement.minimumPayment)}</span></div>
    <div class="meta-row"><span>Ödenen Tutar</span><span>${formatTL(statement.paidAmount)}</span></div>
    <div class="meta-row"><span>İşletilen Faiz</span><span>${formatTL(statement.totalInterestApplied)}</span></div>
    <div class="meta-row"><span>Kullanılabilir Limit</span><span>${formatTL(card.availableLimit)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tarih</th>
        <th>Açıklama</th>
        <th>Tip</th>
        <th class="amount">Tutar</th>
      </tr>
    </thead>
    <tbody>${rows || emptyRow}</tbody>
  </table>

  <div class="footer">
    Bu belge TurkcellBank tarafından oluşturulmuş kredi kartı ekstresidir (eğitim simülasyonu).
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
