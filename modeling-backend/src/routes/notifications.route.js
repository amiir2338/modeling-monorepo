// src/routes/notifications.route.js
import express from 'express';
import mongoose from 'mongoose';
import Notification from '../models/notification.model.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = express.Router();
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

function logRouteError(tag, err, req) {
  console.error(`[notifications.route:${tag}]`, {
    method: req.method,
    url: req.originalUrl || req.url,
    user: req.user ? {
      _id: req.user._id,
      role: req.user.role,
      clientId: req.user.clientId,
      email: req.user.email,
    } : null,
    params: req.params,
    query: req.query,
    body: req.body ? { ...req.body } : null,
    error: { message: err?.message, stack: err?.stack },
  });
}

/**
 * GET /api/v1/notifications
 * لیست نوتیف‌های کاربر جاری (جدیدترین اول)
 * query: ?page=1&limit=20
 * خروجی: { ok, data:[...], page, limit, total }
 */
router.get('/notifications', authRequired, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: req.user._id }),
    ]);

    return res.json({ ok: true, data: items, page, limit, total });
  } catch (err) {
    logRouteError('LIST', err, req);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * GET /api/v1/notifications/unread-count
 * خروجی: { ok:true, count:number }
 */
router.get('/notifications/unread-count', authRequired, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });
    return res.json({ ok: true, count });
  } catch (err) {
    logRouteError('UNREAD_COUNT', err, req);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * مارک‌کردن یک نوتیف به عنوان خوانده‌شده (پیش‌فرض true)
 * body: { read?: boolean }
 * خروجی: { ok:true, data:{ notification } }
 */
router.patch('/notifications/:id/read', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res.status(400).json({ ok: false, message: 'Invalid id' });
    }

    const notif = await Notification.findOne({ _id: id, userId: req.user._id });
    if (!notif) {
      return res.status(404).json({ ok: false, message: 'Notification not found' });
    }

    const shouldRead =
      req.body && typeof req.body.read === 'boolean' ? !!req.body.read : true;

    notif.read = shouldRead;
    await notif.save();

    return res.json({ ok: true, data: { notification: notif } });
  } catch (err) {
    logRouteError('MARK_READ', err, req);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * حذف یک نوتیف کاربر
 * خروجی: { ok:true }
 */
router.delete('/notifications/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res.status(400).json({ ok: false, message: 'Invalid id' });
    }

    const n = await Notification.findOne({ _id: id, userId: req.user._id });
    if (!n) {
      return res.status(404).json({ ok: false, message: 'Notification not found' });
    }

    await n.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    logRouteError('DELETE', err, req);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

export default router;
