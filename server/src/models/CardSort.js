import mongoose from 'mongoose';

const cardSortSchema = new mongoose.Schema(
  {
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    card_groups: {
      type: [
        {
          group_name: { type: String, required: true },
          card_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
        },
      ],
      default: [],
    },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

cardSortSchema.index({ study_id: 1, user_id: 1, created_at: -1 });

export const CardSort = mongoose.model('CardSort', cardSortSchema);
