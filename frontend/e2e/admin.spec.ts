import { test, expect } from '@playwright/test'
import {
  DUMMY,
  ADMIN,
  ensureRegistered,
  loginViaUi,
  loginAsAdmin,
  applyForLoan,
} from './helpers'

// Admin paneli akışları — backend gerektirir.
// NOT: Krediler artık otomatik karara bağlanır; admin onay/red YETKİSİ YOKTUR.
// Kredi tablosu salt-okunurdur (AI kararı + limit gösterir). Kartlar admin onaylı.

test.describe('Admin: Kredi görünümü (salt-okunur)', () => {
  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
  })

  test('kredi tablosu salt-okunurdur (Onayla/Reddet yok)', async ({ browser }) => {
    // 1. Kullanıcı kredi başvurusu yapar (otomatik karara bağlanır)
    const userCtx = await browser.newContext()
    const userPage = await userCtx.newPage()
    await loginViaUi(userPage, DUMMY.email, DUMMY.password)
    await expect(userPage).toHaveURL(/\/dashboard$/)
    await applyForLoan(userPage, {
      income: '50000',
      profession: 'Yazılımcı',
      amount: '75000',
      term: '12',
    })
    await userPage.close()
    await userCtx.close()

    // 2. Admin panelinde kredi tablosu görünür ama onay/red butonu yoktur
    const adminCtx = await browser.newContext()
    const adminPage = await adminCtx.newPage()
    await loginAsAdmin(adminPage)

    // Kredi tablosu (Skor sütunu yalnızca kredilerde)
    const loanTable = adminPage.locator('table.admin-table', {
      has: adminPage.getByRole('columnheader', { name: 'Skor' }),
    })
    await expect(loanTable).toBeVisible()
    // Otomatik karar olduğundan kredi tablosunda Onayla/Reddet bulunmaz
    await expect(loanTable.getByRole('button', { name: 'Onayla' })).toHaveCount(0)
    await expect(loanTable.getByRole('button', { name: 'Reddet' })).toHaveCount(0)

    await adminPage.close()
    await adminCtx.close()
  })
})

test.describe('Admin: Kart görünümü (salt-okunur)', () => {
  test('kart tablosu salt-okunurdur (Onayla/Reddet yok)', async ({ page }) => {
    // Kart onay/red yetkisi artık şube müdüründedir (bkz. sprint4.spec.ts).
    await loginAsAdmin(page)

    const cardTable = page.locator('table.admin-table', {
      has: page.getByRole('columnheader', { name: 'Sahip' }),
    })
    await expect(cardTable).toBeVisible()
    await expect(cardTable.getByRole('button', { name: 'Onayla' })).toHaveCount(0)
    await expect(cardTable.getByRole('button', { name: 'Reddet' })).toHaveCount(0)
  })
})

test.describe('Admin: Kullanıcı listesi', () => {
  test('admin panelinde kullanıcılar listelenir', async ({ page }) => {
    await loginAsAdmin(page)

    // Kullanıcılar tablosu görünür olmalı
    await expect(page.getByRole('heading', { name: 'Kullanıcılar' })).toBeVisible()

    // En azından admin kullanıcısı tabloda var
    await expect(page.getByText(ADMIN.email)).toBeVisible()
  })

  test('normal kullanıcı admin paneline erişemez', async ({ page }) => {
    await ensureRegistered(DUMMY)
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)

    // Manuel URL ile admin'e gitmeye çalış
    await page.goto('/admin')

    // Admin paneli görünmemeli, dashboard'a veya login'e yönlendirilmeli
    await expect(page.getByRole('heading', { name: 'Kullanıcılar' })).not.toBeVisible()
  })
})
