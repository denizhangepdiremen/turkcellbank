import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Korumalı sayfaları sarmalar.
 *  - Giriş yapılmamışsa → login'e
 *  - requiredRole verilmiş ve kullanıcının rolü uymuyorsa → dashboard'a
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

  // Rol gerekiyorsa ve uymuyorsa, normal kullanıcıyı dashboard'a gönder
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
