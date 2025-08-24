// src/services/notification.service.js
import Notification from '../models/notification.model.js';
import Job from '../models/job.model.js';
import User from '../models/user.model.js';

/** Feature flag: اگر نخواهی نوتیف فعال باشد: NOTIFICATIONS_ENABLED=0 */
function notifEnabled() {
  const v = process.env.NOTIFICATIONS_ENABLED;
  return v === undefined || v === null || v === '' || v === '1' || v === 'true';
}

/**
 * ساخت یک نوتیف ساده برای یک کاربر
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} type - 'job_applied' | 'application_updated' | 'message' | ...
 * @param {object} data - payload سبک جهت نمایش/لینک‌دهی
 */
export async function notify(userId, type, data = {}) {
  if (!notifEnabled()) return null;
  try {
    if (!userId || !type) return null;

    // مطمئن شو data همیشه یک Object است (نه آرایه/مقدار ساده)
    const payload =
      data && typeof data === 'object' && !Array.isArray(data) ? data : { value: data };

    const doc = await Notification.create({
      userId,
      type,
      data: payload,
      read: false,
    });
    return doc;
  } catch (err) {
    console.error('[notify] error:', err?.message || err);
    return null;
  }
}

/** نگاشت clientId (پروفایل) → User._id مالک */
async function findOwnerUserIdByClientId(clientId) {
  try {
    if (!clientId) return null;
    const owner = await User.findOne({ clientId }).select('_id').lean();
    return owner?._id ?? null;
  } catch (e) {
    console.error('[findOwnerUserIdByClientId] error:', e?.message || e);
    return null;
  }
}

/**
 * بعد از Apply شدن یک اپلیکیشن — نوتیف به **کاربرِ** مالک Job
 * می‌تواند job یا jobId یا فقط application داشته باشد (تابع کمبود را جبران می‌کند)
 * @param {Object} p
 * @param {Object} [p.job]
 * @param {string|import('mongoose').Types.ObjectId} [p.jobId]
 * @param {Object} p.application
 */
export async function onJobApplied({ job, jobId, application }) {
  if (!notifEnabled()) return null;
  try {
    let _job = job || null;

    // اگر job نداریم یا clientId خالی است، سعی کن از DB بیاری
    if (!_job?.clientId) {
      const idToLoad = jobId || application?.jobId;
      if (idToLoad) {
        try {
          _job = await Job.findById(idToLoad).select('clientId title');
        } catch (e) {
          console.error('[onJobApplied] find job error:', e?.message || e);
        }
      }
    }

    if (!_job?.clientId) {
      // گیرنده نامشخص؛ جریان اصلی را متوقف نکن
      return null;
    }

    // clientId → ownerUserId (User._id)
    const ownerUserId = await findOwnerUserIdByClientId(_job.clientId);
    if (!ownerUserId) return null;

    return await notify(ownerUserId, 'job_applied', {
      jobId: _job._id,
      jobTitle: _job.title || '',
      applicationId: application?._id,
      modelUserId: application?.modelUserId ?? application?.modelId ?? null,
    });
  } catch (err) {
    console.error('[onJobApplied] error:', err?.message || err);
    return null;
  }
}

/**
 * بعد از به‌روزرسانی وضعیت اپلیکیشن — نوتیف به Model
 * @param {Object} p
 * @param {Object} p.application - باید modelUserId یا modelId داشته باشد
 * @param {String} p.newStatus
 * @param {String} [p.reason]
 */
export async function onApplicationUpdated({ application, newStatus, reason }) {
  if (!notifEnabled()) return null;
  try {
    const modelSide = application?.modelUserId ?? application?.modelId ?? null;
    if (!modelSide) return null;

    return await notify(modelSide, 'application_updated', {
      applicationId: application?._id,
      newStatus,
      reason: reason ?? null,
    });
  } catch (err) {
    console.error('[onApplicationUpdated] error:', err?.message || err);
    return null;
  }
}

// برای سازگاری اگر جایی import default استفاده شده باشد
export default {
  notify,
  onJobApplied,
  onApplicationUpdated,
};
