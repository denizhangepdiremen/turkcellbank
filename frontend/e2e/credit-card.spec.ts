import { test, expect } from '@playwright/test'
import {
  STAFF,
  STAFF_PASSWORD,
  loginViaUi,
  openTab,
  openStaffTab,
  openAccount,
  depositToAccount,
  registerFreshUser,
  applyForCreditCard,
} from './helpers'

// Kredi kartı akışı — backend gerektirir (5099).
// "Kullanıcı başına tek aktif kart" kuralı nedeniyle her test kendi taze
// (benzersiz) müşterisiyle çalışır; böylece koşular birbirinden bağımsızdır.
test.describe('Kredi kartı', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear()).catch(() => {})
  })

  test('düşük limitli başvuru otomatik onaylanır ve kart aktif görünür', async ({ page }) => {
    const user = await registerFreshUser('e2e-cc-oto')
    await loginViaUi(page, user.email, user.password)
    await expect(page).toHaveURL(/\/dashboard$/)

    // Gelir × 3 = 60.000 ≤ 100.000 → otomatik onay bandı
    await applyForCreditCard(page, { income: '20000', expenses: '8000' })

    // Kart aktif; limit özeti görünür
    await openTab(page, 'Kredi Kartı')
    await expect(page.getByText('Aktif').first()).toBeVisible()
    await expect(page.getByText('Kullanılabilir Limit')).toBeVisible()
    await expect(page.getByText(/Toplam Limit:/)).toBeVisible()
  })

  test('POS ile taksitli harcama yapılır ve borç ödenir', async ({ page }) => {
    const user = await registerFreshUser('e2e-cc-pos')
    await loginViaUi(page, user.email, user.password)
    await expect(page).toHaveURL(/\/dashboard$/)

    // 1) Kart başvurusu (otomatik onay)
    await applyForCreditCard(page, { income: '20000', expenses: '8000' })

    // 2) Borç ödemesi için TL hesap aç + para yatır
    await openTab(page, 'Hesaplarım')
    const iban = await openAccount(page)
    await depositToAccount(page, iban, '5000')

    // 3) Sanal POS'tan kredi kartıyla 3.000 ₺ / 3 taksit harcama
    await openTab(page, 'Ödemeler')
    await page.getByRole('button', { name: '+ Ödeme Yap' }).click()
    const payDialog = page.getByRole('dialog')
    // Onaylı banka kartı olmadığından ödeme aracı doğrudan kredi kartı olur:
    // "Taksit" alanının görünmesi kredi kartı modunu doğrular.
    await expect(payDialog.getByLabel('Taksit')).toBeVisible()
    await payDialog.getByLabel('Taksit').selectOption('3')
    await payDialog.getByLabel('Tutar (₺)').fill('3000')
    // Taksit önizlemesi
    await expect(payDialog.getByText(/3 taksit ×/)).toBeVisible()
    await payDialog.getByRole('button', { name: 'Devam Et' }).click()
    await payDialog.getByLabel('Doğrulama Kodu').fill('123456')
    await payDialog.getByRole('button', { name: 'Öde', exact: true }).click()
    await expect(page.getByText('Ödeme başarılı.')).toBeVisible()

    // 4) Kredi Kartı sekmesinde güncel borç 3.000 ₺ görünür
    await openTab(page, 'Kredi Kartı')
    await expect(page.locator('.cc-limit-meta').getByText(/3\.000,00/)).toBeVisible()

    // 5) Borç Öde → tüm borç TL hesaptan ödenir → borç 0
    await page.getByRole('button', { name: 'Borç Öde' }).first().click()
    const ccPayDialog = page.getByRole('dialog')
    await ccPayDialog.getByRole('button', { name: 'Öde', exact: true }).click()
    await expect(page.getByText('Ödemeniz alındı.')).toBeVisible()

    await expect(page.locator('.cc-limit-meta').getByText(/Güncel Borç:\s*₺0,00/)).toBeVisible()
  })

  test('yüksek limitli başvuru müdür onayına düşer ve onaylanınca aktif olur', async ({ page }) => {
    const user = await registerFreshUser('e2e-cc-onay')

    // 1) Müşteri yüksek gelirle başvurur → 200.000 (>100.000) → onay bekliyor
    await loginViaUi(page, user.email, user.password)
    await expect(page).toHaveURL(/\/dashboard$/)
    await applyForCreditCard(page, {
      income: '300000',
      expenses: '100000',
      profession: 'Doktor',
      housing: 'Owner',
      marital: 'Married',
      children: '2',
      employment: '120',
      expectHeading: /Başvurunuz Onaya Gönderildi/,
    })
    await openTab(page, 'Kredi Kartı')
    await expect(page.getByText('Onay Bekliyor').first()).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 2) Şube müdürü "Kredi Kartı Onayları" kuyruğunda bu başvuruyu bulur ve onaylar
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)
    await openStaffTab(page, 'Kredi Kartı Onayları')

    const card = page.locator('.approval-card', { hasText: user.email }).first()
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Onayla' }).click()
    await expect(page.getByText('Kredi kartı onaylandı.')).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 3) Müşteri Kredi Kartı sekmesinde kartı "Aktif" görür
    await loginViaUi(page, user.email, user.password)
    await openTab(page, 'Kredi Kartı')
    await expect(page.getByText('Aktif').first()).toBeVisible()
  })
})
