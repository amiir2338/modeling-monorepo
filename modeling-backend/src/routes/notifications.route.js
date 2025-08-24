// src/routes/notifications.route.js
import express from 'express';
import mongoose from 'mongoose';
import Notification from '../models/notification.model.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = express.Router();
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

/**
 * GET /v1/notifications
 * لیست نوتیف‌های کاربر جاری
 */
router.get('/v1/notifications', authRequired, async (req, res) => {
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
    console.error('[notifications:list] error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * GET /v1/notifications/unread-count
 * شمارش نوتیف‌های خوانده‌نشده
 */
router.get('/v1/notifications/unread-count', authRequired, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, read: false });
    return res.json({ ok: true, count });
  } catch (err) {
    console.error('[notifications:unread-count] error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * PATCH /v1/notifications/:id/read
 * مارک‌کردن یک نوتیف به عنوان خوانده‌شده
 */
router.patch('/v1/notifications/:id/read', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const n = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: { read: true } },
      { new: true, lean: true }
    );
    if (!n) return res.status(404).json({ ok: false, message: 'Notification not found' });

    return res.json({ ok: true, data: n });
  } catch (err) {
    console.error('[notifications:mark-read] error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * DELETE /v1/notifications/:id
 * حذف یک نوتیف کاربر
 */
router.delete('/v1/notifications/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const n = await Notification.findOne({ _id: id, userId: req.user._id });
    if (!n) return res.status(404).json({ ok: false, message: 'Notification not found' });

    await n.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error('[notifications:delete] error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

export default router;
