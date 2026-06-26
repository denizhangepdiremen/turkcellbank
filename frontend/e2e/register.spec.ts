import { test, expect } from '@playwright/test'
import { API, testNationalIdFor } from './helpers'

// Kayıt (register) akışı — backend gerektirir.
// Her test benzersiz e-posta kullanır ki tekrarlı çalışmalarda çakışma olmasın.
test.describe('Kayıt akışı', () => {
  const uniqueEmail = `e2e-reg-${Date.now()}@turkcellbank.com`

  test('başarılı kayıttan sonra login sayfasına yönlendirilir', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Ad Soyad').fill('Test Kullanıcı')
    await page.getByLabel('E-posta', { exact: true }).fill(uniqueEmail)
    await page.getByLabel('TC Kimlik No').fill(testNationalIdFor(uniqueEmail))
    await page.getByLabel('Şifre', { exact: true }).fill('parola123')
    await page.getByLabel('Şifre (Tekrar)').fill('parola123')
    await page.getByRole('checkbox').check()

    await page.getByRole('button', { name: 'Kayıt Ol' }).click()

    // Başarılı kayıttan sonra /login'e yönlendirilir
    await expect(page).toHaveURL(/\/login$/)
  })

  test('mevcut e-posta ile kayıt olunmaya çalışılırsa hata gösterilir', async ({ page }) => {
    // Önce bu e-postayı kaydet (zaten kayıtlı olsun)
    const { request } = await import('@playwright/test')
    const ctx = await request.newContext()
    await ctx.post(`${API}/api/auth/register`, {
      data: {
        fullName: 'Dup Test',
        email: 'e2e-dup@turkcellbank.com',
        nationalId: testNationalIdFor('e2e-dup@turkcellbank.com'),
        password: 'parola123',
      },
    })
    await ctx.dispose()

    // Aynı e-posta ile kayıt dene
    await page.goto('/register')
    await page.getByLabel('Ad Soyad').fill('Dup Test')
    await page.getByLabel('E-posta', { exact: true }).fill('e2e-dup@turkcellbank.com')
    await page.getByLabel('TC Kimlik No').fill(testNationalIdFor('e2e-dup-ui@turkcellbank.com'))
    await page.getByLabel('Şifre', { exact: true }).fill('parola123')
    await page.getByLabel('Şifre (Tekrar)').fill('parola123')
    await page.getByRole('checkbox').check()

    await page.getByRole('button', { name: 'Kayıt Ol' }).click()

    // Hata mesajı gösterilmeli (backend hatası)
    await expect(page.locator('.alert').or(page.getByRole('alert'))).toBeVisible()
  })

  test('şifreler uyuşmuyorsa client-side hata gösterilir', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Ad Soyad').fill('Test Kullanıcı')
    await page.getByLabel('E-posta', { exact: true }).fill('test@test.com')
    await page.getByLabel('TC Kimlik No').fill(testNationalIdFor('test@test.com'))
    await page.getByLabel('Şifre', { exact: true }).fill('parola123')
    await page.getByLabel('Şifre (Tekrar)').fill('farkli456')
    await page.getByRole('checkbox').check()

    await page.getByRole('button', { name: 'Kayıt Ol' }).click()

    await expect(page.getByText('Şifreler eşleşmiyor.')).toBeVisible()
  })

  test('register sayfasından login sayfasına geçiş yapılır', async ({ page }) => {
    await page.goto('/register')
    // Üstteki segment toggle ile giriş sekmesine geç
    await page.getByRole('tab', { name: 'Giriş Yap' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
