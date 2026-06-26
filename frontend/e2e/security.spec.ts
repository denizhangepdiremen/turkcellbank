import { test, expect, request, type Page } from '@playwright/test'
import {
  API,
  STAFF,
  STAFF_PASSWORD,
  loginViaUi,
  openAccount,
  openTab,
  openStaffTab,
  applyForCard,
} from './helpers'

// Güvenlik Merkezi aksiyonları (backend gerektirir 5099).
// Her test benzersiz kullanıcı kullanır ki tekrarlı çalışmalarda çakışma olmasın.

// Yeni bir müşteri kaydeder (API ile) ve giriş yapar.
async function registerAndLogin(page: Page, email: string, password: string) {
  const ctx = await request.newContext()
  await ctx.post(`${API}/api/auth/register`, {
    data: { fullName: 'Güvenlik Test', email, password },
  })
  await ctx.dispose()
  await loginViaUi(page, email, password)
  await expect(page).toHaveURL(/\/dashboard$/)
}

test.describe('Güvenlik Merkezi', () => {
  test('şifre değiştirilir ve yeni şifreyle giriş yapılır', async ({ page }) => {
    const email = `sec-pw-${Date.now()}@turkcellbank.com`
    const oldPw = 'parola123'
    const newPw = 'yeniparola456'
    await registerAndLogin(page, email, oldPw)

    // Güvenlik sekmesi → Şifre değiştir
    await page.getByRole('button', { name: 'Güvenlik', exact: true }).click()
    await page.getByRole('button', { name: /Şifre değiştir/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Mevcut şifre').fill(oldPw)
    await dialog.getByLabel('Yeni şifre', { exact: true }).fill(newPw)
    await dialog.getByLabel('Yeni şifre (tekrar)').fill(newPw)
    await dialog.getByRole('button', { name: 'Güncelle' }).click()
    await expect(page.getByText('Şifreniz güncellendi.')).toBeVisible()

    // Çıkış yap, yeni şifreyle giriş yapılabilmeli
    await page.getByRole('button', { name: 'Çıkış' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await loginViaUi(page, email, newPw)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('günlük havale limiti aşılan transferi engeller', async ({ page }) => {
    const email = `sec-limit-${Date.now()}@turkcellbank.com`
    await registerAndLogin(page, email, 'parola123')

    // İki hesap aç (biri gönderen, biri alıcı)
    await openAccount(page)
    const receiverIban = await openAccount(page)

    // Güvenlik → Günlük havale limiti = 100 ₺
    await page.getByRole('button', { name: 'Güvenlik', exact: true }).click()
    await page.getByRole('button', { name: /Günlük havale limiti/ }).click()
    const limitDialog = page.getByRole('dialog')
    await limitDialog.getByLabel('Günlük limit (₺)').fill('100')
    await limitDialog.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByText('Havale limiti güncellendi.')).toBeVisible()

    // Hesaplarım'a dön, limiti aşan transfer dene → engellenmeli
    await openTab(page, 'Hesaplarım')
    await page.getByRole('button', { name: 'Gönder' }).first().click()
    const transferDialog = page.getByRole('dialog')
    await transferDialog.getByLabel('Alıcı IBAN').fill(receiverIban)
    await transferDialog.getByLabel('Tutar (₺)').fill('500')
    await transferDialog.getByRole('button', { name: 'Gönder', exact: true }).click()

    await expect(page.getByText(/Günlük havale limitiniz/)).toBeVisible()
  })

  test('onaylı kartın internet alışverişi kapatılır', async ({ page }) => {
    const email = `sec-card-${Date.now()}@turkcellbank.com`
    await registerAndLogin(page, email, 'parola123')

    // Hesap aç + kart başvurusu
    await openAccount(page)
    await applyForCard(page)
    await page.evaluate(() => localStorage.clear())

    // Şube müdürü kartı onaylar
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)
    await openStaffTab(page, 'Kart Onayları')
    const queueCard = page.locator('.approval-card', { hasText: email }).first()
    await expect(queueCard).toBeVisible()
    await queueCard.getByRole('button', { name: 'Onayla' }).click()
    await expect(page.getByText('Kart onaylandı.')).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // Müşteri: Güvenlik → Kart internet alışverişi → Kapat
    await loginViaUi(page, email, 'parola123')
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.getByRole('button', { name: 'Güvenlik', exact: true }).click()
    await page.getByRole('button', { name: /Kart internet alışverişi/ }).click()
    const row = page.locator('.dashboard-cardshop-row').first()
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Kapat', exact: true }).click()
    await expect(page.getByText('İnternet alışverişi kapatıldı.')).toBeVisible()
    // Aynı satırdaki buton artık "Aç" olmalı
    await expect(row.getByRole('button', { name: 'Aç', exact: true })).toBeVisible()
  })
})
