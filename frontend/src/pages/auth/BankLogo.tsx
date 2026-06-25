/**
 * TurkcellBank marka logosu — SVG monogram (yükselen çubuklar) + wordmark.
 * tone="light": koyu/gradient zemin üstünde beyaz yazı.
 * tone="dark": beyaz kart üstünde renkli yazı.
 */
type BankLogoProps = {
  tone?: 'light' | 'dark'
  size?: number
  showText?: boolean
}

export function BankLogo({ tone = 'dark', size = 40, showText = true }: BankLogoProps) {
  const textColor = tone === 'light' ? '#ffffff' : '#312e81' // indigo-900
  const accentColor = tone === 'light' ? '#c7d2fe' : '#4f46e5' // indigo-200 / indigo-600

  return (
    <span className="bank-logo" aria-label="TurkcellBank">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="48" height="48" rx="13" fill="url(#bankLogoGrad)" />
        {/* Yükselen çubuklar — büyüme/finans imgesi */}
        <rect x="13" y="26" width="5.5" height="9" rx="2" fill="#ffffff" opacity="0.7" />
        <rect x="21.25" y="20" width="5.5" height="15" rx="2" fill="#ffffff" opacity="0.85" />
        <rect x="29.5" y="13" width="5.5" height="22" rx="2" fill="#ffffff" />
        <defs>
          <linearGradient id="bankLogoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#4338ca" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span className="bank-logo-text" style={{ color: textColor }}>
          Turkcell<span style={{ color: accentColor }}>Bank</span>
        </span>
      )}
    </span>
  )
}
