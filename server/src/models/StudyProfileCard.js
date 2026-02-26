import mongoose from 'mongoose';

const studyProfileCardSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    label: { type: String, required: true },
    order_index: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { versionKey: false }
);

studyProfileCardSchema.index({ study_id: 1, order_index: 1 });

export const StudyProfileCard = mongoose.model('StudyProfileCard', studyProfileCardSchema);
