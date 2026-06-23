import { test, expect, type Page } from '@playwright/test'
import {
  DUMMY,
  STAFF,
  STAFF_PASSWORD,
  ensureRegistered,
  loginViaUi,
  applyForLoan,
  openTab,
} from './helpers'

// Tutar bazlı kredi onay workflow'u (Sprint 2). Backend gerektirir (5099).
// 30M → şube müdürü bandı; AI tavsiyesini yetkili ezerek onaylar; müşteri sonucu görür.
// Not: başvurular benzersiz "meslek" etiketiyle yapılır ki testler birbirinden ve
// önceki çalıştırmalardan bağımsız olarak doğru satırı bulabilsin.
test.describe('Kredi onay workflow', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear()).catch(() => {})
  })

  // Büyük tutarlı, benzersiz meslekli başvuru (yüksek gelir + onaya gönderildi)
  async function applyPending(page: Page, amount: string, profession: string) {
    await applyForLoan(page, {
      income: '500000',
      expenses: '100000',
      amount,
      profession,
      term: '36',
      age: '40',
      marital: 'Married',
      children: '2',
      housing: 'Owner',
      employment: '120',
      expectHeading: /Başvurunuz Onaya Gönderildi/,
    })
  }

  test('30M kredi onaya düşer, şube müdürü onaylar, müşteri sonucu+notu görür', async ({ page }) => {
    const tag = `E2EOnay${Date.now()}` // bu başvuruyu benzersiz kılan meslek etiketi
    const note = `E2E onay notu ${Date.now()}`

    // 1) Müşteri 30M başvurusu → onaya gönderildi, "Onay bekliyor"
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
    await applyPending(page, '30000000', tag)
    await openTab(page, 'Krediler')
    await expect(page.getByText('Onay bekliyor').first()).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 2) Şube müdürü kuyrukta bu başvuruyu (meslek etiketiyle) bulur ve onaylar
    await loginViaUi(page, STAFF.branchManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/sube-muduru$/)

    const card = page.locator('.approval-card', { hasText: tag }).first()
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Onayla' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('textarea').fill(note)
    await dialog.getByRole('button', { name: 'Onayla' }).click()
    await expect(page.getByText('Başvuru onaylandı.')).toBeVisible()
    await page.evaluate(() => localStorage.clear())

    // 3) Müşteri "Kredilerim"de o başvuruyu Onaylandı + yetkili notuyla görür
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await openTab(page, 'Krediler')
    const row = page.locator('.dashboard-loan-row', { hasText: tag }).first()
    await expect(row.getByText('Onaylandı')).toBeVisible()
    await row.getByRole('button', { name: 'Gerekçe' }).click()
    await expect(page.getByText(note)).toBeVisible()
  })

  test('il müdürü, şube bandındaki krediyi sadece görüntüler (onaylayamaz)', async ({ page }) => {
    // Şube bandında (30M) bekleyen bir başvuru oluştur
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await applyPending(page, '30000000', `E2EGoruntu${Date.now()}`)
    await page.evaluate(() => localStorage.clear())

    // İl müdürü kuyruğu görür ama şube bandını onaylayamaz
    await loginViaUi(page, STAFF.provincialManager.email, STAFF_PASSWORD)
    await expect(page).toHaveURL(/\/il-muduru$/)
    await expect(
      page.getByText(/Şube Müdürü yetkisindedir — görüntüleme/).first(),
    ).toBeVisible()
  })
})
