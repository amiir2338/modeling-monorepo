import mongoose from 'mongoose';

const ModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    height: { type: Number, default: null },        // قد (سانتی‌متر)
    size: { type: String, default: null },          // سایزبندی یا مقیاس دلخواه (مثلاً 38-40)
    city: { type: String, default: null },
    instagram: { type: String, default: null },

    // فیلدهای پایه برای توسعه‌های بعدی
    bio: { type: String, default: null },           // توضیح کوتاه
    skills: { type: [String], default: [] },        // مهارت‌ها (ژست، فیتنس، رانوی و…)
    photos: { type: [String], default: [] },        // آدرس تصاویر نمونه‌کار
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true } // createdAt, updatedAt خودکار
);

// ایندکس ساده برای سرچ نام و شهر
ModelSchema.index({ name: 'text', city: 'text' });

const Model = mongoose.model('Model', ModelSchema);
export default Model;
