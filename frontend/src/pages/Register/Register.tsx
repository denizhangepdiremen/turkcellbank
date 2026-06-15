import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import './Register.css'

/**
 * Register (Kayıt) ekranı.
 *
 * NOT: Backend henüz yok. Kayıt şimdilik SİMÜLASYON:
 *  - Alanlar ve doğrulama (validation) çalışır.
 *  - "Kayıt Ol"a basınca kısa bekleme sonrası başarı mesajı gösterilir.
 *  - Backend aşamasında burayı React Hook Form + Zod ve gerçek API ile değiştireceğiz.
 */
export function Register() {
  // Form alanları
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Alan bazlı hata mesajları
  const [errors, setErrors] = useState<{
    fullName?: string
    email?: string
    password?: string
    confirmPassword?: string
    terms?: string
  }>({})

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  /** Basit/manuel doğrulama. Hata bulursa errors nesnesi döndürür. */
  function validate() {
    const nextErrors: typeof errors = {}

    // Ad Soyad: en az 3 karakter
    if (!fullName.trim()) {
      nextErrors.fullName = 'Ad Soyad gerekli.'
    } else if (fullName.trim().length < 3) {
      nextErrors.fullName = 'Ad Soyad en az 3 karakter olmalı.'
    }

    // E-posta: boş olmamalı + format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      nextErrors.email = 'E-posta adresi gerekli.'
    } else if (!emailPattern.test(email)) {
      nextErrors.email = 'Geçerli bir e-posta adresi girin.'
    }

    // Şifre: en az 6 karakter
    if (!password) {
      nextErrors.password = 'Şifre gerekli.'
    } else if (password.length < 6) {
      nextErrors.password = 'Şifre en az 6 karakter olmalı.'
    }

    // Şifre tekrar: dolu olmalı ve eşleşmeli
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Şifreyi tekrar girin.'
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Şifreler eşleşmiyor.'
    }

    // Koşullar kabul edilmeli
    if (!acceptedTerms) {
      nextErrors.terms = 'Devam etmek için koşulları kabul etmelisiniz.'
    }

    return nextErrors
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSuccess(false)

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // --- Kayıt simülasyonu (backend yerine) ---
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
    }, 1500)
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <h1 className="register-brand">TurkcellBank</h1>
          <p className="register-subtitle">Yeni hesap oluşturun</p>
        </div>

        {success && (
          <div className="register-success">
            Kayıt başarılı! (simülasyon — backend bağlanınca gerçek olacak)
          </div>
        )}

        <form className="register-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Ad Soyad"
            placeholder="Adınızı ve soyadınızı girin"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            disabled={loading}
          />

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
            placeholder="En az 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={loading}
          />

          <Input
            label="Şifre (Tekrar)"
            type="password"
            placeholder="Şifrenizi tekrar girin"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            disabled={loading}
          />

          <Checkbox
            label="Kullanım koşullarını ve gizlilik politikasını kabul ediyorum"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            error={errors.terms}
            disabled={loading}
          />

          <Button type="submit" variant="primary" size="lg" loading={loading}>
            Kayıt Ol
          </Button>
        </form>

        <p className="register-footer">
          Zaten hesabınız var mı?{' '}
          <Link className="register-link" to="/login">
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  )
}
