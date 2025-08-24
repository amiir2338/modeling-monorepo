// src/routes/jobs.route.js
import { Router } from 'express';
import mongoose from 'mongoose';
import Job from '../models/job.model.js';
import { authRequired, optionalAuth, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

/** Helper: check owner/admin */
function canEditJob(req, job) {
  if (!req?.user || !job) return false;
  const isAdmin = req.user.role === 'admin';
  const isOwner = job.clientId && String(job.clientId) === String(req.user.clientId || req.user._id);
  return isAdmin || isOwner;
}

/** Helper: safe setters */
function applyJobPatch(job, body = {}) {
  if (body.title !== undefined) job.title = String(body.title || '').trim();
  if (body.description !== undefined) job.description = String(body.description || '').trim();
  if (body.budget !== undefined) {
    const b = Number(body.budget);
    job.budget = Number.isFinite(b) ? b : null;
  }
  if (body.city !== undefined) job.city = body.city ? String(body.city) : null;
  if (body.date !== undefined) {
    // اجازه بده ISO string بیاد؛ اگر نامعتبر بود، null بگذار
    const d = body.date ? new Date(body.date) : null;
    job.date = d && !isNaN(d.getTime()) ? d.toISOString() : null;
  }
}

/** Public list (approved only), with basic filters */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const q = { status: 'approved' };
    if (req.query.city) q.city = String(req.query.city);

    const [jobs, total] = await Promise.all([
      Job.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(q),
    ]);

    return res.json({ ok: true, jobs, page, limit, total });
  } catch (err) {
    next(err);
  }
});

/** Get by id: approved only or owners/admin */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    const allowed = job.status === 'approved' || canEditJob(req, job);
    if (!allowed) return res.status(403).json({ ok: false, message: 'Forbidden' });

    return res.json({ ok: true, job });
  } catch (err) {
    next(err);
  }
});

/** Create job — client/admin */
router.post('/', authRequired, requireRoles('client','admin'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const u = req.user || {};
    // اولویت با body.clientId، بعد user.clientId، بعد user._id
    const clientId = body.clientId || u.clientId || u._id;

    if (!isObjectId(clientId)) {
      return res.status(400).json({ ok: false, message: 'clientId is required' });
    }

    const job = new Job({
      clientId,
      title: String(body.title || '').trim(),
      description: String(body.description || '').trim(),
      budget: Number.isFinite(Number(body.budget)) ? Number(body.budget) : null,
      city: body.city ? String(body.city) : null,
      date: body.date ? new Date(body.date) : null,
      status: 'draft',
      draftExpiresAt: null,
    });

    await job.save();
    return res.status(201).json({ ok: true, job });
  } catch (err) {
    next(err);
  }
});

/** Update job — owner/admin */
router.patch('/:id', authRequired, requireRoles('client','admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    if (!canEditJob(req, job)) return res.status(403).json({ ok: false, message: 'Forbidden' });

    applyJobPatch(job, req.body);
    await job.save();
    return res.json({ ok: true, job });
  } catch (err) {
    next(err);
  }
});

/** Submit job — client/admin */
router.post('/:id/submit', authRequired, requireRoles('client','admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    if (!canEditJob(req, job)) return res.status(403).json({ ok: false, message: 'Forbidden' });

    if (!req.body?.termsAccepted) {
      return res.status(400).json({ ok: false, message: 'termsAccepted is required' });
    }

    // فقط draft یا rejected اجازه‌ی submit دارد
    if (!['draft', 'rejected'].includes(job.status)) {
      return res.status(400).json({ ok: false, message: `Cannot submit from status '${job.status}'` });
    }

    job.status = 'pending_review';
    await job.save();
    return res.json({ ok: true, job });
  } catch (err) {
    next(err);
  }
});

/** Approve/reject — admin only */
router.patch('/:id/approve', authRequired, requireRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    // فقط pending_review قابل approve است
    if (job.status !== 'pending_review') {
      return res.status(400).json({ ok: false, message: `Cannot approve from status '${job.status}'` });
    }

    job.status = 'approved';
    await job.save();
    return res.json({ ok: true, job });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/reject', authRequired, requireRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    // فقط pending_review قابل reject است
    if (job.status !== 'pending_review') {
      return res.status(400).json({ ok: false, message: `Cannot reject from status '${job.status}'` });
    }

    job.status = 'rejected';
    await job.save();
    return res.json({ ok: true, job });
  } catch (err) {
    next(err);
  }
});

/** Delete — owner/admin */
router.delete('/:id', authRequired, requireRoles('client','admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    if (!canEditJob(req, job)) return res.status(403).json({ ok: false, message: 'Forbidden' });

    await job.deleteOne();
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
