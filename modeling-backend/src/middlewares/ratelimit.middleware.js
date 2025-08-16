// src/middlewares/ratelimit.middleware.js
import rateLimit from 'express-rate-limit';

// محدودیت مخصوص احراز هویت (ثبت‌نام/لاگین)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: 20,                   // حداکثر 20 درخواست در هر پنجره
  standardHeaders: true,     // برگرداندن هدرهای RateLimit-*
  legacyHeaders: false,      // غیرفعال کردن X-RateLimit-*
  message: { ok: false, message: 'درخواست‌های زیاد! کمی بعد دوباره تلاش کنید.' }
});

// نمونه عمومی اگر بعداً لازم شد روی مسیرهای دیگر اعمال کنیم
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 دقیقه
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
