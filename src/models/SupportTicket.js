import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ['billing', 'properties', 'tirelire', 'tech', 'other'],
      default: 'other',
    },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responses: [responseSchema],
  },
  { timestamps: true }
);

export default mongoose.model('SupportTicket', supportTicketSchema);

