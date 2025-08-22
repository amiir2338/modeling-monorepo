// src/routes/jobs.moderation.route.js
import { Router } from 'express';
import mongoose from 'mongoose';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';
import Job from '../models/job.model.js';

const router = Router();

// Approve a job (admin only)
router.post('/:id/approve', authRequired, requireRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: 'Invalid job id' });
    }
    const job = await Job.findByIdAndUpdate(
      id,
      { $set: { status: 'approved', draftExpiresAt: null } },
      { new: true }
    );
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
    return res.json({ ok: true, job });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Approve failed' });
  }
});

// Reject a job (admin only)
router.post('/:id/reject', authRequired, requireRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Not specified' } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: 'Invalid job id' });
    }
    const job = await Job.findByIdAndUpdate(
      id,
      { $set: { status: 'rejected', rejectReason: reason } },
      { new: true }
    );
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
    return res.json({ ok: true, job });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Reject failed' });
  }
});

export default router;
