// src/controllers/job.controller.js
import mongoose from 'mongoose';
import Job from '../models/job.model.js';

/* =======================
   Helpers
======================= */
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

/** بررسی دسترسی: مالک یا ادمین */
function canManage(req, job) {
  const u = req.user || {};
  const role = u.role;
  // بسته به میدلورت یکی از این‌ها ست می‌شود
  const userId = u.id || u._id || u.userId || u.user_id || u.uid || u.clientId;
  const isAdmin = role === 'admin';
  const isOwner = userId && String(job.clientId) === String(userId);
  return { isAdmin, isOwner, userId };
}

/** ست‌کردن انقضا فقط هنگام ساخت درافت (نه در آپدیت) */
function setDraftExpiryOnCreate(job) {
  if (job.status === 'draft' && !job.draftExpiresAt) {
    job.draftExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
  }
}

/* =======================
   لیست آگهی‌ها (عمومی/ادمین/ماین)
   GET /api/v1/jobs?page=&limit=&mine=1
======================= */
export const listJobs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const u = req.user || {};
    const role = u.role;
    const userId = u.id || u._id || u.userId || u.user_id || u.uid || u.clientId;

    const mine = String(req.query.mine || '') === '1';
    const city = (req.query.city || '').trim();
    const statusParam = (req.query.status || '').trim();
    const qParam = (req.query.q || '').trim();
    const budgetMin = Number.isFinite(Number(req.query.budgetMin)) ? Number(req.query.budgetMin) : undefined;
    const budgetMax = Number.isFinite(Number(req.query.budgetMax)) ? Number(req.query.budgetMax) : undefined;

    const q = {};

    if (mine && userId) {
      q.clientId = userId;
    } else if (role === 'admin') {
      if (statusParam) q.status = statusParam;
    } else {
      q.status = 'approved';
    }

    if (city) q.city = city;

    if (budgetMin !== undefined || budgetMax !== undefined) {
      q.budget = {};
      if (budgetMin !== undefined) q.budget.$gte = budgetMin;
      if (budgetMax !== undefined) q.budget.$lte = budgetMax;
    }

    if (qParam) {
      q.$or = [
        { title: { $regex: qParam, $options: 'i' } },
        { description: { $regex: qParam, $options: 'i' } },
      ];
    }

    const sortField = ['createdAt', 'budget'].includes(req.query.sort) ? req.query.sort : 'createdAt';
    const sortOrder = (String(req.query.order).toLowerCase() === 'asc') ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const [jobs, total] = await Promise.all([
      Job.find(q).sort(sort).skip(skip).limit(limit),
      Job.countDocuments(q),
    ]);

    return res.json({ jobs, page, limit, total });
  } catch (err) {
    next(err);
  }
};


/* =======================
   آگهی‌های من (همه وضعیت‌ها)
   GET /api/v1/jobs/my
======================= */
export const listMyJobs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const u = req.user || {};
    const userId = u.id || u._id || u.userId || u.user_id || u.uid || u.clientId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const [jobs, total] = await Promise.all([
      Job.find({ clientId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments({ clientId: userId }),
    ]);

    return res.json({ jobs, page, limit, total });
  } catch (err) {
    next(err);
  }
};

/* =======================
   دریافت یک آگهی
   GET /api/v1/jobs/:id
======================= */
export const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const { isAdmin, isOwner } = canManage(req, job);
    if (!isAdmin && !isOwner && job.status !== 'approved') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.json({ job });
  } catch (err) {
    next(err);
  }
};

/* =======================
   ساخت آگهی (پیش‌فرض draft)
   POST /api/v1/jobs
======================= */
export const createJob = async (req, res, next) => {
  try {
    const body = req.body || {};
    const u = req.user || {};
    const clientId =
      body.clientId ||
      u.id || u._id || u.userId || u.user_id || u.uid || u.clientId;

    if (!isObjectId(clientId)) {
      return res.status(400).json({ message: 'clientId is required' });
    }

    const job = new Job({
      clientId,
      title: (body.title || '').trim(),
      description: (body.description || '').trim(),
      budget: typeof body.budget === 'number' ? body.budget : null,
      city: body.city || null,
      date: body.date || null,
      status: body.status || 'draft',
    });

    setDraftExpiryOnCreate(job); // 24ساعت فقط هنگام create
    await job.save();

    return res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
};

/* =======================
   ویرایش آگهی (معمولاً برای draft)
   PATCH /api/v1/jobs/:id
======================= */
export const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const { isAdmin, isOwner } = canManage(req, job);
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Forbidden' });

    const body = req.body || {};
    if (typeof body.title === 'string') job.title = body.title.trim();
    if (typeof body.description === 'string') job.description = body.description.trim();
    if ('budget' in body) job.budget = typeof body.budget === 'number' ? body.budget : null;
    if ('city' in body) job.city = body.city || null;
    if ('date' in body) job.date = body.date || null;

    // اگر خواست draft بماند، فقط ست کن؛ انقضا را تمدید نکن
    if (body.status === 'draft') {
      job.status = 'draft';
      // تمدید نکن: job.draftExpiresAt = job.draftExpiresAt
    }

    await job.save();
    return res.json({ job });
  } catch (err) {
    next(err);
  }
};

/* =======================
   ارسال برای بررسی
   POST /api/v1/jobs/:id/submit   body: { termsAccepted: true }
======================= */
export const submitJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const { termsAccepted } = req.body || {};
    if (!termsAccepted) {
      return res.status(400).json({ message: 'باید شرایط و قوانین را بپذیرید' });
    }

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const { isAdmin, isOwner } = canManage(req, job);
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Forbidden' });

    // حداقل‌های لازم برای ارسال
    const complete =
      !!job.title &&
      !!job.description &&
      !!job.city &&
      !!job.date &&
      typeof job.budget === 'number';

    if (!complete) {
      return res.status(422).json({ message: 'فیلدهای ضروری برای ارسال ناقص هستند' });
    }

    job.status = 'pending_review';
    job.draftExpiresAt = null; // از حالت درافت خارج شد
    await job.save();

    return res.json({ job });
  } catch (err) {
    next(err);
  }
};

/* =======================
   تایید آگهی (ادمین)
   PATCH /api/v1/jobs/:id/approve
======================= */
export const approveJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const u = req.user || {};
    if (u.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    job.status = 'approved';
    job.draftExpiresAt = null;
    await job.save();

    return res.json({ job });
  } catch (err) {
    next(err);
  }
};

/* =======================
   رد آگهی (ادمین)
   PATCH /api/v1/jobs/:id/reject
======================= */
export const rejectJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const u = req.user || {};
    if (u.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    job.status = 'rejected';
    await job.save();

    return res.json({ job });
  } catch (err) {
    next(err);
  }
};

/* =======================
   حذف آگهی
   DELETE /api/v1/jobs/:id
======================= */
export const removeJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const { isAdmin, isOwner } = canManage(req, job);
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Forbidden' });

    await job.deleteOne();
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};
