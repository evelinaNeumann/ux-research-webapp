import mongoose from 'mongoose';

const cardSortColumnSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    label: { type: String, required: true },
    order_index: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { versionKey: false }
);

cardSortColumnSchema.index({ study_id: 1, order_index: 1 });

export const CardSortColumn = mongoose.model('CardSortColumn', cardSortColumnSchema);
