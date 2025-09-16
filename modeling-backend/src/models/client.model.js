// src/models/client.model.js
// 🟢 «خیلی ساده بگم»: این فایل نقشهٔ جدولِ کلاینت‌ها توی مونگوسه.
// 🟢 کاری که کردیم تا همه‌چیز تمیزتر باشه:
//    1) رشته‌ها trim می‌شن (فاصله‌های اضافی حذف)
//    2) ایمیل lowercase + trim ذخیره می‌شه (جست‌وجو و یکپارچگی بهتر)
//    3) خروجی JSON تمیزه: به‌جای _id، id برمی‌گرده و __v حذف می‌شه
//    4) ایندکس متنی روی name/company/city برای سرچ سریع‌تر

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ClientSchema = new Schema(
  {
    // 🟢 نام کلاینت (اجباری)
    name: { type: String, required: true, trim: true },

    // 🟢 فیلدهای اختیاری + trim
    company: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    phone: { type: String, default: null, trim: true },

    // 🟢 ایمیل اختیاری → lowercase + trim
    email: { type: String, default: null, lowercase: true, trim: true },

    // 🟢 لینک اینستاگرام اختیاری
    instagram: { type: String, default: null, trim: true },

    // 🟢 وضعیت فعال/غیرفعال
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,

    // 🟢 خروجی JSON/Object تمیز: id بده، _id/__v رو حذف کن
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString?.();
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString?.();
        delete ret._id;
        return ret;
      },
    },
  }
);

// 🟢 ایندکس متنی برای جست‌وجوی سریع روی name/company/city
ClientSchema.index({ name: 'text', company: 'text', city: 'text' });

// 🟢 اگر خواستی ایمیل یکتا باشه، این ایندکس رو باز کن:
// ClientSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

const Client = model('Client', ClientSchema);
export default Client;
