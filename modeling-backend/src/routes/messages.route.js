// src/routes/messages.route.js
import express from 'express';
import mongoose from 'mongoose';
import { authRequired } from '../middlewares/auth.middleware.js';
import {
  getOrCreateThreadByApplication,
  listMessages,
  sendMessage,
  markMessageRead,
} from '../services/messaging.service.js';
import { notify } from '../services/notification.service.js';
import Message from '../models/message.model.js';

const router = express.Router();
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

function logRouteError(tag, err, req) {
  console.error(`[messages.route:${tag}]`, {
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
    body: req.body ? { ...req.body, password: req.body.password ? '***' : undefined } : null,
    error: { message: err?.message, stack: err?.stack },
  });
}

/**
 * POST /api/v1/messages
 * body: { applicationId?, threadId?, text?, attachments?[] }
 * sender = req.user._id
 */
router.post('/messages', authRequired, async (req, res) => {
  try {
    const { applicationId, threadId, text = '', attachments = [] } = req.body || {};

    if (!applicationId && !threadId) {
      return res.status(400).json({ ok: false, message: 'applicationId یا threadId الزامی است' });
    }
    if (applicationId && !isObjectId(applicationId)) {
      return res.status(400).json({ ok: false, message: 'applicationId نامعتبر است' });
    }
    if (threadId && !isObjectId(threadId)) {
      return res.status(400).json({ ok: false, message: 'threadId نامعتبر است' });
    }

    // اگر بر اساس درخواست شغلی‌ست، مطمئن شو ترد وجود دارد
    let ensuredThreadId = threadId || null;
    if (applicationId) {
      const thr = await getOrCreateThreadByApplication(applicationId);
      ensuredThreadId = thr?.threadId || thr?._id || ensuredThreadId;
    }

    const { message, threadId: finalThreadId } = await sendMessage({
      senderId: req.user._id,
      applicationId: applicationId || undefined,
      threadId: ensuredThreadId || threadId,
      text,
      attachments,
    });

    // 🔔 نوتیف گیرنده
    try {
      const toUserId = message?.toUserId || message?.recipientId;
      if (toUserId) {
        await notify(toUserId, 'message', {
          threadId: String(finalThreadId || ensuredThreadId || ''),
          applicationId: String(message?.applicationId || ''),
          messageId: String(message?._id || ''),
        });
      }
    } catch (e) {
      console.warn('[messages:create] notify warn:', e?.message);
    }

    return res.status(201).json({
      ok: true,
      data: { message, threadId: finalThreadId || ensuredThreadId || threadId || null },
    });
  } catch (err) {
    logRouteError('CREATE', err, req);
    const status = err.status || 500;
    return res.status(status).json({ ok: false, message: err?.message || 'Server error' });
  }
});

/**
 * GET /api/v1/messages
 * query: ?threadId=... | ?applicationId=... & page & limit
 * خروجی: { ok, messages, page, limit, total, threadId? }
 */
router.get('/messages', authRequired, async (req, res) => {
  try {
    const { threadId, applicationId } = req.query || {};
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    if (!threadId && !applicationId) {
      return res.status(400).json({ ok: false, message: 'threadId یا applicationId الزامی است' });
    }
    if (threadId && !isObjectId(threadId)) {
      return res.status(400).json({ ok: false, message: 'threadId نامعتبر است' });
    }
    if (applicationId && !isObjectId(applicationId)) {
      return res.status(400).json({ ok: false, message: 'applicationId نامعتبر است' });
    }

    const out = await listMessages({
      threadId,
      applicationId,
      userId: req.user._id,
      page,
      limit,
    });

    return res.json({ ok: true, ...out });
  } catch (err) {
    logRouteError('LIST', err, req);
    const status = err.status || 500;
    return res.status(status).json({ ok: false, message: err?.message || 'Server error' });
  }
});

/**
 * PATCH /api/v1/messages/:id/read
 * نشانه‌گذاری پیام به‌عنوان خوانده‌شده + notify به فرستنده
 */
router.patch('/messages/:id/read', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'id نامعتبر است' });

    const out = await markMessageRead(id, req.user._id);

    // 🔔 به فرستنده بگو پیامش خوانده شد
    try {
      const msg = await Message.findById(id).lean();
      if (msg?.senderId) {
        await notify(msg.senderId, 'message_read', {
          messageId: String(msg._id),
          threadId: String(msg.threadId || ''),
          byUserId: String(req.user._id),
        });
      }
    } catch (e) {
      console.warn('[messages:mark-read] notify warn:', e?.message);
    }

    return res.json({ ok: true, ...out });
  } catch (err) {
    logRouteError('MARK_READ', err, req);
    const status = err.status || 500;
    return res.status(status).json({ ok: false, message: err?.message || 'Server error' });
  }
});

export default router;
