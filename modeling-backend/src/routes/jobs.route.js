// src/routes/jobs.route.js
import { Router } from 'express';
import {
  listJobs,
  listMyJobs,        // ← استفاده می‌کنیم
  getJobById,
  createJob,
  updateJob,
  removeJob,
  approveJob,
  rejectJob,
  submitJob,
} from '../controllers/job.controller.js';
import { authRequired, optionalAuth, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * لیست آگهی‌ها
 * - عمومی: فقط approved
 * - مالک (client): با ?mine=1 آگهی‌های خودش (هر وضعیت) — نیاز به توکن اختیاری
 * - ادمین: می‌تواند همه را ببیند/فیلتر کند
 */
router.get('/', optionalAuth, listJobs);

/**
 * آگهی‌های من (همه وضعیت‌ها) — فقط لاگین
 * ⚠️ باید قبل از '/:id' ثبت شود تا با شناسه اشتباه match نشود.
 */
router.get('/my', authRequired, listMyJobs);

/**
 * جزئیات آگهی
 * عمومی است؛ ولی اگر توکن باشد (owner/admin)، بتواند pending/rejected را ببیند.
 */
router.get('/:id', optionalAuth, getJobById);

/**
 * ساخت — فقط client یا admin
 */
router.post('/', authRequired, requireRoles('client', 'admin'), createJob);

/**
 * ویرایش — فقط owner یا admin
 */
router.patch('/:id', authRequired, requireRoles('client', 'admin'), updateJob);

/**
 * ارسال برای بررسی — فقط owner یا admin
 * POST /api/v1/jobs/:id/submit  body: { termsAccepted: true }
 */
router.post('/:id/submit', authRequired, requireRoles('client', 'admin'), submitJob);

/**
 * تایید/رد — فقط admin
 */
router.patch('/:id/approve', authRequired, requireRoles('admin'), approveJob);
router.patch('/:id/reject',  authRequired, requireRoles('admin'), rejectJob);

/**
 * حذف — فقط owner یا admin
 */
router.delete('/:id', authRequired, requireRoles('client', 'admin'), removeJob);

export default router;
