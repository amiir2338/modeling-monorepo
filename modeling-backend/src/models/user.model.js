import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    // ایمیل برای لاگین
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },

    // هش پسورد اینجا ذخیره میشه (نه پسورد خام)
    password: { type: String, required: true },

    // نقش‌ها: مدل، کارفرما یا ادمین
    role: { type: String, enum: ['model', 'client', 'admin'], default: 'model' },

    // نام نمایشی اختیاری
    name: { type: String, default: null },

    // نمایش آواتار
    avatar: { type: String, default: null },


    // ارتباط اختیاری به پروفایل مدل/کارفرما برای بعداً
    modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Model', default: null },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// ایندکس برای جستجوی ایمیل
UserSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
export default User;
