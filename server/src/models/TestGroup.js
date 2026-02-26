import mongoose from 'mongoose';

const testGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    criteria: { type: Object, default: {} },
  },
  { versionKey: false }
);

export const TestGroup = mongoose.model('TestGroup', testGroupSchema);
