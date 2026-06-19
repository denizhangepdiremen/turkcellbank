import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi, openAccount, applyForLoan } from './helpers'

// Kredi başvuru akışı — backend gerektirir.
test.describe('Kredi işlemleri', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('kredi başvurusu yapılır', async ({ page }) => {
    await applyForLoan(page, {
      income: '45000',
      profession: 'Mühendis',
      amount: '100000',
      term: '24',
    })

    // Kredilerim bölümünde başvuru görünmeli
    await expect(page.getByText('Bekliyor').first()).toBeVisible()
  })

  test('kredi başvuru modalı iptal edilebilir', async ({ page }) => {
    await page.getByRole('button', { name: '+ Kredi Başvur' }).click()
    await expect(page.getByLabel('Aylık Gelir (₺)')).toBeVisible()

    await page.getByRole('button', { name: 'İptal' }).click()
    await expect(page.getByLabel('Aylık Gelir (₺)')).not.toBeVisible()
  })
})
