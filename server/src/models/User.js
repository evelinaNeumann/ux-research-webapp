import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    password_reset_requested_at: { type: Date, default: null },
    password_reset_status: { type: String, enum: ['none', 'pending', 'approved'], default: 'none', index: true },
    password_reset_required: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const User = mongoose.model('User', userSchema);
