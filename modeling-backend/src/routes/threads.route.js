// src/routes/threads.route.js
import express from 'express';
import mongoose from 'mongoose';
import { authRequired } from '../middlewares/auth.middleware.js';
import Thread from '../models/thread.model.js';
import {
  getOrCreateThreadByApplication,
  listThreads,
  markThreadRead,
  unreadThreadCount,
} from '../services/messaging.service.js';

const router = express.Router();
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

/**
 * GET /v1/threads
 * لیست گفتگوهای کاربر
 */
router.get('/v1/threads', authRequired, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const out = await listThreads({ userId: req.user._id, page, limit });
    return res.json({ ok: true, ...out });
  } catch (err) {
    console.error('[threads:list] error:', err?.message || err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /v1/threads/by-application
 * body: { applicationId }
 * اگر Thread وجود نداشت، ایجاد می‌کند و برمی‌گرداند.
 */
router.post('/v1/threads/by-application', authRequired, async (req, res) => {
  try {
    const { applicationId } = req.body || {};
    if (!isObjectId(applicationId)) {
      return res.status(400).json({ ok: false, message: 'Invalid applicationId' });
    }
    const t = await getOrCreateThreadByApplication(applicationId);
    // فقط اعضای تاپیک اجازهٔ مشاهده دارند
    const ok = (t.participants || []).some((p) => String(p) === String(req.user._id));
    if (!ok) return res.status(403).json({ ok: false, message: 'Forbidden' });

    return res.json({ ok: true, data: t });
  } catch (err) {
    const status = err.status || 500;
    console.error('[threads:by-application] error:', err?.message || err);
    return res.status(status).json({ ok: false, message: err?.message || 'Server error' });
  }
});

/**
 * PATCH /v1/threads/:id/read-all
 * مارک‌کردن همه پیام‌های Thread به‌عنوان خوانده‌شده توسط کاربر جاری
 */
router.patch('/v1/threads/:id/read-all', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    // تأیید مالکیت/عضویت در سرویس انجام می‌شود
    const out = await markThreadRead(id, req.user._id);
    return res.json(out);
  } catch (err) {
    const status = err.status || 500;
    console.error('[threads:read-all] error:', err?.message || err);
    return res.status(status).json({ ok: false, message: err?.message || 'Server error' });
  }
});

/**
 * GET /v1/threads/unread-count
 * شمارش Threadهایی که برای کاربر unread دارند
 */
router.get('/v1/threads/unread-count', authRequired, async (req, res) => {
  try {
    const count = await unreadThreadCount(req.user._id);
    return res.json({ ok: true, count });
  } catch (err) {
    console.error('[threads:unread-count] error:', err?.message || err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

export default router;
