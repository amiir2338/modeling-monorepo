// src/models/thread.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const ThreadSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    // دقیقا 2 نفر: Model و Client-owner
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2,
        message: 'Thread must have exactly 2 participants',
      },
      required: true,
    },
    // برای رندر سریع لیست
    lastMessage: {
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, maxlength: 5000, default: '' },
      at: { type: Date },
    },
    lastMessageAt: { type: Date, default: null },

    // برای unread-count سریع: آی‌دی کاربرانی که پیام خوانده‌نشده دارند
    unreadBy: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { timestamps: true }
);

// یک Thread به‌ازای هر Application
ThreadSchema.index({ applicationId: 1 }, { unique: true });
// لیست گفتگوهای کاربر بر حسب آخرین پیام
ThreadSchema.index({ participants: 1, lastMessageAt: -1 });
ThreadSchema.index({ lastMessageAt: -1 });

ThreadSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  obj.id = obj._id;
  delete obj.__v;
  return obj;
};

export default mongoose.model('Thread', ThreadSchema);
