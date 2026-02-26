import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    study_version: { type: Number, required: true },
    module_type: { type: String, default: 'mixed' },
    status: { type: String, enum: ['in_progress', 'done'], default: 'in_progress', index: true },
    current_module: { type: String, default: 'questionnaire' },
    started_at: { type: Date, default: Date.now },
    completed_at: { type: Date, default: null },
    duration_seconds: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true }, versionKey: false }
);

sessionSchema.index({ study_id: 1, user_id: 1, completed_at: -1 });

export const Session = mongoose.model('Session', sessionSchema);
