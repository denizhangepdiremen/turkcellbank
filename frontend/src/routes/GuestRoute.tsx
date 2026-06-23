import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../lib/roles'

/**
 * Sadece giriş yapmamış (misafir) kullanıcılara açık sayfaları sarmalar.
 * Zaten oturum açmışsa → kendi rolünün ana paneline yönlendirir.
 * Gerçek banka uygulamalarında giriş yapmış kullanıcı login/register sayfasını göremez.
 */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth()

  // Token'dan kullanıcı yüklenirken bekle
  if (loading) return null

  if (isAuthenticated) {
    return <Navigate to={roleHomePath(user?.role)} replace />
  }

  return <>{children}</>
}
