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

  test('hesap kapatılır (bakiyesiz hesap listeden kalkar)', async ({ page }) => {
    const yeniIban = await openAccount(page);
    const card = page.locator('.rounded-xl.border.border-gray-200.bg-white.shadow-sm').filter({ hasText: yeniIban });

    // Kart üzerindeki "Hesabı Kapat" butonuna tıkla → kapatma modalı açılır
    await card.getByRole('button', { name: 'Hesabı Kapat' }).click();

    // Modaldaki onay butonuna tıkla (yeni hesap bakiyesiz → hedef hesap gerekmez)
    await page.getByRole('dialog').getByRole('button', { name: 'Hesabı Kapat' }).click();

    // Backend başarılı toast mesajını bekle
    await expect(page.getByText('Hesap kapatıldı.')).toBeVisible();

    // Kapatılan hesap artık listede görünmez
    await expect(card).toHaveCount(0);
  })

  test('hesap dondurulur ve yeniden aktifleştirilir', async ({ page }) => {
    const yeniIban = await openAccount(page);
    const card = page.locator('.rounded-xl.border.border-gray-200.bg-white.shadow-sm').filter({ hasText: yeniIban });

    // Dondur → onay modalı → Hesabı Dondur
    await card.getByRole('button', { name: 'Dondur', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hesabı Dondur' }).click();
    await expect(page.getByText('Hesap donduruldu.')).toBeVisible();
    await expect(card.getByText('Dondurulmuş')).toBeVisible();

    // Dondurulmuş hesapta Para Yatır yok, Aktifleştir var
    await expect(card.getByRole('button', { name: 'Para Yatır' })).toHaveCount(0);
    await card.getByRole('button', { name: 'Aktifleştir' }).click();
    await expect(page.getByText('Hesap yeniden aktifleştirildi.')).toBeVisible();
    await expect(card.getByText('Dondurulmuş')).toHaveCount(0);
  })

})
