import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../context/AuthContext'
import { loginSchema, type LoginFormValues } from '../../lib/validation'
import { getApiErrorMessage } from '../../lib/apiError'
import { usePageTitle } from '../../lib/usePageTitle'
import './Login.css'

/**
 * Login ekranı — gerçek backend'e bağlı.
 * Form: React Hook Form + Zod. Giriş: AuthContext.login (JWT alır, saklar).
 */
export function Login() {
  usePageTitle('Giriş')
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  // Backend'den dönen genel hata (örn. "E-posta veya şifre hatalı")
  const [serverError, setServerError] = useState<string | null>(null)

  // Kayıt ekranından yönlendirildiyse başarı mesajı göster
  const registered = (location.state as { registered?: boolean } | null)
    ?.registered

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    try {
      const loggedIn = await login(values.email, values.password)
      // Admin ise admin paneline, değilse dashboard'a
      navigate(loggedIn.role === 'Admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Giriş başarısız.'))
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-brand">TurkcellBank</h1>
          <p className="login-subtitle">Hesabınıza giriş yapın</p>
        </div>

        {registered && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert variant="success">
              Kayıt başarılı! Şimdi giriş yapabilirsiniz.
            </Alert>
          </div>
        )}

        {serverError && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert variant="error">{serverError}</Alert>
          </div>
        )}

        <form
          className="login-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Input
            label="E-posta"
            type="email"
            placeholder="ornek@turkcellbank.com"
            error={errors.email?.message}
            disabled={isSubmitting}
            {...register('email')}
          />

          <Input
            label="Şifre"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={isSubmitting}
            {...register('password')}
          />

          <div className="login-options">
            <Checkbox label="Beni hatırla" disabled={isSubmitting} />
            <Link className="login-link" to="/forgot-password">
              Şifremi unuttum
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
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
