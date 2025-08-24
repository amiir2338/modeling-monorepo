// src/models/application.model.js
import mongoose from 'mongoose';

const StatusHistorySchema = new mongoose.Schema(
  {
    to:      { type: String, enum: ['submitted','reviewed','accepted','declined'], required: true },
    reason:  { type: String, default: null },
    at:      { type: Date, default: Date.now },
    by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const ApplicationSchema = new mongoose.Schema(
  {
    jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    modelUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message:      { type: String, default: '' },
    portfolio:    { type: String, default: '' },
    phone:        { type: String, default: '' },
    status:       { type: String, enum: ['submitted','reviewed','accepted','declined'], default: 'submitted' },
    reason:       { type: String, default: null },
    statusHistory:{ type: [StatusHistorySchema], default: [] },
  },
  { timestamps: true }
);

// جلوگیری از اپلای تکراری یک مدل روی یک جاب
ApplicationSchema.index({ jobId: 1, modelUserId: 1 }, { unique: true });

export default mongoose.model('Application', ApplicationSchema);
