import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    password_reset_requested_at: { type: Date, default: null },
    password_reset_status: { type: String, enum: ['none', 'pending', 'approved'], default: 'none', index: true },
    password_reset_required: { type: Boolean, default: false },
    privacy_notice_version_acknowledged: { type: String, default: '' },
    privacy_notice_acknowledged_at: { type: Date, default: null },
    privacy_policy_revision_acknowledged: { type: Number, default: 0 },
    study_data_consent_version: { type: String, default: '' },
    study_data_consent_at: { type: Date, default: null },
    study_data_consent_revision_acknowledged: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const User = mongoose.model('User', userSchema);
