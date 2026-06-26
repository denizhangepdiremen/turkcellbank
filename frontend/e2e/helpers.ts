import { expect, request, type Page } from '@playwright/test'

// Backend-gerektiren E2E testleri için ortak yardımcılar.
export const API = 'http://localhost:5099'

type TestUser = {
  name: string
  email: string
  password: string
  nationalId?: string
}

// Giriş/hesap testleri için dummy müşteri
export const DUMMY: TestUser = {
  name: 'E2E Test',
  email: 'e2e@turkcellbank.com',
  nationalId: testNationalIdFor('e2e@turkcellbank.com'),
  password: 'parola123',
}

// Transfer testleri için ikinci dummy müşteri
export const DUMMY2: TestUser = {
  name: 'E2E Alıcı',
  email: 'e2e2@turkcellbank.com',
  nationalId: testNationalIdFor('e2e2@turkcellbank.com'),
  password: 'parola456',
}

// Admin testleri için backend'in seed ettiği admin
export const ADMIN = {
  email: 'admin@turkcellbank.com',
  password: 'Admin123!',
}

// Rol hiyerarşisi testleri için backend'in seed ettiği personel.
// Şifre StaffSeed:Password ile (dev/test ortamında) seed edilir.
export const STAFF_PASSWORD = 'Personel123!'
export const STAFF = {
  branchEmployee: { email: 'calisan1.kadikoy@turkcellbank.com', home: /\/sube$/, heading: 'Şube Çalışanı Paneli' },
  branchManager: { email: 'mudur.kadikoy@turkcellbank.com', home: /\/sube-muduru$/, heading: 'Şube Müdürü Paneli' },
  provincialManager: { email: 'ilmudur.istanbul@turkcellbank.com', home: /\/il-muduru$/, heading: 'İl Müdürü Paneli' },
  director: { email: 'direktor@turkcellbank.com', home: /\/direktor$/, heading: 'Direktör Paneli' },
} as const

function generateValidTc(baseNine: number) {
  const s = String(baseNine % 1_000_000_000).padStart(9, '0').replace(/^0/, '1')
  const d = s.split('').map(Number)
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8]
  const evenSum = d[1] + d[3] + d[5] + d[7]
  const tenth = ((oddSum * 7 - evenSum) % 10 + 10) % 10
  const eleventh = (oddSum + evenSum + tenth) % 10
  return `${s}${tenth}${eleventh}`
}

export function testNationalIdFor(seed: string) {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return generateValidTc(800_000_000 + (hash % 100_000_000))
}

/**
 * Dummy kullanıcıyı (yoksa) oluşturur. Zaten kayıtlıysa backend 400 döner;
 * bu beklenen bir durumdur (testler tekrar tekrar çalışabilsin diye yok sayılır).
 */
export async function ensureRegistered(user: TestUser = DUMMY) {
  const ctx = await request.newContext()
  await ctx.post(`${API}/api/auth/register`, {
    data: {
      fullName: user.name,
      email: user.email,
      nationalId: user.nationalId ?? testNationalIdFor(user.email),
      password: user.password,
    },
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

/** Panel sekmeleri arasında geçiş (Hesaplarım/İşlemler/Krediler/Kartlar/Ödemeler). */
export async function openTab(
  page: Page,
  label: 'Hesaplarım' | 'İşlemler' | 'Krediler' | 'Kartlar' | 'Ödemeler',
) {
  await page.getByRole('button', { name: label, exact: true }).click()
}

// Personel panellerindeki (müdür/il müdürü/direktör) sekme çubuğu
export async function openStaffTab(page: Page, label: string) {
  await page.locator('.staff-tab').filter({ hasText: label }).click()
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

/**
 * Genişletilmiş kredi başvurusu (Krediler sekmesinden). Başvuru anında AI/kural
 * motoru otomatik karar verir; "değerlendiriliyor" ekranından sonra sonuç modalı
 * (Onaylandı/Reddedildi) açılır. Yardımcı, sonuç modalını bekleyip kapatır.
 * Zorunlu olmayan alanlar makul varsayılanlarla doldurulur.
 */
export async function applyForLoan(
  page: Page,
  opts: {
    income: string
    profession: string
    amount: string
    term?: string
    tc?: string
    age?: string
    marital?: 'Single' | 'Married'
    children?: string
    housing?: 'Tenant' | 'Owner'
    expenses?: string
    employment?: string
    // Beklenen sonuç başlığı (varsayılan otomatik karar; büyük tutarda onaya gönderilir)
    expectHeading?: RegExp
  },
) {
  await openTab(page, 'Krediler')
  await page.getByRole('button', { name: '+ Kredi Başvur' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('TC Kimlik No')).toHaveValue(/\d{11}/)
  await dialog.getByLabel('Yaş').fill(opts.age ?? '35')
  await dialog.getByLabel('Medeni Hal').selectOption(opts.marital ?? 'Single')
  await dialog.getByLabel('Çocuk Sayısı').fill(opts.children ?? '0')
  await dialog.getByLabel('Konut Durumu').selectOption(opts.housing ?? 'Tenant')
  await dialog.getByLabel('Aylık Gelir (₺)').fill(opts.income)
  await dialog.getByLabel('Aylık Gider (₺)').fill(opts.expenses ?? '10000')
  await dialog.getByLabel('Çalışma Kıdemi (ay)').fill(opts.employment ?? '24')
  await dialog.getByLabel('Meslek').fill(opts.profession)
  await dialog.getByLabel('Kredi Tutarı (₺)').fill(opts.amount)
  await dialog.getByLabel('Vade (ay)').fill(opts.term ?? '12')
  await dialog.getByRole('button', { name: 'Başvur', exact: true }).click()

  // Sonuç modalı: otomatik karar (onay/red) ya da onaya gönderildi. AI çağrısı
  // için geniş timeout.
  await expect(
    page.getByRole('heading', {
      name: opts.expectHeading ?? /Başvurunuz (Onaylandı|Reddedildi)/,
    }),
  ).toBeVisible({ timeout: 50_000 })

  // Sonuç modalını kapat. Modalda iki "Kapat" var (başlıktaki X + footer butonu);
  // footer butonu son sıradadır.
  await page.getByRole('dialog').getByRole('button', { name: 'Kapat' }).last().click()
}

/** Kart başvurusu yapar (Kartlar sekmesinden). */
export async function applyForCard(page: Page) {
  await openTab(page, 'Kartlar')
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
