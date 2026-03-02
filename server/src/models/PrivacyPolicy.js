import mongoose from 'mongoose';

const privacyPolicySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, default: 'default' },
    version: { type: String, required: true, trim: true, default: '1.0' },
    date: { type: String, required: true, trim: true, default: '02.03.2026' },
    text: { type: String, required: true },
    privacy_ack_label: { type: String, required: true },
    study_consent_label: { type: String, required: true },
    revision: { type: Number, required: true, default: 1, min: 1 },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const PrivacyPolicy = mongoose.model('PrivacyPolicy', privacyPolicySchema);
