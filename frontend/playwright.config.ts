import { defineConfig, devices } from '@playwright/test'

// Uçtan uca (E2E) test yapılandırması.
// Testler ./e2e altında. Vite dev sunucusu otomatik başlatılır (5173).
// Not: backend gerektiren senaryolar için backend'i 5099'da çalıştırın.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
