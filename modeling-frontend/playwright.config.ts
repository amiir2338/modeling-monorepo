import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60_000,
  use: {
    baseURL: process.env.FRONT_ORIGIN || 'http://localhost:3000',
    headless: true,
    // Optionally record HAR files when PLAYWRIGHT_HAR=1
    contextOptions: process.env.PLAYWRIGHT_HAR === '1' ? { recordHar: { path: '../artifacts/frontend/playwright.har' } } : undefined,
  },
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
