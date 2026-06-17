import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Korumalı sayfaları sarmalar. Giriş yapılmamışsa login'e yönlendirir.
 * (8c'de Dashboard bununla sarılacak.)
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  // Oturum henüz yükleniyorsa (token'dan /me çekiliyor) bekle
  if (loading) return null

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}
