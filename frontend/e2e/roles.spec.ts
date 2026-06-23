import { test, expect } from '@playwright/test'
import { DUMMY, STAFF, STAFF_PASSWORD, ensureRegistered, loginViaUi } from './helpers'

// Backend gerektirir (5099). Personel hesapları StaffSeed:Password ile seed edilir.
// Rol bazlı yönlendirmeyi ve panel açılışını doğrular (Sprint 1 smoke).
test.describe('Rol bazlı paneller', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear()).catch(() => {})
  })

  for (const [role, info] of Object.entries(STAFF)) {
    test(`${role} kendi paneline yönlenir`, async ({ page }) => {
      await loginViaUi(page, info.email, STAFF_PASSWORD)
      await expect(page).toHaveURL(info.home)
      await expect(page.getByRole('heading', { name: info.heading })).toBeVisible()
    })
  }

  test('müşteri panel adreslerine giremez, kendi panosuna döner', async ({ page }) => {
    await ensureRegistered(DUMMY)
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)

    // Personel paneline gitmeyi dene → kendi panosuna geri yönlenmeli
    await page.goto('/direktor')
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('personel müşteri panosuna giremez, kendi paneline döner', async ({ page }) => {
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/sube-muduru$/)
  })
})
