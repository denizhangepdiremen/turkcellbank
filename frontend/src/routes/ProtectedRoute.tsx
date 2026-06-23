import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../lib/roles'

/**
 * Korumalı sayfaları sarmalar.
 *  - Giriş yapılmamışsa → login'e
 *  - requiredRole verilmiş ve kullanıcının rolü uymuyorsa → kendi rolünün ana paneline
 * Her korumalı route kendi requiredRole'ünü belirtir; rol uymazsa kullanıcı
 * yanlış panelde takılmaz, doğrudan kendi paneline yönlenir.
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

  // Rol gerekiyorsa ve uymuyorsa, kullanıcıyı kendi rolünün ana paneline gönder
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={roleHomePath(user?.role)} replace />
  }

  return <>{children}</>
}
