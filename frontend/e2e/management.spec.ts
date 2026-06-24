import { test, expect } from '@playwright/test'
import {
  STAFF,
  STAFF_PASSWORD,
  ensureRegistered,
  loginViaUi,
  openAccount,
  openTab,
  openStaffTab,
} from './helpers'

// C: Şube/il müdürü müşteri hesabına banka bloğu koyar/kaldırır. Banka bloğunu
// müşteri kendisi kaldıramaz. Backend gerektirir (5099).
test.describe('Yönetici hesap dondurma (banka bloğu)', () => {
  test('müdür müşteri hesabını dondurur; müşteri kaldıramaz; müdür açar', async ({ page }) => {
    const customer = {
      name: 'Blok Musteri',
      email: `blok${Date.now()}@turkcellbank.com`,
      password: 'parola123',
    }
    await ensureRegistered(customer)

    // 1) Müşteri bir hesap açar
    await loginViaUi(page, customer.email, customer.password)
    await openAccount(page)
    await page.evaluate(() => localStorage.clear())

    // 2) Şube müdürü müşteriyi bulur ve hesabını dondurur
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)
    await openStaffTab(page, 'Müşteri Hesapları')
    await page.getByLabel(/Müşteri \(TC/).fill(customer.email)
    await page.getByRole('button', { name: 'Ara' }).click()

    const accRow = page.locator('.managed-account-row').first()
    await expect(accRow).toBeVisible()
    await accRow.getByRole('button', { name: 'Dondur', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel(/Gerekçe/).fill('E2E şüpheli işlem')
    await dialog.getByRole('button', { name: 'Hesabı Dondur' }).click()
    await expect(page.getByText('Hesap donduruldu.')).toBeVisible()
    await expect(page.locator('.managed-account-row').first().getByText('Dondurulmuş')).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 3) Müşteri banka bloğunu görür ve KALDIRAMAZ (Aktifleştir yok)
    await loginViaUi(page, customer.email, customer.password)
    await openTab(page, 'Hesaplarım')
    await expect(page.getByText(/banka tarafından donduruldu/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aktifleştir' })).toHaveCount(0)
    await page.evaluate(() => localStorage.clear())

    // 4) Müdür bloğu kaldırır
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await openStaffTab(page, 'Müşteri Hesapları')
    await page.getByLabel(/Müşteri \(TC/).fill(customer.email)
    await page.getByRole('button', { name: 'Ara' }).click()
    await page.locator('.managed-account-row').first()
      .getByRole('button', { name: 'Bloğu Kaldır' }).click()
    await expect(page.getByText('Hesap yeniden aktifleştirildi.')).toBeVisible()
  })
})
