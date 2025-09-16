// src/routes/index.js
// 🟢 این فایل مثل «نقشهٔ شهر» است: هر خیابانِ API کجا شروع می‌شود.
// 🟢 در server.js همهٔ این «نقشه» زیر /api مونت می‌شود؛ پس خروجی نهایی می‌شود /api/...

import { Router } from 'express';

// 🟢 بخش‌بندی منطقی هر حوزه (feature routers)
import healthRouter from './health.route.js';
import authRouter from './auth.route.js';
import authExtraRoute from './auth.extra.route.js';   // مثل logout
import userMeRoute from './user.me.route.js';
import uploadRoute from './upload.route.js';

import modelsRoute from './models.route.js';
import clientsRoute from './clients.route.js';

import jobsRouter from './jobs.route.js';
import jobsModerationRoute from './jobs.moderation.route.js';
import applicationsRoute from './applications.route.js';
import notificationsRouter from './notifications.route.js';

// 🟢 پیام‌رسانی/گفتگو
import messagesRouter from './messages.route.js';
import threadsRouter from './threads.route.js';

const router = Router();

/* ===========================================================
   🩺 سلامت سیستم
   خروجی نهایی: /api/health/...
   =========================================================== */
router.use('/health', healthRouter);

/* ===========================================================
   🔐 احراز هویت و کاربر
   خروجی نهایی: /api/v1/auth/...  و  /api/v1/users/...
   نکته: auth.extra.route.js (خروج) هم زیر v1/auth سوار می‌شود.
   =========================================================== */
router.use('/v1/auth', authRouter);
router.use('/v1/auth', authExtraRoute); // 🟢 مثل: POST /api/v1/auth/logout
router.use('/v1/users', userMeRoute);   // 🟢 مثل: GET /api/v1/users/me
router.use('/v1/upload', uploadRoute);

/* ===========================================================
   👥 مدل‌ها و کلاینت‌ها
   خروجی نهایی: /api/v1/models/...  و  /api/v1/clients/...
   =========================================================== */
router.use('/v1/models', modelsRoute);
router.use('/v1/clients', clientsRoute);

/* ===========================================================
   💼 فرصت‌های شغلی
   خروجی نهایی: /api/v1/jobs/...
   jobs.moderation.route.js هم به همان پریفیکس جوین می‌شود
   =========================================================== */
router.use('/v1/jobs', jobsRouter);
router.use('/v1/jobs', jobsModerationRoute);

/* ===========================================================
   📝 اپلیکیشن‌ها، 🔔 نوتیف‌ها، 💬 پیام‌ها/تاپیک‌ها
   نکته مهم: این روترها خودشان مسیرِ کامل /v1/... را داخلشان تعریف کرده‌اند.
   پس اینجا با '/' مونت می‌کنیم تا دوباره /v1 تکرار نشود.
   خروجی نهایی نمونه‌ها:
     /api/v1/applications/...
     /api/v1/notifications/...
     /api/v1/messages/...
     /api/v1/threads/...
   =========================================================== */
router.use('/', applicationsRoute);
router.use('/', notificationsRouter);
router.use('/', messagesRouter);
router.use('/', threadsRouter);

/* ===========================================================
   🚧 404 مخصوص APIهای نسخه‌دار
   هر چیزی زیر /api/v1/... که مچ نشود، خطای خوانا برگردد.
   (server.js هم یک هندلر خطای کلی دارد)
   =========================================================== */
router.use('/v1/*', (_req, res) => {
  return res.status(404).json({ ok: false, message: 'Endpoint not found' });
});

export default router;
