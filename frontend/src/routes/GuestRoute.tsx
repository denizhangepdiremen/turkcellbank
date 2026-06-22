import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Sadece giriş yapmamış (misafir) kullanıcılara açık sayfaları sarmalar.
 * Zaten oturum açmışsa → dashboard'a (Admin ise admin paneline) yönlendirir.
 * Gerçek banka uygulamalarında giriş yapmış kullanıcı login/register sayfasını göremez.
 */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth()

  // Token'dan kullanıcı yüklenirken bekle
  if (loading) return null

  if (isAuthenticated) {
    const target = user?.role === 'Admin' ? '/admin' : '/dashboard'
    return <Navigate to={target} replace />
  }

  return <>{children}</>
}
