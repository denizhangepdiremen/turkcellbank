import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Korumalı sayfaları sarmalar.
 *  - Giriş yapılmamışsa → login'e
 *  - requiredRole verilmiş ve kullanıcının rolü uymuyorsa → kendi paneline
 *  - Admin kullanıcı normal kullanıcı sayfalarına erişemez (sadece admin paneli)
 */
export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactNode
  requiredRole?: string
}) {
  const { isAuthenticated, loading, user } = useAuth()

  // Oturum henüz yükleniyorsa (token'dan /me çekiliyor) bekle
  if (loading) return null

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Admin kullanıcı normal kullanıcı sayfalarına (dashboard vb.) giremez
  if (!requiredRole && user?.role === 'Admin') {
    return <Navigate to="/admin" replace />
  }

  // Rol gerekiyorsa ve uymuyorsa, normal kullanıcıyı dashboard'a gönder
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
