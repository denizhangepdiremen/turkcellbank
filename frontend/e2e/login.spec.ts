import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi } from './helpers'

// Backend gerektirir (5099). Playwright config backend'i otomatik başlatır.
test.describe('Giriş akışı', () => {
  // Testlerden önce dummy kullanıcının var olduğundan emin ol
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  // Her testten sonra oturumu temizle (örnek hook)
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear()).catch(() => {})
  })

  test('doğru bilgilerle giriş dashboard’a yönlendirir', async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
    // Selamlama saate göre değişir (Günaydın / İyi günler / İyi akşamlar / İyi geceler)
    await expect(
      page.getByRole('heading', {
        name: /Günaydın|İyi günler|İyi akşamlar|İyi geceler/,
      }),
    ).toBeVisible()
  })

  test('yanlış şifre hata bildirimi gösterir', async ({ page }) => {
    await loginViaUi(page, DUMMY.email, 'yanlissifre')
    await expect(page.getByText('E-posta veya şifre hatalı.')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('yanlış e-posta hata bildirimi gösterir', async ({ page}) => {
    await loginViaUi(page, 'yanlışmail@gmail.com', DUMMY.password)
    await expect(page.getByText('Geçerli bir e-posta adresi girin.')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

})
