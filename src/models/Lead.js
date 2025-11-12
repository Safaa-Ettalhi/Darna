import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'closed'],
      default: 'new',
    },
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatThread' },
    lastInteractionAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ property: 1, buyer: 1 }, { unique: true });

export default mongoose.model('Lead', leadSchema);

