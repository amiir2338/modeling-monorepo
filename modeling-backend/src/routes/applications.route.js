// src/routes/applications.route.js
import { Router } from 'express';
import mongoose from 'mongoose';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';
import Job from '../models/job.model.js';
import Application from '../models/application.model.js';
import { onJobApplied, onApplicationUpdated } from '../services/notification.service.js';

const router = Router();
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

/**
 * MODEL: Apply to a job
 * POST /api/v1/jobs/:id/apply
 * body: { message?: string, portfolio?: string, phone?: string }
 */
router.post('/v1/jobs/:id/apply', authRequired, requireRoles('model'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid job id' });

    const job = await Job.findById(id).select('status clientId title');
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
    if (job.status !== 'approved') {
      return res.status(400).json({ ok: false, message: 'Job is not open for applications' });
    }

    const payload = {
      jobId: job._id,
      modelUserId: req.user._id,
      message: (req.body?.note || req.body?.message || '').trim(),
      portfolio: (req.body?.portfolioUrl || req.body?.portfolio || '').trim(),
      phone: (req.body?.phone || '').trim(),
      status: 'submitted',
    };

    let app;
    try {
      app = await Application.create(payload);
    } catch (e) {
      if (String(e?.code) === '11000') {
        return res.status(409).json({ ok: false, message: 'Already applied' });
      }
      throw e;
    }

    // 🔔 نوتیف برای مالک آگهی (User مالک clientId)
    await onJobApplied({ job, application: app });

    return res.json({ ok: true, application: app });
  } catch (e) {
    console.error('apply error:', e);
    return res.status(500).json({ ok: false, message: 'Apply failed' });
  }
});

/** ADMIN/CLIENT(owner): List applications for a job */
router.get('/v1/jobs/:id/applications', authRequired, requireRoles('client', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid job id' });

    const job = await Job.findById(id).select('clientId');
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    const isOwner = job.clientId && String(job.clientId) === String(req.user.clientId || req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const apps = await Application.find({ jobId: id }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, applications: apps });
  } catch (e) {
    console.error('list job applications error:', e);
    return res.status(500).json({ ok: false, message: 'Fetch applications failed' });
  }
});

/** MODEL: my applications */
router.get('/v1/applications/mine', authRequired, requireRoles('model'), async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Application.find({ modelUserId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Application.countDocuments({ modelUserId: req.user._id }),
    ]);

    res.json({ ok: true, data: items, page, total });
  } catch (e) {
    console.error('mine applications error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/** CLIENT(owner)/ADMIN: applications for my jobs */
router.get('/v1/applications/for-me', authRequired, requireRoles('client', 'admin'), async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const q = {};
    if (req.user.role === 'client') {
      const myJobs = await Job.find({ clientId: req.user.clientId || req.user._id }).select('_id');
      q['jobId'] = { $in: myJobs.map(j => j._id) };
    }

    const [items, total] = await Promise.all([
      Application.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Application.countDocuments(q),
    ]);

    res.json({ ok: true, data: items, page, total });
  } catch (e) {
    console.error('for-me applications error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/** ANY participant (model | client owner) or admin: get single application */
router.get('/v1/applications/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });
    const app = await Application.findById(id).lean();
    if (!app) return res.status(404).json({ ok: false, message: 'Application not found' });

    const isModelSide = String(app.modelUserId) === String(req.user._id);
    let isOwner = false;
    if (req.user.role === 'client') {
      const job = await Job.findById(app.jobId).select('clientId');
      isOwner = job?.clientId && String(job.clientId) === String(req.user.clientId || req.user._id);
    }
    const isAdmin = req.user.role === 'admin';
    if (!isModelSide && !isOwner && !isAdmin) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }
    return res.json({ ok: true, data: app });
  } catch (e) {
    console.error('get application error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/** CLIENT(owner)/ADMIN: update application status */
router.patch('/v1/applications/:id', authRequired, requireRoles('client', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body || {};
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });
    if (!status) return res.status(400).json({ ok: false, message: 'status is required' });
    if (!['submitted','reviewed','accepted','declined'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'Invalid status' });
    }

    const app = await Application.findById(id);
    if (!app) return res.status(404).json({ ok: false, message: 'Application not found' });

    // check ownership for client
    if (req.user.role === 'client') {
      const job = await Job.findById(app.jobId).select('clientId');
      const isOwner = job?.clientId && String(job.clientId) === String(req.user.clientId || req.user._id);
      if (!isOwner) return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    app.status = status;
    if (reason !== undefined) app.reason = reason;
    if (!app.statusHistory) app.statusHistory = [];
    app.statusHistory.push({ to: status, reason: reason || null, at: new Date(), by: req.user._id });

    await app.save();

    await onApplicationUpdated({ application: app, newStatus: status, reason });

    return res.json({ ok: true, application: app });
  } catch (e) {
    console.error('update application status error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

export default router;
