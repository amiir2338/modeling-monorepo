// src/routes/applications.route.js
import { Router } from 'express';
import mongoose from 'mongoose';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';
import Job from '../models/job.model.js';
import Application from '../models/application.model.js';

const router = Router();

/**
 * MODEL: Apply to a job
 * POST /api/v1/jobs/:id/apply
 * body: { message?: string, portfolio?: string }
 */
router.post('/v1/jobs/:id/apply', authRequired, requireRoles('model'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: 'Invalid job id' });
    }

    const job = await Job.findById(id).lean();
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
    if (job.status !== 'approved') {
      return res.status(400).json({ ok: false, message: 'Job is not open for applications' });
    }

    const { message = '', portfolio = '' } = req.body || {};
    const app = await Application.create({
      jobId: id,
      modelUserId: req.user._id,
      message,
      portfolio,
    });

    return res.json({ ok: true, application: app });
  } catch (e) {
    // duplicate key => already applied
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Already applied' });
    }
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Apply failed' });
  }
});

/**
 * OWNER/ADMIN: List applications of a job
 * GET /api/v1/jobs/:id/applications
 */
router.get('/v1/jobs/:id/applications', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: 'Invalid job id' });
    }

    const job = await Job.findById(id).lean();
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    // فقط ادمین یا صاحب آگهی می‌تواند ببیند
    const isOwner = String(job.clientId) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ ok: false, message: 'اجازه دسترسی ندارید' });
    }

    const apps = await Application.find({ jobId: id }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, applications: apps });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Fetch applications failed' });
  }
});

export default router;
