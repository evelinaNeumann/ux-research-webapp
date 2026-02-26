import mongoose from 'mongoose';

const studyAssignmentSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assigned_at: { type: Date, default: Date.now },
    is_active: { type: Boolean, default: true },
  },
  { versionKey: false }
);

studyAssignmentSchema.index({ study_id: 1, user_id: 1 }, { unique: true });

export const StudyAssignment = mongoose.model('StudyAssignment', studyAssignmentSchema);
