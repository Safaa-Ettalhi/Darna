import mongoose from 'mongoose';

const estimationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    input: { type: Object, required: true },
    result: {
      recommendedPrice: Number,
      lowEstimate: Number,
      highEstimate: Number,
      rationale: String,
      provider: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Estimation', estimationSchema);

