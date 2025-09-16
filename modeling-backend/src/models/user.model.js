// src/models/user.model.js
// 🟢 این فایل «نقشهٔ جدول کاربران» در مونگوسه.
// 🟢 اینجا تعریف می‌کنیم چه فیلدهایی داریم و چطور ذخیره/نمایش داده بشن.

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    // 🟢 ایمیل برای لاگین (یکتا، حتماً حروف کوچک و بدون فاصله)
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },

    // 🟢 هشِ پسورد (نه خودِ پسورد). با select:false پیش‌فرض برنگرده تا امن‌تر باشه.
    password: { type: String, required: true, select: false },

    // 🟢 نقش: مدل، کارفرما (کلاینت) یا ادمین
    role: { type: String, enum: ['model', 'client', 'admin'], default: 'model' },

    // 🟢 نام نمایشی اختیاری
    name: { type: String, default: null },

    // 🟢 آواتار اختیاری
    avatar: { type: String, default: null },

    // 🟢 لینک‌های اختیاری به اسناد دیگر (برای آینده)
    modelId: { type: Schema.Types.ObjectId, ref: 'Model', default: null },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },

    // 🟢 وضعیت فعال/غیرفعال
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true, // 🟢 زمان‌های ساخت/به‌روزرسانی را خودکار ذخیره کن
    versionKey: false, // 🟢 __v را حذف کن (اگر دوست داری می‌تونی true هم بگذاری)
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // 🟢 چیزی که به کلاینت برمی‌گردد:
        ret.id = ret._id?.toString?.();
        delete ret._id;
        delete ret.password; // 🟢 پسورد هیچ‌وقت در خروجی JSON نباشد
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString?.();
        delete ret._id;
        delete ret.password;
        return ret;
      },
    },
  }
);

// 🟢 ایندکس یکتا روی ایمیل (اگر قبلاً ساخته شده بود، مونگوس هندل می‌کند)
UserSchema.index({ email: 1 }, { unique: true });

const User = model('User', UserSchema);
export default User;
