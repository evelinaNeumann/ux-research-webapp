import mongoose from 'mongoose';

const studySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    profile_cards_source_study_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Study',
      default: null,
    },
    inherit_profile_cards: { type: Boolean, default: false },
    inherit_user_profile_points: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['questionnaire', 'card_sort', 'image_rating', 'mixed'],
      default: 'mixed',
      index: true,
    },
    version: { type: Number, default: 1 },
    is_active: { type: Boolean, default: true, index: true },
    module_order: {
      type: [String],
      default: ['questionnaire', 'card_sort', 'image_rating'],
    },
    brief_pdf_path: { type: String, default: '' },
    brief_pdf_name: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: true } }
);

export const Study = mongoose.model('Study', studySchema);
