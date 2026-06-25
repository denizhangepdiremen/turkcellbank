import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BankLogo } from './BankLogo'
import './auth.css'

/**
 * Giriş ve Kayıt ekranlarının ortak iskeleti.
 * Üstte tam genişlikte markalı şerit, altta iki sütun:
 * solda tanıtım + öne çıkan özellikler, sağda form kartı.
 * İçerik üstten hizalanır; böylece form yüksekliği değişse de
 * (Giriş ↔ Kayıt) segment toggle'ı yerinde kalır.
 * Mobilde tanıtım sütunu gizlenir, sadece form kalır.
 */
type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
}

// Tanıtım sütunundaki öne çıkan özellikler
const HIGHLIGHTS = [
  { icon: '⚡', title: 'Anında işlem', desc: 'Havale ve EFT saniyeler içinde sonuçlanır.' },
  { icon: '🔒', title: 'Güvenli altyapı', desc: 'Hesaplarınız uçtan uca koruma altında.' },
  { icon: '📱', title: '7/24 erişim', desc: 'Bankanız her an cebinizde, kesintisiz.' },
]

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      {/* Üst marka şeridi — sayfanın tamamına yayılır */}
      <header className="auth-topbar">
        <BankLogo tone="light" size={38} />
        <span className="auth-topbar-tag">Güvenli Dijital Bankacılık</span>
      </header>

      <div className="auth-body">
        <div className="auth-grid">
          {/* Sol — tanıtım ve özellikler */}
          <section className="auth-intro">
            <h2 className="auth-intro-title">Bankacılık, olması gerektiği kadar kolay.</h2>
            <p className="auth-intro-lead">
              Hesaplarınızı yönetin, kredi başvurun, kartlarınızı tek ekrandan kontrol edin.
            </p>

            <ul className="auth-features">
              {HIGHLIGHTS.map((h) => (
                <li key={h.title} className="auth-feature">
                  <span className="auth-feature-icon" aria-hidden="true">{h.icon}</span>
                  <span className="auth-feature-text">
                    <strong>{h.title}</strong>
                    <span className="auth-feature-desc">{h.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Sağ — form kartı */}
          <main className="auth-panel">
            <div className="auth-card">
              <AuthSwitch />

              <div className="auth-card-head">
                <h1 className="auth-card-title">{title}</h1>
                <p className="auth-card-subtitle">{subtitle}</p>
              </div>

              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

/**
 * Giriş / Kayıt arası geçiş yapan segment kontrolü.
 * Aktif sekme mevcut route'a göre belirlenir.
 */
function AuthSwitch() {
  const { pathname } = useLocation()
  const onLogin = pathname.startsWith('/login')

  return (
    <div className="auth-switch" role="tablist" aria-label="Giriş veya kayıt">
      <Link
        to="/login"
        role="tab"
        aria-selected={onLogin}
        className={`auth-switch-tab${onLogin ? ' is-active' : ''}`}
      >
        Giriş Yap
      </Link>
      <Link
        to="/register"
        role="tab"
        aria-selected={!onLogin}
        className={`auth-switch-tab${!onLogin ? ' is-active' : ''}`}
      >
        Kayıt Ol
      </Link>
    </div>
  )
}
