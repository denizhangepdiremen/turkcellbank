import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi, openAccount, applyForCard } from './helpers'

// Kart başvuru akışı — backend gerektirir.
test.describe('Kart işlemleri', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('kart başvurusu yapılır', async ({ page }) => {
    // Önce hesap olduğundan emin ol (hesap yoksa kart açılamaz)
    await openAccount(page)

    await applyForCard(page)

    // Kartlarım bölümünde başvuru görünmeli (Bekliyor durumunda)
    await expect(page.getByText('Bekliyor').first()).toBeVisible()
  })

  test('kart başvuru modalı iptal edilebilir', async ({ page }) => {
    await page.getByRole('button', { name: '+ Kart Aç' }).click()
    await expect(page.getByText('Bağlanacak Hesap').or(page.getByText('Kart açmak için'))).toBeVisible()

    await page.getByRole('button', { name: 'İptal' }).click()
  })
})
