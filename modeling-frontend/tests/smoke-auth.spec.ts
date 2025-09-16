import { test, expect } from './fixtures';

const now = Date.now();
const EMAIL = `ci-smoke.${now}@e2e.test`;
const PASS = 'P@ssw0rd123';

test('auth smoke: register + login via fixture', async ({ auth, page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  const r = await auth.register(EMAIL, PASS, page);
  expect([200,201].includes(r.status)).toBeTruthy();
  const l = await auth.login(EMAIL, PASS, page);
  expect(l.ok).toBeTruthy();
  const cookies = await page.context().cookies();
  const found = cookies.find(c => c.name === 'access_token');
  expect(found, 'access_token cookie should be present after login').toBeTruthy();
});
