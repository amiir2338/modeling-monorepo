import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, default: null },
    city: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    instagram: { type: String, default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

ClientSchema.index({ name: 'text', company: 'text', city: 'text' });

export default mongoose.model('Client', ClientSchema);
