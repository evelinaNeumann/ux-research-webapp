import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    label: { type: String, required: true },
    description: String,
    version: { type: Number, default: 1 },
  },
  { versionKey: false }
);

cardSchema.index({ study_id: 1, version: -1 });

export const Card = mongoose.model('Card', cardSchema);
