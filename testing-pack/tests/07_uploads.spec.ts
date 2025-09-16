import { test, expectEx as expect } from './setup/fixtures';
import { loginUI } from './utils/authHelper';
import fs from 'fs';
import path from 'path';

function ensureSampleImage(): string {
  const out = path.resolve(process.cwd(), 'artifacts/tmp/sample.jpg');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const b64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEA8QDQ8PDQ0NDRANDQ0NDQ8NDQ0NFREWFhURExUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEAAwAAAAAAAAAAAAAAAAACAQf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAgP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCkAAB//9k=';
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  return out;
}
async function waitUploadSettled(page, timeout = 15000) {
  await Promise.race([
    page.waitForLoadState('networkidle', { timeout }).catch(()=>{}),
    page.waitForResponse(r => /(upload|media|file|image)/i.test(r.url()) && r.status() < 400, { timeout }).catch(()=>false),
  ]);
}

test.describe('Media uploads', () => {
  test('Model uploads a portfolio image', async ({ page }) => {
    await loginUI(page, 'model');

    const candidates = ['/profile', '/dashboard/model/profile', '/profile/uploads'];
    let ok = false;
    for (const r of candidates) {
      const res = await page.goto(r, { waitUntil: 'domcontentloaded' });
      if (!res || res.status() < 400) { ok = true; break; }
    }
    expect(ok, 'Profile/Uploads page should be reachable').toBeTruthy();

    const filePath = ensureSampleImage();

    // ورودی فایل یا تریگر آپلود
    const input = page.locator('input[type="file"], input[type=file]').first();
    if (await input.count()) {
      await input.setInputFiles(filePath, { timeout: 10_000 }).catch(async () => {
        await input.setInputFiles(filePath, { timeout: 10_000, force: true });
      });
    } else {
      const triggers = [
        () => page.getByRole('button', { name: /upload|choose|انتخاب|بارگذاری/i }),
        () => page.getByLabel(/upload|choose|انتخاب|بارگذاری/i),
        () => page.locator('label', { hasText: /upload|choose|انتخاب|بارگذاری/i }),
        () => page.getByText(/upload|choose|انتخاب|بارگذاری/i),
      ];
      for (const t of triggers) {
        const el = t(); if (await el.count()) { await el.first().click().catch(()=>{}); break; }
      }
      const input2 = page.locator('input[type="file"], input[type=file]').first();
      await expect(input2).toBeVisible({ timeout: 5000 });
      await input2.setInputFiles(filePath, { timeout: 10_000, force: true });
    }

    // مودال‌های کراپ/تأیید
    const modalOk = page.getByRole('button', { name: /save|apply|done|ذخیره|تایید|اعمال/i }).first();
    if (await modalOk.count()) await modalOk.click().catch(()=>{});

    // ثبت نهایی
    const clicked = await (async () => {
      const btns = [
        () => page.getByRole('button', { name: /upload|save|submit|ذخیره|بارگذاری|ثبت/i }),
        () => page.locator('[data-testid="upload-btn"], [data-testid="save-btn"]')
      ];
      for (const f of btns) { const b = f(); if (await b.count()) { await b.first().click(); return true; } }
      return false;
    })();
    expect(clicked, 'Upload/Save button not found').toBeTruthy();

    await waitUploadSettled(page);

    // تایید موفقیت: toast یا حضور تصویر جدید
    const toast = page.getByText(/uploaded|success|موفق|آپلود شد|ذخیره شد/i).first();
    if (await toast.count()) await expect(toast).toBeVisible();
    else {
      const img = page.locator('img[src*="blob:"], img[src^="data:"], img[src*="uploads"], img[src*="media"]').first();
      await expect(img).toBeVisible();
    }
  });
});
