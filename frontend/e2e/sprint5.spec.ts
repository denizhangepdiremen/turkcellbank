import { test, expect } from '@playwright/test'
import {
  STAFF,
  STAFF_PASSWORD,
  ensureRegistered,
  loginViaUi,
  loginAsAdmin,
  applyForLoan,
  openAccount,
  openStaffTab,
} from './helpers'

// Sprint 5: müşteri bildirimi + denetim kaydı. Backend gerektirir (5099).
test.describe('Sprint 5 — bildirim ve denetim kaydı', () => {
  test('kredi onayı müşteriye bildirim düşürür ve admin denetim kaydında görünür', async ({ page }) => {
    const tag = `S5Onay${Date.now()}`
    const customer = {
      name: 'Bildirim Musteri',
      email: `bildirim${Date.now()}@turkcellbank.com`,
      password: 'parola123',
    }
    await ensureRegistered(customer)

    // 1) Müşteri hesap açar (kredi onaylanınca para buraya yatacak) + 30M başvuru (onaya düşer)
    await loginViaUi(page, customer.email, customer.password)
    await openAccount(page)
    await applyForLoan(page, {
      income: '500000',
      expenses: '100000',
      amount: '30000000',
      profession: tag,
      term: '36',
      age: '40',
      marital: 'Married',
      children: '2',
      housing: 'Owner',
      employment: '120',
      expectHeading: /Başvurunuz Onaya Gönderildi/,
    })
    await page.evaluate(() => localStorage.clear())

    // 2) Şube müdürü onaylar
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await openStaffTab(page, 'Kredi Onayları')
    const card = page.locator('.approval-card', { hasText: tag }).first()
    await card.getByRole('button', { name: 'Onayla' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Onayla' }).click()
    await expect(page.getByText('Başvuru onaylandı.')).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 3) Müşteri bildirim zilinde sonucu görür
    await loginViaUi(page, customer.email, customer.password)
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.getByRole('button', { name: 'Bildirimler' }).click()
    await expect(page.getByText('Krediniz onaylandı')).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 4) Admin denetim kaydında kararı görür
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Denetim Kaydı' })).toBeVisible()
    await expect(page.getByText('Kredi onaylandı').first()).toBeVisible()
  })
})
