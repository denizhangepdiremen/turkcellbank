import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Checkbox } from '../../components/Checkbox'
import { Alert } from '../../components/Alert'
import { register as registerUser } from '../../api/authApi'
import { registerSchema, type RegisterFormValues } from '../../lib/validation'
import { getApiErrorMessage } from '../../lib/apiError'
import { usePageTitle } from '../../lib/usePageTitle'
import { AuthLayout } from '../auth/AuthLayout'

/**
 * Register ekranı — gerçek backend'e bağlı.
 * Form: React Hook Form + Zod. Başarılı kayıtta login'e yönlendirir.
 */
export function Register() {
  usePageTitle('Kayıt Ol')
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
  })

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null)
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      })
      // Başarılı: login ekranına git, orada başarı mesajı göster
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Kayıt başarısız.'))
    }
  }

  return (
    <AuthLayout title="Hesabınızı oluşturun" subtitle="Dakikalar içinde TurkcellBank müşterisi olun">
      {serverError && (
        <div className="auth-alert">
          <Alert variant="error">{serverError}</Alert>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Ad Soyad"
          placeholder="Adınızı ve soyadınızı girin"
          error={errors.fullName?.message}
          disabled={isSubmitting}
          {...register('fullName')}
        />

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
          placeholder="En az 6 karakter"
          error={errors.password?.message}
          disabled={isSubmitting}
          {...register('password')}
        />

        <Input
          label="Şifre (Tekrar)"
          type="password"
          placeholder="Şifrenizi tekrar girin"
          error={errors.confirmPassword?.message}
          disabled={isSubmitting}
          {...register('confirmPassword')}
        />

        <Checkbox
          label="Kullanım koşullarını ve gizlilik politikasını kabul ediyorum"
          error={errors.acceptedTerms?.message}
          disabled={isSubmitting}
          {...register('acceptedTerms')}
        />

        <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
          Kayıt Ol
        </Button>
      </form>
    </AuthLayout>
  )
}
