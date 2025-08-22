// src/models/clientProfile.model.js
import mongoose from 'mongoose';

const ClientProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    companyName: { type: String, maxlength: 200 },
    website: { type: String, maxlength: 300 },
    bio: { type: String, maxlength: 1000 },
    logoUrl: { type: String },
    city: { type: String, maxlength: 100 },
  },
  { timestamps: true }
);

ClientProfileSchema.index({ city: 1 });
ClientProfileSchema.index({ companyName: 'text', bio: 'text', city: 'text' });

export const ClientProfile = mongoose.model('ClientProfile', ClientProfileSchema);
