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
import { roleHomePath } from '../../lib/roles'
import { AuthLayout } from '../auth/AuthLayout'

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
      // Her rol kendi ana paneline yönlenir (müşteri/personel/admin)
      navigate(roleHomePath(loggedIn.role), { replace: true })
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Giriş başarısız.'))
    }
  }

  return (
    <AuthLayout title="Tekrar hoş geldiniz" subtitle="Hesabınıza giriş yapın">
      {registered && (
        <div className="auth-alert">
          <Alert variant="success">
            Kayıt başarılı! Şimdi giriş yapabilirsiniz.
          </Alert>
        </div>
      )}

      {serverError && (
        <div className="auth-alert">
          <Alert variant="error">{serverError}</Alert>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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

        <div className="auth-options">
          <Checkbox label="Beni hatırla" disabled={isSubmitting} />
          <Link className="auth-link" to="/forgot-password">
            Şifremi unuttum
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
          Giriş Yap
        </Button>
      </form>
    </AuthLayout>
  )
}
