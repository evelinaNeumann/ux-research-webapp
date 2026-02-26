import mongoose from 'mongoose';

const pageTreeNodeSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PageTreeNode', default: null },
    title: { type: String, required: true },
    node_type: { type: String, enum: ['page', 'section', 'task_container'], required: true },
    order_index: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
  },
  { versionKey: false }
);

pageTreeNodeSchema.index({ study_id: 1, parent_id: 1, order_index: 1 });

export const PageTreeNode = mongoose.model('PageTreeNode', pageTreeNodeSchema);
