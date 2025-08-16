// src/models/job.model.js
import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: Number, default: null },
    city: { type: String, default: null },
    date: { type: String, default: null }, // یا Date اگر خواستی
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'draft',
    },
    draftExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ⚠️ اگر TTL می‌خوای برای پاک‌سازی خودکار درافت‌ها، می‌تونی این ایندکس رو فعال کنی:
// JobSchema.index(
//   { draftExpiresAt: 1 },
//   { expireAfterSeconds: 0, partialFilterExpression: { status: 'draft' } }
// );

const Job = mongoose.model('Job', JobSchema);
export default Job;
