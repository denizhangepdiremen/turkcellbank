import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleLabel } from '../../lib/roles'
import './StaffShell.css'

/**
 * Personel panelleri için ortak çerçeve (şube çalışanı/müdür/il müdürü/direktör).
 * Marka rengi (indigo) üst bar + rol rozeti + kullanıcı adı/il + çıkış.
 * İçerik (children) her panelin kendi bölümüdür.
 */
export function StaffShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="staff-page">
      <header className="staff-header">
        <div className="staff-header-left">
          <span className="staff-brand">TurkcellBank</span>
          <span className="staff-role-badge">{roleLabel(user?.role)}</span>
        </div>
        <div className="staff-header-right">
          <div className="staff-user">
            <span className="staff-user-name">{user?.fullName}</span>
            {user?.city && <span className="staff-user-city">{user.city}</span>}
          </div>
          <button className="staff-logout" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
      </header>

      <main className="staff-main">
        <div className="staff-titlebar">
          <h1 className="staff-title">{title}</h1>
          {subtitle && <p className="staff-subtitle">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  )
}

/**
 * Personel panelleri için sekme çubuğu. Müşteri panelindeki gibi: üstte yapışkan
 * (sticky) sekmeler, aynı anda tek bölüm görünür — uzun listede aşağı kaydırma derdi yok.
 * tabs: her biri { id, label, content } olan bölümler.
 */
export interface StaffTab {
  id: string
  label: string
  content: ReactNode
}

export function StaffTabs({ tabs }: { tabs: StaffTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id)
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]
  return (
    <>
      <nav className="staff-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={active?.id === t.id ? 'staff-tab active' : 'staff-tab'}
            onClick={() => setActiveId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="staff-tab-panel">{active?.content}</div>
    </>
  )
}

/**
 * "Yapım aşamasında" placeholder kutusu — Sprint 1'de panellerin içini doldurur.
 * upcoming: bir sonraki sprintlerde gelecek özelliklerin listesi.
 */
export function ComingSoon({
  lead,
  upcoming,
}: {
  lead: string
  upcoming: string[]
}) {
  return (
    <section className="staff-placeholder">
      <p className="staff-placeholder-lead">{lead}</p>
      <ul className="staff-placeholder-list">
        {upcoming.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="staff-placeholder-note">
        Bu özellikler bir sonraki aşamalarda eklenecek.
      </p>
    </section>
  )
}
