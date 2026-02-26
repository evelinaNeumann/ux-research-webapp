import mongoose from 'mongoose';

const AGE_RANGES = ['15-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80'];
const ROLE_CATEGORIES = ['schueler_azubi_student', 'angestellter_fachabteilung', 'leitende_position', 'other'];

const userStudyProfileSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, index: true },
    age_range: { type: String, enum: AGE_RANGES, required: true },
    role_category: { type: String, enum: ROLE_CATEGORIES, required: true },
    role_custom: { type: String, default: '' },
    key_points: { type: [String], default: [] },
    completed_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

userStudyProfileSchema.index({ user_id: 1, study_id: 1 }, { unique: true });

export const UserStudyProfile = mongoose.model('UserStudyProfile', userStudyProfileSchema);
export const USER_PROFILE_AGE_RANGES = AGE_RANGES;
export const USER_PROFILE_ROLE_CATEGORIES = ROLE_CATEGORIES;
