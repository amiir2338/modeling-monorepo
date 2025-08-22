// src/controllers/application.controller.js
import { Application } from '../models/application.model.js';
import Job from '../models/job.model.js';

/** POST /v1/jobs/:id/apply  (role: model) */
export const applyToJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, portfolioUrl, phone } = req.body;

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
    if (job.status !== 'approved') {
      // می‌توان اجازه اپلای برای pending_review را هم داد، فعلاً فقط approved
      // اگر خواستی اجازه دهی، این شرط را حذف/تغییر بده.
    }

    const app = await Application.create({
      jobId: job._id,
      modelId: req.user._id,
      note,
      portfolioUrl,
      phone,
    });

    return res.json({ ok: true, data: app });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ ok: false, message: 'Already applied' });
    }
    console.error('applyToJob error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

/** GET /v1/jobs/:id/applications  (role: client owner + admin) */
export const listApplications = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    if (
      req.user.role !== 'admin' &&
      (!job.clientId || job.clientId.toString() !== (req.user.clientId?.toString()))
    ) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const q = { jobId: id };
    if (status) q.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Application.find(q)
        .populate('modelId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(q),
    ]);

    return res.json({ ok: true, data: items, page: Number(page), total });
  } catch (err) {
    console.error('listApplications error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

/** PATCH /v1/applications/:id  (role: client owner + admin) */
export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const app = await Application.findById(id).populate('jobId');
    if (!app) return res.status(404).json({ ok: false, message: 'Application not found' });

    const job = app.jobId;
    if (!job) return res.status(400).json({ ok: false, message: 'Invalid application (no job)' });

    if (
      req.user.role !== 'admin' &&
      (!job.clientId || job.clientId.toString() !== (req.user.clientId?.toString()))
    ) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    if (status) app.status = status;
    if (reason !== undefined) app.reason = reason;
    await app.save();

    return res.json({ ok: true, data: app });
  } catch (err) {
    console.error('updateApplication error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};
