import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi } from './helpers'

// Backend gerektirir. Her testten önce dummy kullanıcıyla giriş yapılır.
test.describe('Hesap işlemleri', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('dashboard ana bölümleri görünür', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Hesaplarım' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kredilerim' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kartlarım' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ödemelerim' })).toBeVisible()
  })

  test('yeni hesap açılır (Bireysel)', async ({ page }) => {
    await page.getByRole('button', { name: '+ Hesap Aç', exact: true }).click()
    // Modal'daki onay butonu (varsayılan tip: Bireysel)
    await page.getByRole('button', { name: 'Hesap Aç', exact: true }).click()
    await expect(page.getByText('Hesap açıldı.')).toBeVisible()
  })

  // ↓ Buraya kendi testlerini ekleyebilirsin
})
