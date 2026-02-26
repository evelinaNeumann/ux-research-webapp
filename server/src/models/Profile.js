import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    age_group: String,
    interests: { type: [String], default: [] },
    needs: { type: [String], default: [] },
    test_group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TestGroup' },
  },
  { versionKey: false }
);

profileSchema.index({ test_group_id: 1 });

export const Profile = mongoose.model('Profile', profileSchema);
