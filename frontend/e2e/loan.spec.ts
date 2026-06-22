import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi, openTab, applyForLoan } from './helpers'

// Kredi başvuru akışı — backend gerektirir.
// Krediler artık başvuru anında AI/kural motoruyla OTOMATİK karara bağlanır
// (Onaylandı/Reddedildi); admin onayı yoktur, "Bekliyor" durumu kalmaz.
test.describe('Kredi işlemleri', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('kredi başvurusu yapılır ve otomatik karara bağlanır', async ({ page }) => {
    // applyForLoan, sonuç modalını (Onaylandı/Reddedildi) bekleyip kapatır
    await applyForLoan(page, {
      income: '45000',
      profession: 'Mühendis',
      amount: '100000',
      term: '24',
    })

    // Kredilerim listesinde karara bağlanmış başvuru görünmeli
    await expect(page.getByText(/Onaylandı|Reddedildi/).first()).toBeVisible()
  })

  test('kredi başvuru modalı iptal edilebilir', async ({ page }) => {
    await openTab(page, 'Krediler')
    await page.getByRole('button', { name: '+ Kredi Başvur' }).click()
    await expect(page.getByLabel('Aylık Gelir (₺)')).toBeVisible()

    await page.getByRole('button', { name: 'İptal' }).click()
    await expect(page.getByLabel('Aylık Gelir (₺)')).not.toBeVisible()
  })
})
