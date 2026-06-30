import type { FxTrade } from './types'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

const trDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const formatFxAmount = (trade: FxTrade) =>
  `${trade.amount.toLocaleString('tr-TR', {
    minimumFractionDigits: trade.currency === 'XAU' ? 2 : 2,
    maximumFractionDigits: trade.currency === 'XAU' ? 4 : 2,
  })} ${trade.code}`

export interface FxReceiptInput {
  trade: FxTrade
  customerName: string
}

export function openFxReceipt({ trade, customerName }: FxReceiptInput) {
  const sideLabel = trade.side === 'Buy' ? 'Alış' : 'Satış'
  const tryLabel = trade.side === 'Buy' ? 'Ödenen TL' : 'Alınan TL'
  const foreignLabel = trade.side === 'Buy' ? 'Alınan Miktar' : 'Satılan Miktar'

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Döviz Dekontu - ${esc(trade.id.slice(0, 8))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
  .brand { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
  .doc-title { font-size: 14px; color: #64748b; margin-top: 2px; }
  .meta { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; }
  .meta-row { display: flex; justify-content: space-between; gap: 24px; font-size: 13px; padding: 5px 0; }
  .meta-row span:first-child { color: #64748b; }
  .meta-row span:last-child { font-weight: 600; text-align: right; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
  .summary div { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #f8fafc; }
  .summary span { display: block; color: #64748b; font-size: 12px; }
  .summary strong { display: block; margin-top: 4px; color: #111827; font-size: 16px; }
  .summary .accent strong { color: #4f46e5; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="brand">TurkcellBank</div>
  <div class="doc-title">Döviz / Altın İşlem Dekontu</div>

  <div class="meta">
    <div class="meta-row"><span>Müşteri</span><span>${esc(customerName)}</span></div>
    <div class="meta-row"><span>İşlem No</span><span>${esc(trade.id)}</span></div>
    <div class="meta-row"><span>Referans Kodu</span><span>FX-${esc(trade.id.slice(0, 8).toUpperCase())}</span></div>
    <div class="meta-row"><span>İşlem Tarihi</span><span>${trDate(trade.createdAt)}</span></div>
    <div class="meta-row"><span>İşlem</span><span>${trade.code} ${sideLabel}</span></div>
    <div class="meta-row"><span>TL Hesabı</span><span>${esc(trade.tryIban)}</span></div>
    <div class="meta-row"><span>Döviz / Altın Hesabı</span><span>${esc(trade.foreignIban)}</span></div>
  </div>

  <div class="summary">
    <div class="accent"><span>${foreignLabel}</span><strong>${formatFxAmount(trade)}</strong></div>
    <div><span>Uygulanan Kur</span><strong>${formatTL(trade.rate)}</strong></div>
    <div><span>${tryLabel}</span><strong>${formatTL(trade.tryAmount)}</strong></div>
  </div>

  <div class="footer">
    Bu belge TurkcellBank tarafından oluşturulmuş döviz/altın işlem dekontudur (eğitim simülasyonu).
  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=820,height=900')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}
