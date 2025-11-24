import mongoose from 'mongoose';

const chatThreadSchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true, required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    lastMessageAt: { type: Date, default: Date.now },
    hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  {
    timestamps: true,
  }
);

chatThreadSchema.index({ property: 1, participants: 1 });

export default mongoose.model('ChatThread', chatThreadSchema);

