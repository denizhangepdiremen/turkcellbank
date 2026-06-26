import { z } from 'zod'

function isValidTcKimlik(value: string) {
  const tc = value.trim()
  if (!/^\d{11}$/.test(tc)) return false

  // Test/demo ortamında gerçek TC algoritmasını zorlamıyoruz; yalnızca
  // 11 hane formatını kontrol ediyoruz. Benzersizlik backend'de kontrol edilir.
  return true

  // Gerçek TC algoritması gerekirse tekrar açılabilir:
  // if (!/^[1-9]\d{10}$/.test(tc)) return false
  // const d = tc.split('').map(Number)
  // const oddSum = d[0] + d[2] + d[4] + d[6] + d[8]
  // const evenSum = d[1] + d[3] + d[5] + d[7]
  // const tenth = ((oddSum * 7 - evenSum) % 10 + 10) % 10
  // if (tenth !== d[9]) return false
  // const first10Sum = d.slice(0, 10).reduce((sum, digit) => sum + digit, 0)
  // return first10Sum % 10 === d[10]
}

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
    nationalId: z
      .string()
      .min(1, 'TC kimlik numarası zorunludur.')
      .refine(isValidTcKimlik, 'TC kimlik numarası 11 haneli olmalı.'),
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
