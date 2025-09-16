// src/routes/jobs.route.js
import { Router } from 'express';
import mongoose from 'mongoose';
import Job from '../models/job.model.js';
import User from '../models/user.model.js';
import { notify } from '../services/notification.service.js';
import { authRequired, optionalAuth, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

/* 🟢 ELI5 (خیلی ساده):
   - این فایل تمام مسیرهای آگهی‌ها (Jobs) را پیاده‌سازی می‌کند.
   - همیشه خروجی JSON به شکل { ok: true/false, ... } می‌دهیم که با فرانت هماهنگ باشد.
   - در هر catch یک لاگ کامل می‌نویسیم تا اگر ارور 500 بود، بفهمیم دقیقاً کجاست. */
function logRouteError(tag, err, req) {
  // لاگ مفصل برای یافتن سریع ریشه‌ی خطا
  console.error(`[jobs.route:${tag}]`, {
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
    body: req.body,
    // پیام و استک
    error: { message: err?.message, stack: err?.stack },
  });
}

function asDateOrNull(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

// آیا کاربر فعلی می‌تواند این آگهی را ویرایش کند؟
function canEditJob(req, job) {
  if (!req?.user || !job) return false;
  const isAdmin = req.user.role === 'admin';
  const ownerId = req.user.clientId || req.user._id;
  const isOwner = job.clientId && String(job.clientId) === String(ownerId);
  return isAdmin || isOwner;
}

// اعمال پچ امن روی فیلدهای قابل‌ویرایش
function applyJobPatch(job, body = {}) {
  if (body.title !== undefined) job.title = String(body.title || '').trim();
  if (body.description !== undefined) job.description = String(body.description || '').trim();
  if (body.budget !== undefined) {
    const b = Number(body.budget);
    job.budget = Number.isFinite(b) ? b : null;
  }
  if (body.city !== undefined) job.city = body.city ? String(body.city) : null;
  if (body.date !== undefined) job.date = asDateOrNull(body.date);
}

/* GET /api/v1/jobs
   عمومی: فقط approved
   ?mine=1 → فقط آگهی‌های کاربر (نیاز به لاگین)
   ?q=متن → فیلتر عنوان (Regex)
   ?city=Tehran → فیلتر شهر
   صفحه‌بندی: ?page=1&limit=20
*/
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const mine = String(req.query.mine || '') === '1';
    const q = {};

    if (req.query.q) q.title = { $regex: String(req.query.q), $options: 'i' };
    if (req.query.city) q.city = String(req.query.city);

    if (mine) {
      if (!req.user?.clientId && !req.user?._id) {
        return res.status(401).json({ ok: false, message: 'Unauthorized' });
      }
      q.clientId = req.user.clientId || req.user._id;
    } else {
      q.status = 'approved';
    }

    const [jobs, total] = await Promise.all([
      Job.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(q),
    ]);

    return res.json({ ok: true, jobs, page, limit, total });
  } catch (err) {
    logRouteError('LIST', err, req);
    next(err);
  }
});

/* GET /api/v1/jobs/my  ← شورتکات mine=1 */
router.get('/my', authRequired, requireRoles('client', 'admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const ownerId = req.user.clientId || req.user._id;

    const [jobs, total] = await Promise.all([
      Job.find({ clientId: ownerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments({ clientId: ownerId }),
    ]);

    return res.json({ ok: true, jobs, page, limit, total });
  } catch (err) {
    logRouteError('LIST_MY', err, req);
    next(err);
  }
});

/* GET /api/v1/jobs/:id
   - اگر approved باشد همه می‌بینند
   - اگر owner/admin باشد همه وضعیت‌ها را می‌بیند
*/
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
    logRouteError('GET_ONE', err, req);
    next(err);
  }
});

/* POST /api/v1/jobs  ← ساخت آگهی (client/admin) */
router.post('/', authRequired, requireRoles('client', 'admin'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const u = req.user || {};
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
      date: asDateOrNull(body.date),
      status: 'draft',
      draftExpiresAt: null,
    });

    await job.save();

    return res.status(201).json({ ok: true, job });
  } catch (err) {
    logRouteError('CREATE', err, req);
    next(err);
  }
});

/* PATCH /api/v1/jobs/:id  ← ویرایش (owner/admin) */
router.patch('/:id', authRequired, requireRoles('client', 'admin'), async (req, res, next) => {
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
    logRouteError('PATCH', err, req);
    next(err);
  }
});

/* POST /api/v1/jobs/:id/submit  ← ارسال برای بررسی */
router.post('/:id/submit', authRequired, requireRoles('client', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    if (!canEditJob(req, job)) return res.status(403).json({ ok: false, message: 'Forbidden' });

    if (!req.body?.termsAccepted) {
      return res.status(400).json({ ok: false, message: 'termsAccepted is required' });
    }
    if (!['draft', 'rejected'].includes(job.status)) {
      return res.status(400).json({ ok: false, message: `Cannot submit from status '${job.status}'` });
    }

    const complete =
      !!job.title &&
      !!job.description &&
      !!job.city &&
      !!job.date &&
      typeof job.budget === 'number';

    if (!complete) {
      return res.status(422).json({ ok: false, message: 'فیلدهای ضروری برای ارسال ناقص هستند' });
    }

    job.status = 'pending_review';
    await job.save();
    return res.json({ ok: true, job });
  } catch (err) {
    logRouteError('SUBMIT', err, req);
    next(err);
  }
});

/* PATCH /api/v1/jobs/:id/approve  ← فقط ادمین + نوتیف */
router.patch('/:id/approve', authRequired, requireRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
    if (job.status !== 'pending_review') {
      return res.status(400).json({ ok: false, message: `Cannot approve from status '${job.status}'` });
    }

    job.status = 'approved';
    await job.save();

    try {
      const ownerUser = await User.findOne({ clientId: job.clientId }).lean();
      if (ownerUser?._id) {
        await notify(ownerUser._id, 'job_approved', { jobId: String(job._id), title: job.title || '' });
      }
    } catch (e) {
      console.warn('[jobs.route:APPROVE] notify warn:', e?.message);
    }

    return res.json({ ok: true, job });
  } catch (err) {
    logRouteError('APPROVE', err, req);
    next(err);
  }
});

/* PATCH /api/v1/jobs/:id/reject  ← فقط ادمین + نوتیف */
router.patch('/:id/reject', authRequired, requireRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
    if (job.status !== 'pending_review') {
      return res.status(400).json({ ok: false, message: `Cannot reject from status '${job.status}'` });
    }

    job.status = 'rejected';
    await job.save();

    try {
      const ownerUser = await User.findOne({ clientId: job.clientId }).lean();
      if (ownerUser?._id) {
        await notify(ownerUser._id, 'job_rejected', { jobId: String(job._id), title: job.title || '' });
      }
    } catch (e) {
      console.warn('[jobs.route:REJECT] notify warn:', e?.message);
    }

    return res.json({ ok: true, job });
  } catch (err) {
    logRouteError('REJECT', err, req);
    next(err);
  }
});

/* DELETE /api/v1/jobs/:id  ← حذف (owner/admin) */
router.delete('/:id', authRequired, requireRoles('client', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });

    if (!canEditJob(req, job)) return res.status(403).json({ ok: false, message: 'Forbidden' });

    await job.deleteOne();
    return res.status(204).end();
  } catch (err) {
    logRouteError('DELETE', err, req);
    next(err);
  }
});

export default router;
