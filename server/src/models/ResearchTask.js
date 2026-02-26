import mongoose from 'mongoose';

const researchTaskSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    page_node_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PageTreeNode', default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    task_type: {
      type: String,
      enum: ['instruction', 'question_block', 'cardsort_block', 'image_block', 'mixed'],
      required: true,
    },
    config: { type: Object, default: {} },
    order_index: { type: Number, default: 0 },
    is_required: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  { versionKey: false }
);

researchTaskSchema.index({ study_id: 1, page_node_id: 1, order_index: 1 });

export const ResearchTask = mongoose.model('ResearchTask', researchTaskSchema);
