import mongoose from 'mongoose';

const studySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image_rating_prompt: { type: String, default: '' },
    image_rating_card_pool: { type: [String], default: [] },
    image_rating_tasks: {
      type: [
        new mongoose.Schema(
          {
            task_id: { type: String, required: true },
            type: {
              type: String,
              enum: ['image_impression', 'image_questions', 'image_compare', 'image_dislike_mark'],
              required: true,
            },
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            duration_sec: { type: Number, default: 5 },
            image_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ImageAsset' }],
            cards: [{ type: String }],
            max_select: { type: Number, default: 5 },
            questions: [{ type: String }],
            max_marks: { type: Number, default: 3 },
            order_index: { type: Number, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    profile_cards_source_study_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Study',
      default: null,
    },
    inherit_profile_cards: { type: Boolean, default: false },
    inherit_user_profile_points: { type: Boolean, default: false },
    ask_demographics_again: { type: Boolean, default: false },
    ask_key_points_again: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['questionnaire', 'card_sort', 'image_rating', 'task_work', 'mixed'],
      default: 'mixed',
      index: true,
    },
    version: { type: Number, default: 1 },
    is_active: { type: Boolean, default: true, index: true },
    assign_to_all_users: { type: Boolean, default: false, index: true },
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
