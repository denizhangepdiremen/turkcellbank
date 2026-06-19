import { request, type Page } from '@playwright/test'

// Backend-gerektiren E2E testleri için ortak yardımcılar.
export const API = 'http://localhost:5099'

// Giriş/hesap testleri için dummy müşteri
export const DUMMY = {
  name: 'E2E Test',
  email: 'e2e@turkcellbank.com',
  password: 'parola123',
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
