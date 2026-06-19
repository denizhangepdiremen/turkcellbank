import { defineConfig, devices } from '@playwright/test'

// Uçtan uca (E2E) test yapılandırması.
// Testler ./e2e altında. Vite dev sunucusu otomatik başlatılır (5173).
// Not: backend gerektiren senaryolar için backend'i 5099'da çalıştırın.
export default defineConfig({
  testDir: './e2e',
  // E2E testleri paylaşılan bir backend/veritabanına karşı koşar; eşzamanlı
  // mutasyonların birbirini bozmaması için tek worker (serial) kullanılır.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Frontend (5173) ve backend (5099) otomatik başlatılır; çalışıyorsa yeniden kullanılır.
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command:
        'dotnet run --project ../backend/TurkcellBank.API --urls http://localhost:5099',
      url: 'http://localhost:5099/swagger',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
