import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { TOKEN_KEY } from '../lib/apiClient'
import type { User } from '../lib/types'
import * as authApi from '../api/authApi'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  loading: boolean // başlangıçta token'dan kullanıcı yüklenirken true
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Uygulama genelinde oturum durumunu yönetir.
 * Token localStorage'da saklanır; sayfa yenilenince oturum korunur.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  )
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Açılışta token varsa kullanıcıyı backend'den çek (/me)
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const res = await authApi.getMe()
        if (res.success && res.data) setUser(res.data)
      } catch {
        // Geçersiz token'da 401 interceptor zaten temizler
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [token])

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password })
    if (res.success && res.data) {
      localStorage.setItem(TOKEN_KEY, res.data.token)
      setToken(res.data.token)
      setUser(res.data.user)
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!token, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Oturum bilgisine erişmek için kısa yol: const { user, login } = useAuth()
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
