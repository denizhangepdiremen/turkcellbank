import { test, expect } from '@playwright/test'
import {
  STAFF,
  STAFF_PASSWORD,
  loginViaUi,
  openTab,
  openCreditCardApprovalQueue,
  openAccount,
  depositToAccount,
  registerFreshUser,
  applyForCreditCard,
  requestCreditCardLimitIncrease,
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
    await openTab(page, 'Kartlarım')
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
    await openTab(page, 'Kartlarım')
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
    await openTab(page, 'Kartlarım')
    await expect(page.getByText('Onay Bekliyor').first()).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 2) Şube müdürü "Kredi Kartı Onayları" kuyruğunda bu başvuruyu bulur ve onaylar
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)
    await openCreditCardApprovalQueue(page)

    const card = page.locator('.approval-card', { hasText: user.email }).first()
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Onayla' }).click()
    await expect(page.getByText('Kredi kartı onaylandı.')).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 3) Müşteri Kredi Kartı sekmesinde kartı "Aktif" görür
    await loginViaUi(page, user.email, user.password)
    await openTab(page, 'Kartlarım')
    await expect(page.getByText('Aktif').first()).toBeVisible()
  })

  test('nakit avans TL hesaba aktarılır ve kredi kartı borcuna yansır', async ({ page }) => {
    const user = await registerFreshUser('e2e-cc-nakit')
    await loginViaUi(page, user.email, user.password)
    await expect(page).toHaveURL(/\/dashboard$/)

    await applyForCreditCard(page, { income: '20000', expenses: '8000' })

    await openTab(page, 'Hesaplarım')
    await openAccount(page)

    await openTab(page, 'Kartlarım')
    await page.getByRole('button', { name: 'Nakit Avans' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Tutar (₺)').fill('2000')
    await dialog.getByRole('button', { name: 'Kullan', exact: true }).click()
    await expect(page.getByText('Nakit avans hesabınıza aktarıldı.')).toBeVisible()

    // Borç = anapara 2.000 + %3 komisyon (60) + 1 günlük akdi faiz (2,33) = 2.062,33
    await expect(page.locator('.cc-limit-meta').getByText(/Güncel Borç:/)).toContainText('2.062')
    // Kart hareketlerinde nakit avans (anapara) ve komisyon kalemleri görünür
    await expect(
      page.locator('.dashboard-loan-amount').filter({ hasText: 'Nakit Avans' }),
    ).toBeVisible()
    await expect(page.getByText('Nakit avans komisyonu')).toBeVisible()

    // Hesaba yalnızca anapara (2.000) geçer; komisyon/faiz karta borç yazılır
    await openTab(page, 'Hesaplarım')
    await expect(page.getByText(/₺2\.000,00/).first()).toBeVisible()
  })

  test('limit artış talebi otomatik onaylanınca yeni limit kartta görünür', async ({ page }) => {
    const user = await registerFreshUser('e2e-cc-limit-auto')
    await loginViaUi(page, user.email, user.password)
    await expect(page).toHaveURL(/\/dashboard$/)

    await applyForCreditCard(page, { income: '20000', expenses: '8000' })

    await requestCreditCardLimitIncrease(page, {
      requestedLimit: '80000',
      income: '40000',
      expenses: '12000',
    })
    await expect(page.getByText('Limit artış talebiniz sonuçlandı.')).toBeVisible()

    await expect(page.locator('.cc-limit-meta').getByText(/Toplam Limit:/)).toContainText('80.000')
    await expect(page.getByText('Limit Artış Talepleri')).toBeVisible()
    await expect(page.getByText(/₺60\.000,00 → ₺80\.000,00/)).toBeVisible()
    await expect(page.getByText('Onaylandı').first()).toBeVisible()
  })

  test('yüksek limit artış talebi müdür onayına düşer ve onaylanınca limit güncellenir', async ({ page }) => {
    const user = await registerFreshUser('e2e-cc-limit-onay')

    await loginViaUi(page, user.email, user.password)
    await expect(page).toHaveURL(/\/dashboard$/)
    await applyForCreditCard(page, { income: '20000', expenses: '8000' })

    await requestCreditCardLimitIncrease(page, {
      requestedLimit: '150000',
      income: '100000',
      expenses: '20000',
      profession: 'Doktor',
      housing: 'Owner',
      marital: 'Married',
      children: '1',
      employment: '96',
    })
    await expect(page.getByText('Talebiniz onaya gönderildi.')).toBeVisible()
    await expect(page.getByText('Onay Bekliyor').first()).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)
    await openCreditCardApprovalQueue(page)

    const approval = page
      .locator('.approval-card', { hasText: user.email })
      .filter({ hasText: 'Limit artış talebi' })
      .first()
    await expect(approval).toBeVisible()
    await expect(approval).toContainText('Mevcut')
    await expect(approval).toContainText('Öneri')
    await approval.getByRole('button', { name: 'Onayla' }).click()
    await expect(page.getByText('Limit artış talebi onaylandı.')).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    await loginViaUi(page, user.email, user.password)
    await openTab(page, 'Kartlarım')
    await expect(page.locator('.cc-limit-meta').getByText(/Toplam Limit:/)).toContainText('150.000')
  })
})
