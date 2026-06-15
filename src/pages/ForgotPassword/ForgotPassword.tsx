import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Alert } from '../../components/Alert'
import './ForgotPassword.css'

/**
 * Şifremi Unuttum ekranı.
 *
 * NOT: Backend henüz yok. Akış SİMÜLASYON:
 *  - E-posta doğrulaması çalışır.
 *  - "Sıfırlama bağlantısı gönder"e basınca kısa bekleme sonrası
 *    başarı mesajı (Alert) gösterilir.
 *  - Backend aşamasında gerçek e-posta gönderimi + API çağrısı eklenecek.
 */
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  // Bağlantı gönderildi mi? (başarı mesajını ve formu yönetir)
  const [sent, setSent] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    // E-posta doğrulaması
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      setError('E-posta adresi gerekli.')
      return
    }
    if (!emailPattern.test(email)) {
      setError('Geçerli bir e-posta adresi girin.')
      return
    }
    setError(undefined)

    // --- Gönderim simülasyonu (backend yerine) ---
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 1500)
  }

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <div className="forgot-header">
          <h1 className="forgot-brand">TurkcellBank</h1>
          <p className="forgot-subtitle">
            E-posta adresinizi girin, şifrenizi sıfırlamanız için bir bağlantı
            gönderelim.
          </p>
        </div>

        {sent ? (
          // Başarı durumu: formu gizle, Alert göster
          <Alert variant="success" title="Bağlantı gönderildi">
            <span style={{ wordBreak: 'break-word' }}>{email}</span> adresine
            şifre sıfırlama bağlantısı gönderdik. (simülasyon — backend
            bağlanınca gerçek olacak)
          </Alert>
        ) : (
          <form className="forgot-form" onSubmit={handleSubmit} noValidate>
            <Input
              label="E-posta"
              type="email"
              placeholder="ornek@turkcellbank.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
            >
              Sıfırlama Bağlantısı Gönder
            </Button>
          </form>
        )}

        <p className="forgot-footer">
          <Link className="forgot-link" to="/login">
            ← Giriş ekranına dön
          </Link>
        </p>
      </div>
    </div>
  )
}
