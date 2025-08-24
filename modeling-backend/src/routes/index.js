// src/routes/index.js
import { Router } from 'express';

// Feature routers
import healthRouter from './health.route.js';
import authRouter from './auth.route.js';
import authExtraRoute from './auth.extra.route.js';
import userMeRoute from './user.me.route.js';
import uploadRoute from './upload.route.js';

import modelsRoute from './models.route.js';
import clientsRoute from './clients.route.js';

import jobsRouter from './jobs.route.js';
import jobsModerationRoute from './jobs.moderation.route.js';
import applicationsRoute from './applications.route.js';
import notificationsRouter from './notifications.route.js';
import debugRoutes from './debug.route.js';

// ✅ این‌ها قبلاً اضافه شده‌اند
import messagesRouter from './messages.route.js';
import threadsRouter from './threads.route.js';

const router = Router();

/* ---------- Health ---------- */
router.use('/health', healthRouter);

/* ---------- Auth & User ---------- */
router.use('/v1/auth', authRouter);
router.use('/v1/auth', authExtraRoute);
router.use('/v1/users', userMeRoute);
router.use('/v1/upload', uploadRoute);

/* ---------- Model & Client ---------- */
router.use('/v1/models', modelsRoute);
router.use('/v1/clients', clientsRoute);

/* ---------- Jobs ---------- */
router.use('/v1/jobs', jobsRouter);
router.use('/v1/jobs', jobsModerationRoute);

/* ---------- Applications ---------- */
router.use('/', applicationsRoute);

/* ---------- Notifications ---------- */
router.use('/', notificationsRouter);

/* ---------- Messaging ---------- */
router.use('/', messagesRouter);   // maps to /api/v1/messages  (چون در router اصلی روی /api mount می‌شود)
router.use('/', threadsRouter);    // maps to /api/v1/threads

/* ---------- Debug (فقط برای عیب‌یابی) ---------- */
router.use('/v1/_debug', debugRoutes); // ✅ این جایگزین app.use(...) شد

export default router;
