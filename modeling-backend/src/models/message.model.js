// src/models/message.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * ضمیمه‌های پیام (اختیاری)
 */
const AttachmentSchema = new Schema(
  {
    name: { type: String, maxlength: 255 },
    url: { type: String, maxlength: 2048 },
    mime: { type: String, maxlength: 255 },
    size: { type: Number, min: 0 }, // bytes
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    // الزامی: پیام باید داخل یک Thread باشد
    threadId: { type: Schema.Types.ObjectId, ref: 'Thread', required: true },

    // برای کوئری سریع پیام‌های یک اپلیکیشن
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },

    /**
     * فرستنده و گیرنده
     * نکتهٔ مهم: برای سازگاری با کد قدیمی، alias گذاشته شده:
     *  - senderId  <-> fromUserId
     *  - recipientId <-> toUserId
     * یعنی اگر جایی از کد قدیمی از fromUserId/toUserId استفاده می‌کرد، هنوز کار می‌کند.
     */
    senderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, alias: 'fromUserId' },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', alias: 'toUserId' },

    // متن پیام (الزامی نیست؛ اما یا متن یا حداقل یک ضمیمه باید باشد)
    text: { type: String, default: '', maxlength: 5000 },

    // ضمیمه‌ها (دلخواه)
    attachments: { type: [AttachmentSchema], default: [] },

    // چه کاربرانی این پیام را دیده/خوانده‌اند (خودِ sender به‌صورت اتوماتیک اضافه می‌شود)
    readBy: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: true }
);

/* ===========================
 * ایندکس‌های عملکردی
 * =========================== */
MessageSchema.index({ threadId: 1, createdAt: 1 });
MessageSchema.index({ applicationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

/* ===========================
 * ولیدیشن و نرمال‌سازی قبل از ذخیره
 * =========================== */
MessageSchema.pre('validate', function ensureHasTextOrAttachment(next) {
  const hasText = !!(this.text && typeof this.text === 'string' && this.text.trim().length > 0);
  const hasAttachment = Array.isArray(this.attachments) && this.attachments.length > 0;
  if (!hasText && !hasAttachment) {
    return next(new Error('Message must have text or at least one attachment'));
  }
  return next();
});

MessageSchema.pre('save', function enrichReadBy(next) {
  // مطمئن شو sender داخل readBy هست (خوانده‌شده توسط خودش)
  this.readBy = this.readBy || [];
  const s = String(this.senderId || '');
  if (s && !this.readBy.some((u) => String(u) === s)) {
    this.readBy.push(this.senderId);
  }
  return next();
});

/* ===========================
 * خروجی تمیز JSON
 * =========================== */
MessageSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  obj.id = obj._id;
  delete obj.__v;
  return obj;
};

export default mongoose.model('Message', MessageSchema);
