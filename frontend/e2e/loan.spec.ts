import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi, openTab, applyForLoan, openAccount } from './helpers'

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

  // Kredi onaylanınca para hesaba yatar; taksit seçilen hesaptan ödenir.
  // Borçsuz taze müşteri + yüksek gelir/düşük tutar → otomatik onay garanti.
  test('onaylı kredide taksit ödenir', async ({ page }) => {
    const customer = {
      name: 'Taksit Musteri',
      email: `taksit${Date.now()}@turkcellbank.com`,
      password: 'parola123',
    }
    await ensureRegistered(customer)
    await page.evaluate(() => localStorage.clear()) // beforeEach'teki DUMMY oturumunu bırak
    await loginViaUi(page, customer.email, customer.password)
    await openAccount(page)

    const tag = `Taksit${Date.now()}`
    await applyForLoan(page, {
      income: '500000',
      expenses: '50000',
      amount: '100000',
      profession: tag,
      term: '12',
      age: '40',
      employment: '60',
    })

    await openTab(page, 'Krediler')
    const row = page.locator('.dashboard-loan-row', { hasText: tag }).first()
    await expect(row.getByText('Onaylandı')).toBeVisible()
    await expect(row.getByText('0/12 taksit ödendi')).toBeVisible()

    await row.getByRole('button', { name: 'Taksit Öde' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Öde' }).click()
    await expect(page.getByText('Taksit ödendi.')).toBeVisible()

    await expect(
      page.locator('.dashboard-loan-row', { hasText: tag }).first()
        .getByText('1/12 taksit ödendi'),
    ).toBeVisible()
  })
})
