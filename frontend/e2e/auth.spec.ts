import { test, expect } from '@playwright/test'

// Bu testler yalnızca frontend ile çalışır (backend gerektirmez):
// sayfa render, client-side (Zod) doğrulama ve korumalı route yönlendirmesi.

test.describe('Auth & yönlendirme', () => {
  test('login sayfası açılır ve alanları görünür', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'TurkcellBank' })).toBeVisible()
    await expect(page.getByLabel('E-posta', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Şifre', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Giriş Yap' })).toBeVisible()
  })

  test('boş formda client-side doğrulama hataları gösterilir', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Giriş Yap' }).click()
    await expect(page.getByText('E-posta zorunludur.')).toBeVisible()
    await expect(page.getByText('Şifre zorunludur.')).toBeVisible()
  })

  test('giriş yapmadan /dashboard login ekranına yönlendirir', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })
})
