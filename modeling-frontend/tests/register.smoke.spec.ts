import { test, expect } from './fixtures';

test('register page smoke: elements render and register via fixture', async ({ page, auth }) => {
  await page.goto('http://localhost:3000/auth/register');

  await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
  await expect(page.locator('[data-testid="register-name"]')).toBeVisible();
  await expect(page.locator('[data-testid="register-email"]')).toBeVisible();
  await expect(page.locator('[data-testid="register-password"]')).toBeVisible();
  await expect(page.locator('[data-testid="register-confirm"]')).toBeVisible();
  await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();

  const email = `e2e+smoke+${Date.now()}@example.com`;
  const password = 'Sm0kePass!';
  const { result, cookies } = await auth.register(email, password).then((r) => ({ result: r, cookies: [] }));
  expect(result.status).toBeGreaterThan(0);
  expect([200, 201].includes(result.status)).toBeTruthy();
  const all = await auth.cookies();
  expect(all.some((c: any) => c.name === 'access_token')).toBeTruthy();
});
