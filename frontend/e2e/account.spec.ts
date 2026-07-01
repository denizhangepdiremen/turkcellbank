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
    // Üst grup menüsü görünür; alt sekmeler seçili gruba göre değişir.
    for (const group of ['Günlük Bankacılık', 'Fatura & Talimat', 'Kredi, Kart, Yatırım', 'Güvenlik']) {
      await expect(page.locator('.dashboard-tab-group').filter({ hasText: group })).toBeVisible()
    }
    for (const tab of ['Hesaplarım', 'İşlemler', 'Ödemeler']) {
      await expect(page.locator('.dashboard-tab').filter({ hasText: tab })).toBeVisible()
    }

    // Varsayılan sekme: Hesaplarım bölümü görünür
    await expect(page.getByRole('heading', { name: 'Hesaplarım' })).toBeVisible()
    await expect(page.getByRole('img', { name: /Son 7 gün bakiye eğilimi/ })).toBeVisible()
    await expect(page.getByLabel('Gelir gider özeti')).not.toBeVisible()

    // Sekmelere tıklayınca ilgili bölüm açılır
    await openTab(page, 'İşlemler')
    await expect(page.getByRole('heading', { name: 'Son İşlemler' })).toBeVisible()
    await expect(page.getByRole('img', { name: /Son 7 gün bakiye eğilimi/ })).not.toBeVisible()
    await expect(page.getByLabel('Gelir gider özeti')).toBeVisible()

    await openTab(page, 'Krediler')
    await expect(page.getByRole('heading', { name: 'Kredilerim' })).toBeVisible()

    await openTab(page, 'Kartlarım')
    await expect(page.getByRole('heading', { name: 'Banka Kartlarım' })).toBeVisible()

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

  test('bakiyesi olan hesap, bakiye başka hesaba aktarılarak kapatılır', async ({ page }) => {
    await openAccount(page) // bakiyenin aktarılacağı hedef olsun
    const kapananIban = await openAccount(page)
    const card = page.locator('.rounded-xl.border.border-gray-200.bg-white.shadow-sm').filter({ hasText: kapananIban })

    // Kapatılacak hesaba para yatır
    await card.getByRole('button', { name: 'Para Yatır' }).click()
    await page.getByRole('dialog').getByLabel('Tutar (₺)').fill('1000')
    await page.getByRole('dialog').getByRole('button', { name: 'Yatır' }).click()
    await expect(page.getByText('Para yatırıldı.')).toBeVisible()

    // Kapat → modalda hedef hesap seçili gelir → onayla (hata olmamalı)
    await card.getByRole('button', { name: 'Hesabı Kapat' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hesabı Kapat' }).click()
    await expect(page.getByText('Hesap kapatıldı.')).toBeVisible()
    await expect(card).toHaveCount(0)
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
