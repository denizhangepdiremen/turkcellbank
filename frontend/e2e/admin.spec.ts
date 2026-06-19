import { test, expect } from '@playwright/test'
import { ADMIN, loginViaUi } from './helpers'

// Backend gerektirir. Admin, backend açılışında seed edilir.
test.describe('Admin paneli', () => {
  // Her testten önce admin olarak giriş yap
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, ADMIN.email, ADMIN.password)
    await page.waitForURL(/\/admin$/)
  })

  test('admin girişi /admin paneline yönlendirir', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByText('TurkcellBank')).toBeVisible()
  })

  test('admin panelinde yönetim bölümleri görünür', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Kart Başvuruları' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kredi Başvuruları' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ödemeler' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kullanıcılar' })).toBeVisible()
  })

  // ↓ Buraya kendi testlerini ekleyebilirsin
})
