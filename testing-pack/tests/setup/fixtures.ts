// tests/setup/fixtures.ts
import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ appGuard: void }>({
  appGuard: [async ({ page }, use, testInfo) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err?.message || String(err)}`));

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`CONSOLE:${msg.type()}: ${msg.text()}`);
    });

    page.on('response', async (res) => {
      const s = res.status();
      if (s >= 500) errors.push(`HTTP ${s} ${res.url()}`);
    });

    await use();

    if (errors.length) {
      testInfo.attach('app-guard-errors', { body: errors.join('\n'), contentType: 'text/plain' });
      expect(errors, 'App emitted errors (console/pageerror/HTTP 5xx)').toEqual([]);
    }
  }, { auto: true }],
});

export const expectEx = expect;
