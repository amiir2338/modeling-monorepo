// src/routes/auth.extra.route.js
// 🔐 مسیرهای تکمیلی احراز هویت: فقط me و logout
// 🔍 چرا؟ چون register/login از قبل در auth.route.js و auth.controller.js نهایی شده‌اند.

import { Router } from 'express';
import { me, logout } from '../controllers/auth.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * GET /api/v1/auth/me
 * 🟢 فقط با کوکی/توکن معتبر کاربر فعلی را برمی‌گرداند.
 * - احراز هویت: اجباری
 */
router.get('/me', authRequired, me);

/**
 * POST /api/v1/auth/logout
 * 🟢 کوکی HttpOnly را پاک می‌کند.
 * - احراز هویت: اختیاری (اگر کوکی نباشد هم 200 می‌دهیم تا idempotent باشد)
 */
router.post('/logout', logout);

export default router;
