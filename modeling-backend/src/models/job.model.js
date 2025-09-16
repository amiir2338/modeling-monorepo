import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    // ✅ این باید به Client رفرنس بده چون user.clientId به Client اشاره می‌کند
    clientId: { type: mongoose.Types.ObjectId, ref: 'Client', required: true },

    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: Number, default: null },
    city: { type: String, default: null },

    // ✅ یکدست با روتر: به صورت Date نگه می‌داریم (نه String)
    date: { type: Date, default: null },

    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'draft',
    },

    // برای پاکسازی خودکار درافت‌ها اگر خواستی TTL بگذاری، می‌توانی ایندکس زیر را فعال کنی
    draftExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// // اگر TTL می‌خواهی روی درافت‌ها:
// JobSchema.index(
//   { draftExpiresAt: 1 },
//   { expireAfterSeconds: 0, partialFilterExpression: { status: 'draft' } }
// );

const Job = mongoose.model('Job', JobSchema);
export default Job;
