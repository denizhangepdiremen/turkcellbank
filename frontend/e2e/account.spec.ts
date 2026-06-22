import { test, expect } from '@playwright/test'
import { DUMMY, ensureRegistered, loginViaUi, openTab } from './helpers'
import { openAccount } from './helpers'

// Backend gerektirir. Her testten önce dummy kullanıcıyla giriş yapılır.
test.describe('Genel hesap işlemleri', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('panel sekmeleri görünür ve bölümler sekmeyle açılır', async ({ page }) => {
    // Sekme butonları (üst menü)
    for (const tab of ['Hesaplarım', 'İşlemler', 'Krediler', 'Kartlar', 'Ödemeler']) {
      await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible()
    }

    // Varsayılan sekme: Hesaplarım bölümü görünür
    await expect(page.getByRole('heading', { name: 'Hesaplarım' })).toBeVisible()

    // Sekmelere tıklayınca ilgili bölüm açılır
    await openTab(page, 'İşlemler')
    await expect(page.getByRole('heading', { name: 'Son İşlemler' })).toBeVisible()

    await openTab(page, 'Krediler')
    await expect(page.getByRole('heading', { name: 'Kredilerim' })).toBeVisible()

    await openTab(page, 'Kartlar')
    await expect(page.getByRole('heading', { name: 'Kartlarım' })).toBeVisible()

    await openTab(page, 'Ödemeler')
    await expect(page.getByRole('heading', { name: 'Ödemelerim' })).toBeVisible()
  })

  test('çıkış tuşuna basılınca login page dönülür', async ({ page }) => {
    await page.getByRole('button', { name: 'Çıkış' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('yeni hesap açılır (Bireysel)', async ({ page }) => {
    await page.getByRole('button', { name: '+ Hesap Aç', exact: true }).click()
    // Modal'daki onay butonu (varsayılan tip: Bireysel)
    await page.getByRole('button', { name: 'Hesap Aç', exact: true }).click()
    await expect(page.getByText('Hesap açıldı.')).toBeVisible()
  })

})

test.describe('Hesap kapatma işlemleri', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('hesap kapatılır', async ({ page }) => {
    const yeniIban = await openAccount(page);
    const card = page.locator('.rounded-xl.border.border-gray-200.bg-white.shadow-sm').filter({ hasText: yeniIban });

    // Kart üzerindeki "Hesabı Kapat" butonuna tıkla → ConfirmDialog açılır
    await card.getByRole('button', { name: 'Hesabı Kapat' }).click();

    // ConfirmDialog'daki onay butonuna tıkla
    await page.getByRole('dialog').getByRole('button', { name: 'Hesabı Kapat' }).click();

    // Backend başarılı toast mesajını bekle
    await expect(page.getByText('Hesap kapatıldı.')).toBeVisible();

    // Hesap artık "Kapalı" olarak işaretlenmeli
    await expect(card.getByText('Kapalı')).toBeVisible();
  })

})
