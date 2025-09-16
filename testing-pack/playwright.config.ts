import { defineConfig, devices } from '@playwright/test';

const BASE_URL =
  process.env.BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  'http://localhost:3000';

const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'artifacts/pw-report.json' }],
    ['junit', { outputFile: 'artifacts/junit.xml' }],
  ],

  outputDir: 'artifacts/test-output',

  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    ignoreHTTPSErrors: true,

    // برای جلوگیری از تداخل با tracing دستی:
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
