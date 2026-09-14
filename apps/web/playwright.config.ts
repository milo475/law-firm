import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    locale: 'mn-MN',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } }, testMatch: /screenshots\.spec\.ts/ },
  ],
  // Assumes the API (:4000, seeded) and the web app (:3001) are already running:
  //   pnpm --filter @law-firm/web build && pnpm --filter @law-firm/web start
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: 'pnpm start',
        url: WEB_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
