// src/helpers/notify.js
import Notification from '../models/notification.model.js';

/**
 * ساخت نوتیف به‌صورت امن (خطا باعث fail اکشن اصلی نمی‌شود)
 * @param {{ userId: string, type: string, data?: any }} param0
 */
export async function notifySafe({ userId, type, data }) {
  try {
    if (!userId) return;
    await Notification.create({ userId, type, data });
  } catch (e) {
    // عمداً soft-fail، لاگ برای دیباگ
    console.warn('notifySafe failed:', { type, userId, err: e?.message });
  }
}
