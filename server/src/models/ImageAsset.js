import mongoose from 'mongoose';

const imageAssetSchema = new mongoose.Schema(
  {
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    path: { type: String, required: true },
    alt_text: String,
    category: String,
    version: { type: Number, default: 1 },
    uploaded_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

imageAssetSchema.index({ study_id: 1, version: -1 });

export const ImageAsset = mongoose.model('ImageAsset', imageAssetSchema);
