// src/models/application.model.js
import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema(
  {
    jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    modelUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message:      { type: String, default: '' },
    portfolio:    { type: String, default: '' },
    status:       { type: String, enum: ['submitted','reviewed','accepted','declined'], default: 'submitted' },
  },
  { timestamps: true }
);

// جلوگیری از اپلای تکراری یک مدل روی یک جاب
ApplicationSchema.index({ jobId: 1, modelUserId: 1 }, { unique: true });

export default mongoose.model('Application', ApplicationSchema);
