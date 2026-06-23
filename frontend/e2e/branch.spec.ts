import { test, expect } from '@playwright/test'
import { STAFF, STAFF_PASSWORD, ensureRegistered, loginViaUi, openTab } from './helpers'

// Şube çalışanı "adına işlem" (Sprint 3). Backend gerektirir (5099).
// Çalışan müşteriyi bulur, adına hesap açıp para yatırır; işlem müşteride
// "Şube" kanalı olarak görünür (kanal + personel damgası).
test.describe('Şube çalışanı adına işlem', () => {
  // Her çalıştırmada temiz (hesabı olmayan) yeni müşteri
  const customer = {
    name: 'Sube Musteri',
    email: `subetest${Date.now()}@turkcellbank.com`,
    password: 'parola123',
  }

  test('çalışan müşteri adına hesap açar, para yatırır; işlem Şube kanalında görünür', async ({ page }) => {
    await ensureRegistered(customer)

    // 1) Çalışan girişi → kendi paneli
    await loginViaUi(page, STAFF.branchEmployee.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube$/)

    // 2) Müşteriyi e-posta ile bul
    await page.getByLabel(/Müşteri \(TC/).fill(customer.email)
    await page.getByRole('button', { name: 'Ara' }).click()
    await expect(page.getByText(customer.name)).toBeVisible()

    // 3) Adına hesap aç
    await page.getByRole('button', { name: 'Hesap Aç' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Aç' }).click()
    await expect(page.getByText('Hesap açıldı.')).toBeVisible()

    // 4) Adına 5.000 ₺ yatır (tek hesap olduğundan otomatik seçilir)
    await page.getByRole('button', { name: 'Para Yatır' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Tutar (₺)').fill('5000')
    await dialog.getByRole('button', { name: 'Yatır' }).click()
    await expect(page.getByText('Para yatırıldı.')).toBeVisible()

    // 5) Müşteri girişinde işlem "Şube" kanalında görünür
    await page.evaluate(() => localStorage.clear())
    await loginViaUi(page, customer.email, customer.password)
    await openTab(page, 'İşlemler')
    await expect(page.getByText('Para Yatırma', { exact: true })).toBeVisible()
    await expect(page.getByText(/· Şube/)).toBeVisible()
  })

  test('çalışan müşteri panosuna giremez, kendi paneline döner', async ({ page }) => {
    await loginViaUi(page, STAFF.branchEmployee.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube$/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/sube$/)
  })
})
