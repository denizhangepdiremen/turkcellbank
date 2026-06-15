import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import './Login.css'

/**
 * Login ekranı.
 *
 * NOT: Backend henüz yok. Bu yüzden giriş şimdilik SİMÜLASYON:
 *  - Form alanları çalışır, doğrulama (validation) çalışır.
 *  - "Giriş Yap"a basınca kısa bir bekleme (loading) sonrası başarı mesajı gösterilir.
 *  - Backend aşamasına geçince burayı React Hook Form + Zod ve gerçek API
 *    çağrısıyla değiştireceğiz.
 */
export function Login() {
  // Form alanlarının değerleri
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Her alanın hata mesajı (boşsa hata yok)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  )

  // "Giriş Yap"a basılınca dönen spinner için
  const [loading, setLoading] = useState(false)
  // Simülasyon başarılıysa gösterilecek mesaj
  const [success, setSuccess] = useState(false)

  /**
   * Basit/manuel doğrulama.
   * Hata bulursa errors nesnesi döndürür; hata yoksa boş nesne döner.
   */
  function validate() {
    const nextErrors: { email?: string; password?: string } = {}

    // E-posta: boş olmamalı ve basit bir e-posta kalıbına uymalı
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      nextErrors.email = 'E-posta adresi gerekli.'
    } else if (!emailPattern.test(email)) {
      nextErrors.email = 'Geçerli bir e-posta adresi girin.'
    }

    // Şifre: boş olmamalı ve en az 6 karakter olmalı
    if (!password) {
      nextErrors.password = 'Şifre gerekli.'
    } else if (password.length < 6) {
      nextErrors.password = 'Şifre en az 6 karakter olmalı.'
    }

    return nextErrors
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault() // sayfanın yeniden yüklenmesini engelle
    setSuccess(false)

    const nextErrors = validate()
    setErrors(nextErrors)

    // Hata varsa giriş işlemini başlatma
    if (Object.keys(nextErrors).length > 0) return

    // --- Giriş simülasyonu (backend yerine) ---
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
    }, 1500)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-brand">TurkcellBank</h1>
          <p className="login-subtitle">Hesabınıza giriş yapın</p>
        </div>

        {/* Başarılı giriş simülasyonu mesajı */}
        {success && (
          <div className="login-success">
            Giriş başarılı! (simülasyon — backend bağlanınca gerçek olacak)
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="E-posta"
            type="email"
            placeholder="ornek@turkcellbank.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={loading}
          />

          <Input
            label="Şifre"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={loading}
          />

          <div className="login-options">
            <Checkbox label="Beni hatırla" disabled={loading} />
            <Link className="login-link" to="/forgot-password">
              Şifremi unuttum
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading}>
            Giriş Yap
          </Button>
        </form>

        <p className="login-footer">
          Hesabınız yok mu?{' '}
          <Link className="login-link" to="/register">
            Kayıt olun
          </Link>
        </p>
      </div>
    </div>
  )
}
