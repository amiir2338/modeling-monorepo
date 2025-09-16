import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadRoutes() {
  // اول تلاش می‌کنیم از کنار این فایل بخونیم، اگر نبود از روت پروژه
  const p1 = path.resolve(__dirname, '../routes.json');
  const p2 = path.resolve(process.cwd(), 'routes.json');
  const p = fs.existsSync(p1) ? p1 : p2;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as {
    public: string[]; auth: string[]; admin: string[];
  };
}

const routes = loadRoutes();
const publicRoutes = Array.from(new Set(routes.public || []));

test.describe.configure({ mode: 'parallel' });

for (const r of publicRoutes) {
  test(`GET ${r} returns < 400`, async ({ request, baseURL }) => {
    test.skip(!baseURL, 'baseURL is not configured in playwright.config.ts');
    const url = new URL(r, baseURL!).toString();
    const res = await request.get(url);
    expect(res.status(), `GET ${url} should be < 400`).toBeLessThan(400);
  });
}
