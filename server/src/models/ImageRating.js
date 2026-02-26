import mongoose from 'mongoose';

const imageRatingSchema = new mongoose.Schema(
  {
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    image_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageAsset', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, default: '' },
    recall_answer: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

imageRatingSchema.index({ study_id: 1, user_id: 1, created_at: -1 });

export const ImageRating = mongoose.model('ImageRating', imageRatingSchema);
