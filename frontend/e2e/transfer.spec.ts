import { test, expect } from '@playwright/test'
import {
  DUMMY,
  DUMMY2,
  ensureRegistered,
  loginViaUi,
  openAccount,
  API,
} from './helpers'
import { request } from '@playwright/test'

// Banka içi transfer akışı — backend gerektirir.
test.describe('Para transferi', () => {
  let receiverIban: string

  test.beforeAll(async () => {
    await ensureRegistered(DUMMY)
    await ensureRegistered(DUMMY2)

    // DUMMY2 için API üzerinden bir hesap oluştur ve IBAN'ını al
    const ctx = await request.newContext()
    const loginRes = await ctx.post(`${API}/api/auth/login`, {
      data: { email: DUMMY2.email, password: DUMMY2.password },
    })
    const loginBody = await loginRes.json()
    const token = loginBody.data?.token

    // Yeni hesap aç
    const accRes = await ctx.post(`${API}/api/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { accountType: 'Bireysel' },
    })
    const accBody = await accRes.json()

    // Eğer zaten hesap varsa, mevcut hesapları getir
    if (accBody.data?.iban) {
      receiverIban = accBody.data.iban
    } else {
      const listRes = await ctx.get(`${API}/api/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const listBody = await listRes.json()
      receiverIban = listBody.data?.[0]?.iban ?? ''
    }

    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, DUMMY.email, DUMMY.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('başarılı transfer yapılır', async ({ page }) => {
    // Yeni hesap aç ve para yatır
    await openAccount(page)
    await page.getByRole('button', { name: 'Para Yatır' }).first().click()

    const depositDialog = page.getByRole('dialog')
    await depositDialog.getByLabel('Tutar (₺)').fill('1000')
    await depositDialog.getByRole('button', { name: 'Yatır', exact: true }).click()
    await expect(page.getByText('Para yatırıldı.')).toBeVisible()

    // Gönder butonuna tıkla
    await page.getByRole('button', { name: 'Gönder' }).first().click()

    // Transfer modalı içinde doldur
    const transferDialog = page.getByRole('dialog')
    await transferDialog.getByLabel('Alıcı IBAN').fill(receiverIban)
    await transferDialog.getByLabel('Tutar (₺)').fill('100')
    await transferDialog.getByLabel('Açıklama (opsiyonel)').fill('E2E Test')
    await transferDialog.getByRole('button', { name: 'Gönder', exact: true }).click()

    // Başarılı toast mesajı
    await expect(page.getByText('Transfer başarılı.')).toBeVisible()
  })

  test('transfer modalı iptal edilebilir', async ({ page }) => {
    await page.getByRole('button', { name: 'Gönder' }).first().click()
    await expect(page.getByLabel('Alıcı IBAN')).toBeVisible()

    await page.getByRole('button', { name: 'İptal' }).click()
    await expect(page.getByLabel('Alıcı IBAN')).not.toBeVisible()
  })
})
