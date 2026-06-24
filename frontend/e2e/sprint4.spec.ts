import { test, expect } from '@playwright/test'
import {
  STAFF,
  STAFF_PASSWORD,
  ensureRegistered,
  loginViaUi,
  openAccount,
  applyForCard,
  openStaffTab,
} from './helpers'

// Sprint 4: yüksek havale onayı, kart onayının şube müdürüne taşınması,
// organizasyon görünümü. Backend gerektirir (5099).

test.describe('Sprint 4 — yönetici onayları ve görünürlük', () => {
  test('şube çalışanının başlattığı >1M havale şube müdürü onayıyla gerçekleşir', async ({ page }) => {
    const customer = {
      name: 'Havale Musteri',
      email: `havale${Date.now()}@turkcellbank.com`,
      password: 'parola123',
    }
    await ensureRegistered(customer)

    // 1) Şube çalışanı: müşteri için 2 hesap aç, birine 2M yatır, 1.5M havale et
    await loginViaUi(page, STAFF.branchEmployee.email, STAFF_PASSWORD)
    await page.getByLabel(/Müşteri \(TC/).fill(customer.email)
    await page.getByRole('button', { name: 'Ara' }).click()
    await expect(page.getByText(customer.name)).toBeVisible()

    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Hesap Aç' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Aç' }).click()
      await expect(page.getByText('Hesap açıldı.')).toBeVisible()
      // Müşteri kartı yenilenip yeni hesabı gösterene kadar bekle
      await expect(page.locator('.branch-account-iban')).toHaveCount(i + 1)
    }
    const ibans = await page.locator('.branch-account-iban').allTextContents()

    // İlk hesaba 2M yatır (modallarda ilk hesap varsayılan seçili)
    await page.getByRole('button', { name: 'Para Yatır' }).click()
    await page.getByRole('dialog').getByLabel('Tutar (₺)').fill('2000000')
    await page.getByRole('dialog').getByRole('button', { name: 'Yatır' }).click()
    await expect(page.getByText('Para yatırıldı.')).toBeVisible()

    // İlk hesaptan ikinci hesaba 1.5M havale (>1M -> onaya gider)
    await page.getByRole('button', { name: 'Havale' }).click()
    const dlg = page.getByRole('dialog')
    await dlg.getByLabel('Alıcı IBAN').fill(ibans[1])
    await dlg.getByLabel('Tutar (₺)').fill('1500000')
    await dlg.getByRole('button', { name: 'Gönder' }).click()
    await expect(page.getByText(/şube müdürü onayına gönderildi/)).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 2) Şube müdürü: havale onay kuyruğunda bu müşteriyi bulur ve onaylar
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)
    await openStaffTab(page, 'Yüksek Havale')
    const card = page.locator('.approval-card', { hasText: customer.name }).first()
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Onayla' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Onayla' }).click()
    await expect(page.getByText('Havale onaylandı ve gerçekleştirildi.')).toBeVisible()
  })

  test('müşteri kart başvurusu şube müdürü tarafından onaylanır', async ({ page }) => {
    const customer = {
      name: 'Kart Musteri',
      email: `kart${Date.now()}@turkcellbank.com`,
      password: 'parola123',
    }
    await ensureRegistered(customer)

    // 1) Müşteri: hesap aç + kart başvurusu
    await loginViaUi(page, customer.email, customer.password)
    await expect(page).toHaveURL(/\/dashboard$/)
    await openAccount(page)
    await applyForCard(page)
    await page.evaluate(() => localStorage.clear())

    // 2) Şube müdürü: kart onay kuyruğunda bu müşteriyi bulur ve onaylar
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)
    await openStaffTab(page, 'Kart Onayları')
    const card = page.locator('.approval-card', { hasText: customer.email }).first()
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Onayla' }).click()
    await expect(page.getByText('Kart onaylandı.')).toBeVisible()
  })

  test('şube müdürü organizasyon görünümünü görür (Şubem + ekip istatistiği)', async ({ page }) => {
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)
    await openStaffTab(page, 'Şubem')
    await expect(page.getByText('Şube çalışanı', { exact: true })).toBeVisible()
  })
})
