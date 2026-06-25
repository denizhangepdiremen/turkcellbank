/**
 * Müdür paneli KPI kartlarında kullanılan sade çizgi (line) ikonları.
 * Emoji yerine profesyonel SVG; renk currentColor üzerinden gelir.
 */
type IconName = 'loan' | 'card' | 'transfer' | 'people' | 'branch' | 'chart'

const COMMON = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function StatIcon({ name }: { name: IconName }) {
  switch (name) {
    case 'loan': // banknot / nakit
      return (
        <svg {...COMMON} aria-hidden="true">
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 9.5v5M18 9.5v5" />
        </svg>
      )
    case 'card': // kredi kartı
      return (
        <svg {...COMMON} aria-hidden="true">
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <path d="M2.5 9.5h19M6 15h4" />
        </svg>
      )
    case 'transfer': // havale / transfer okları
      return (
        <svg {...COMMON} aria-hidden="true">
          <path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" />
        </svg>
      )
    case 'people': // personel / kişi
      return (
        <svg {...COMMON} aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      )
    case 'branch': // şube / bina
      return (
        <svg {...COMMON} aria-hidden="true">
          <path d="M4 20V7l8-3 8 3v13" />
          <path d="M3.5 20h17M9 20v-4h6v4M9 11h2M13 11h2" />
        </svg>
      )
    case 'chart':
    default: // genel / grafik
      return (
        <svg {...COMMON} aria-hidden="true">
          <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />
        </svg>
      )
  }
}

// Stat etiketinden ikon adını çıkar
export function statIconName(label: string): IconName {
  if (label.includes('kredi')) return 'loan'
  if (label.includes('kart')) return 'card'
  if (label.includes('havale')) return 'transfer'
  if (label.includes('çalışan') || label.includes('müdür')) return 'people'
  if (label.toLowerCase().includes('şube')) return 'branch'
  return 'chart'
}
