import mongoose from 'mongoose';

const imageTaskResponseSchema = new mongoose.Schema(
  {
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    task_id: { type: String, required: true, index: true },
    task_type: {
      type: String,
      enum: ['image_impression', 'image_questions', 'image_compare', 'image_dislike_mark'],
      required: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    timed_out: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

imageTaskResponseSchema.index({ session_id: 1, task_id: 1 }, { unique: true });

export const ImageTaskResponse = mongoose.model('ImageTaskResponse', imageTaskResponseSchema);

