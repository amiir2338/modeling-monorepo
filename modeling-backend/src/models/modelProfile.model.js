// src/models/modelProfile.model.js
import mongoose from 'mongoose';

const ModelProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    bio: { type: String, maxlength: 1000 },
    height: { type: Number, min: 0, max: 300 },
    weight: { type: Number, min: 0, max: 500 },
    city: { type: String, maxlength: 100 },
    skills: { type: [String], default: [] },
    socialLinks: {
      instagram: { type: String },
      tiktok: { type: String },
      website: { type: String },
    },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

// useful indexes
ModelProfileSchema.index({ city: 1 });
ModelProfileSchema.index({ skills: 1 });
// text search for 'q'
ModelProfileSchema.index({ bio: 'text', city: 'text', skills: 'text' });

export const ModelProfile = mongoose.model('ModelProfile', ModelProfileSchema);
