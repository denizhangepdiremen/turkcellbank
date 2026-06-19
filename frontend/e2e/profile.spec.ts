import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi } from './helpers'

// Profil güncelleme akışı — backend gerektirir.
test.describe('Profil güncelleme', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('profil modalı açılır ve ad güncellenir', async ({ page }) => {
    // Profil butonuna tıkla
    await page.getByRole('button', { name: 'Profil' }).click()

    // Modal açıldı, Ad Soyad alanı görünür
    const nameInput = page.getByLabel('Ad Soyad')
    await expect(nameInput).toBeVisible()

    // İsmi değiştir
    await nameInput.clear()
    await nameInput.fill('E2E Güncel İsim')
    await page.getByRole('button', { name: 'Kaydet' }).click()

    // Başarılı toast mesajı
    await expect(page.getByText('Profil güncellendi.')).toBeVisible()

    // Header'da güncel ad görünmeli
    await expect(page.getByText('E2E Güncel İsim')).toBeVisible()
  })

  test.afterAll(async () => {
    // İsmi eski haline getir (sonraki testleri bozmaması için)
    const { request } = await import('@playwright/test')
    const ctx = await request.newContext()
    const loginRes = await ctx.post('http://localhost:5099/api/auth/login', {
      data: { email: DUMMY.email, password: DUMMY.password },
    })
    const body = await loginRes.json()
    const token = body.data?.token
    if (token) {
      await ctx.put('http://localhost:5099/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
        data: { fullName: DUMMY.name },
      })
    }
    await ctx.dispose()
  })
})
