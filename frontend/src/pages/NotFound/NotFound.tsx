import { Link } from 'react-router-dom'
import { usePageTitle } from '../../lib/usePageTitle'

export function NotFound() {
  usePageTitle('Sayfa bulunamadı')
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        backgroundColor: '#eef2ff',
        textAlign: 'center',
        padding: '1.5rem',
      }}
    >
      <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#4f46e5', margin: 0 }}>
        404
      </h1>
      <p style={{ color: '#6b7280', margin: 0 }}>
        Aradığınız sayfa bulunamadı.
      </p>
      <Link
        to="/login"
        style={{ color: '#4f46e5', fontWeight: 500, textDecoration: 'none' }}
      >
        ← Giriş ekranına dön
      </Link>
    </div>
  )
}
