import { test, expect } from '@playwright/test'

// Bu testler yalnızca frontend ile çalışır (backend gerektirmez):
// sayfa render, client-side (Zod) doğrulama ve korumalı route yönlendirmesi.

test.describe('Auth & yönlendirme', () => {
  test('login sayfası açılır ve alanları görünür', async ({ page }) => {
    await page.goto('/login')
    // Marka üst şeritte logo olarak görünür
    await expect(page.getByText('TurkcellBank').first()).toBeVisible()
    await expect(page.getByLabel('E-posta', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Şifre', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Giriş Yap' })).toBeVisible()
  })

  test('login ekranında boş formda client-side doğrulama hataları gösterilir', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Giriş Yap' }).click()
    await expect(page.getByText('E-posta zorunludur.')).toBeVisible()
    await expect(page.getByText('Şifre zorunludur.')).toBeVisible()
  })

  test('register ekranında boş formda client-side doğrulama hatası gösterir', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('button', { name: 'Kayıt Ol' }).click()
    await expect(page.getByText('Ad Soyad en az 3 karakter olmalı.')).toBeVisible()
    await expect(page.getByText('E-posta zorunludur.')).toBeVisible()
    await expect(page.getByText('TC kimlik numarası zorunludur.')).toBeVisible()
    await expect(page.getByText('Şifre en az 6 karakter olmalı.')).toBeVisible()
    await expect(page.getByText('Şifreyi tekrar girin.')).toBeVisible()
    await expect(page.getByText('Devam etmek için koşulları kabul etmelisiniz.')).toBeVisible()
  })

  test('giriş yapmadan /dashboard login ekranına yönlendirir', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('giriş yapmadan /admin login ekranına yönlendirir', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('kayıt ol sekmesine basınca register ekranına gider', async ({ page }) => {
    await page.goto('/login')
    // Üstteki segment toggle ile kayıt sekmesine geç
    await page.getByRole('tab', { name: 'Kayıt Ol' }).click()
    await expect(page).toHaveURL(/\/register$/)
  })

  test('Şifremi unuttum tuşuna basınca forgot-password ekranına gider', async ({ page}) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Şifremi unuttum' }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

})
