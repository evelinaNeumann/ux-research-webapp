import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ['text_short', 'text_long', 'single_choice', 'multiple_choice', 'likert'],
      required: true,
    },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  { versionKey: false }
);

questionSchema.index({ study_id: 1, version: -1 });

export const Question = mongoose.model('Question', questionSchema);
