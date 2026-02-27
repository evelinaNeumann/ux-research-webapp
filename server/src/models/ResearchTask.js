import mongoose from 'mongoose';

const researchTaskSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    page_node_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PageTreeNode', default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    steps: {
      type: [
        {
          prompt: { type: String, required: true },
          order_index: { type: Number, default: 0 },
          correct_ids: { type: [String], default: [] },
          time_limit_sec: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    task_type: {
      type: String,
      enum: ['instruction', 'question_block', 'cardsort_block', 'image_block', 'mixed'],
      required: true,
    },
    config: { type: Object, default: {} },
    content_format: { type: String, enum: ['none', 'pdf', 'html'], default: 'none' },
    attachment_path: { type: String, default: '' },
    attachment_name: { type: String, default: '' },
    attachment_mime: { type: String, default: '' },
    attachments: {
      type: [
        {
          path: { type: String, required: true },
          name: { type: String, required: true },
          mime: { type: String, default: '' },
          format: { type: String, enum: ['pdf', 'html'], required: true },
          uploaded_at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    order_index: { type: Number, default: 0 },
    is_required: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  { versionKey: false }
);

researchTaskSchema.index({ study_id: 1, page_node_id: 1, order_index: 1 });

export const ResearchTask = mongoose.model('ResearchTask', researchTaskSchema);
