/* Grafiklerde kullanılan ortak renk paleti (indigo ağırlıklı marka tonları).
   recharts bileşenleri bu paletten beslenir; tutarlı ve renkli görünüm sağlar. */

// Çok dilimli grafikler (donut/pasta, çoklu bar) için döngüsel palet
export const CHART_PALETTE = [
  '#4f46e5', // indigo-600
  '#0ea5e9', // sky-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#14b8a6', // teal-500
  '#ef4444', // red-500
]

// Palet renklerini sırayla (döngüsel) verir
export function chartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

// Para birimini kısa biçimde gösterir (grafik etiketleri için)
export function formatTLShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M ₺`
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}B ₺`
  return `${n.toLocaleString('tr-TR')} ₺`
}
