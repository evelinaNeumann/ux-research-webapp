import mongoose from 'mongoose';

const taskResponseSchema = new mongoose.Schema(
  {
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchTask', required: true, index: true },
    step_index: { type: Number, default: 0, index: true },
    selected_ids: { type: [String], default: [] },
    is_correct: { type: Boolean, default: false },
    result_status: { type: String, enum: ['correct', 'incorrect'], default: 'incorrect' },
    timed_out: { type: Boolean, default: false },
    timeout_note: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

taskResponseSchema.index({ session_id: 1, task_id: 1, step_index: 1 }, { unique: true });
taskResponseSchema.index({ study_id: 1, user_id: 1, updated_at: -1 });

export const TaskResponse = mongoose.model('TaskResponse', taskResponseSchema);
