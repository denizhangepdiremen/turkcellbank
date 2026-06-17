import { z } from 'zod'

// Giriş formu kuralları
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta zorunludur.')
    .email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// Kayıt formu kuralları
export const registerSchema = z
  .object({
    fullName: z.string().min(3, 'Ad Soyad en az 3 karakter olmalı.'),
    email: z
      .string()
      .min(1, 'E-posta zorunludur.')
      .email('Geçerli bir e-posta adresi girin.'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalı.'),
    confirmPassword: z.string().min(1, 'Şifreyi tekrar girin.'),
    acceptedTerms: z.boolean(),
  })
  // Şifreler eşleşmeli (hata "confirmPassword" alanında gösterilir)
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  })
  // Koşullar kabul edilmeli
  .refine((d) => d.acceptedTerms === true, {
    message: 'Devam etmek için koşulları kabul etmelisiniz.',
    path: ['acceptedTerms'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
