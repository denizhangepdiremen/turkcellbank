import type { ReactNode } from 'react'
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
