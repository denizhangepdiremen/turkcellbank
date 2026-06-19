import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi, openAccount } from './helpers'

// Para yatırma akışı — backend gerektirir.
test.describe('Para yatırma', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('hesaba para yatırılır ve bakiye güncellenir', async ({ page }) => {
    // Önce yeni bir hesap aç
    await openAccount(page)

    // Para Yatır butonuna tıkla
    await page.getByRole('button', { name: 'Para Yatır' }).first().click()

    // Modal içindeki alanları doldur
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Tutar (₺)').fill('500')
    await dialog.getByRole('button', { name: 'Yatır', exact: true }).click()

    // Başarılı toast mesajı
    await expect(page.getByText('Para yatırıldı.')).toBeVisible()

    // Bakiye artık 500 TL olmalı (yeni hesap 0'dan başlıyor)
    await expect(page.getByText('₺500,00').first()).toBeVisible()
  })

  test('para yatırma modalı iptal edilebilir', async ({ page }) => {
    await page.getByRole('button', { name: 'Para Yatır' }).first().click()
    await expect(page.getByLabel('Tutar (₺)')).toBeVisible()

    // İptal butonuna tıkla
    await page.getByRole('button', { name: 'İptal' }).click()

    // Modal kapandı mı?
    await expect(page.getByLabel('Tutar (₺)')).not.toBeVisible()
  })
})
