import mongoose from 'mongoose';

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    scope_type: { type: String, enum: ['user', 'study'], required: true },
    scope_id: { type: String, required: true },
    filters: { type: Object, default: {} },
    chart_type: { type: String, required: true },
    payload: { type: Object, required: true },
    generated_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

analyticsSnapshotSchema.index({ scope_type: 1, scope_id: 1, generated_at: -1 });

export const AnalyticsSnapshot = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
