import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    response: { type: mongoose.Schema.Types.Mixed, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

answerSchema.index({ study_id: 1, user_id: 1, created_at: -1 });

export const Answer = mongoose.model('Answer', answerSchema);
