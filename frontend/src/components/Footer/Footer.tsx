/**
 * Footer: tüm sayfaların altında görünen kurumsal alt bilgi.
 * Gerçek banka siteleri gibi: hızlı bağlantılar + telif + iletişim merkezi.
 * Bağlantılar şimdilik placeholder (gerçek sayfa yok) — varsayılan davranışı
 * engellenir, görsel/profesyonel amaçlıdır.
 */
const LINKS = ['Site Haritası', 'Bize Yazın', 'Şube / ATM', 'Güvenlik Bilgileri']

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Sol: bağlantılar + telif */}
        <div className="flex flex-col gap-2">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((label) => (
              <a
                key={label}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-medium text-gray-600 transition-colors hover:text-indigo-600"
              >
                {label}
              </a>
            ))}
          </nav>
          <p className="text-gray-400">
            © {year} TurkcellBank A.Ş. Tüm hakları saklıdır.
          </p>
        </div>

        {/* Sağ: müşteri iletişim merkezi */}
        <div className="flex items-center gap-3 text-gray-600">
          <svg
            className="h-6 w-6 text-indigo-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <div className="leading-tight">
            <p className="font-semibold text-gray-800">444 0 000</p>
            <p className="text-xs text-gray-400">Müşteri İletişim Merkezi</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
