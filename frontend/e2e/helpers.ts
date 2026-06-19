import { expect, request, type Page } from '@playwright/test'

// Backend-gerektiren E2E testleri için ortak yardımcılar.
export const API = 'http://localhost:5099'

// Giriş/hesap testleri için dummy müşteri
export const DUMMY = {
  name: 'E2E Test',
  email: 'e2e@turkcellbank.com',
  password: 'parola123',
}

// Transfer testleri için ikinci dummy müşteri
export const DUMMY2 = {
  name: 'E2E Alıcı',
  email: 'e2e2@turkcellbank.com',
  password: 'parola456',
}

// Admin testleri için backend'in seed ettiği admin
export const ADMIN = {
  email: 'admin@turkcellbank.com',
  password: 'Admin123!',
}

/**
 * Dummy kullanıcıyı (yoksa) oluşturur. Zaten kayıtlıysa backend 400 döner;
 * bu beklenen bir durumdur (testler tekrar tekrar çalışabilsin diye yok sayılır).
 */
export async function ensureRegistered(user = DUMMY) {
  const ctx = await request.newContext()
  await ctx.post(`${API}/api/auth/register`, {
    data: { fullName: user.name, email: user.email, password: user.password },
  })
  await ctx.dispose()
}

/** UI üzerinden giriş yapar; yönlendirmeyi testin kendisi doğrular. */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('E-posta', { exact: true }).fill(email)
  await page.getByLabel('Şifre', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
}

export async function openAccount(page: Page): Promise<string> {
  const ibans = page.locator('.dashboard-account-iban')
  // Açmadan önceki IBAN'lar (yeni eklenen, farktan bulunur)
  const before = (await ibans.allTextContents()).map((s) => s.trim())

  await page.getByRole('button', { name: '+ Hesap Aç', exact: true }).click()
  await page.getByRole('button', { name: 'Hesap Aç', exact: true }).click()
  await expect(page.getByText('Hesap açıldı.')).toBeVisible()

  // Liste refetch ile yenilenip yeni kart eklenene kadar bekle (yarış koşulunu önler)
  await expect(ibans).toHaveCount(before.length + 1)

  const after = (await ibans.allTextContents()).map((s) => s.trim())
  const createdIban = after.find((i) => !before.includes(i))
  if (!createdIban) {
    throw new Error('Hesap açıldı ama yeni IBAN ekranda bulunamadı!')
  }
  return createdIban
}

/** Hesaba para yatırır (UI üzerinden). */
export async function depositToAccount(page: Page, accountId: string, amount: string) {
  // İlk aktif hesap kartındaki "Para Yatır" butonuna tıkla
  await page.getByRole('button', { name: 'Para Yatır' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Tutar (₺)').fill(amount)
  await dialog.getByRole('button', { name: 'Yatır', exact: true }).click()
  await expect(page.getByText('Para yatırıldı.')).toBeVisible()
}

/** Kredi başvurusu yapar (UI üzerinden). */
export async function applyForLoan(
  page: Page,
  opts: { income: string; profession: string; amount: string; term?: string },
) {
  await page.getByRole('button', { name: '+ Kredi Başvur' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Aylık Gelir (₺)').fill(opts.income)
  await dialog.getByLabel('Meslek').fill(opts.profession)
  await dialog.getByLabel('Kredi Tutarı (₺)').fill(opts.amount)
  if (opts.term) {
    await dialog.getByLabel('Vade (ay)').fill(opts.term)
  }
  await dialog.getByRole('button', { name: 'Başvur', exact: true }).click()
  await expect(page.getByText('Kredi başvurunuz alındı.')).toBeVisible()
}

/** Kart başvurusu yapar (UI üzerinden). */
export async function applyForCard(page: Page) {
  await page.getByRole('button', { name: '+ Kart Aç' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Kart Aç', exact: true }).click()
  await expect(page.getByText('Kart başvurunuz alındı.')).toBeVisible()
}

/** Admin olarak giriş yapıp /admin'e yönlendiğini doğrular. */
export async function loginAsAdmin(page: Page) {
  await loginViaUi(page, ADMIN.email, ADMIN.password)
  await page.waitForURL(/\/admin$/)
}

