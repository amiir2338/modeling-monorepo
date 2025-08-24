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

const router = express.Router();
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

/**
 * POST /v1/messages
 * body: { applicationId, threadId?, text?, attachments? }
 * sender = req.user._id
 */
router.post('/v1/messages', authRequired, async (req, res) => {
  try {
    const { applicationId, threadId, text = '', attachments = [] } = req.body || {};
    if (!applicationId && !threadId) {
      return res.status(400).json({ ok: false, message: 'applicationId or threadId is required' });
    }
    if (applicationId && !isObjectId(applicationId)) {
      return res.status(400).json({ ok: false, message: 'Invalid applicationId' });
    }
    if (threadId && !isObjectId(threadId)) {
      return res.status(400).json({ ok: false, message: 'Invalid threadId' });
    }

    if (applicationId) {
      // فقط اطمینان از وجود/ساخت thread
      await getOrCreateThreadByApplication(applicationId);
    }

    const { message, threadId: tid } = await sendMessage({
      senderId: req.user._id,
      applicationId,
      threadId,
      text,
      attachments,
    });

    return res.status(201).json({ ok: true, data: { message, threadId: tid } });
  } catch (err) {
    const status = err.status || 500;
    console.error('[messages:create] error:', err?.message || err);
    return res.status(status).json({ ok: false, message: err?.message || 'Server error' });
  }
});

/**
 * GET /v1/messages
 * query: ?threadId=... | ?applicationId=... & page & limit
 */
router.get('/v1/messages', authRequired, async (req, res) => {
  try {
    const { threadId, applicationId } = req.query || {};
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    if (!threadId && !applicationId) {
      return res.status(400).json({ ok: false, message: 'threadId or applicationId is required' });
    }
    if (threadId && !isObjectId(threadId)) {
      return res.status(400).json({ ok: false, message: 'Invalid threadId' });
    }
    if (applicationId && !isObjectId(applicationId)) {
      return res.status(400).json({ ok: false, message: 'Invalid applicationId' });
    }

    const out = await listMessages({ threadId, applicationId, userId: req.user._id, page, limit });
    return res.json({ ok: true, ...out });
  } catch (err) {
    const status = err.status || 500;
    console.error('[messages:list] error:', err?.message || err);
    return res.status(status).json({ ok: false, message: err?.message || 'Server error' });
  }
});

/**
 * PATCH /v1/messages/:id/read
 */
router.patch('/v1/messages/:id/read', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const out = await markMessageRead(id, req.user._id);
    return res.json(out);
  } catch (err) {
    const status = err.status || 500;
    console.error('[messages:mark-read] error:', err?.message || err);
    return res.status(status).json({ ok: false, message: err?.message || 'Server error' });
  }
});

export default router;
