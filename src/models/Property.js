import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    transactionType: {
      type: String,
      required: true,
      enum: ['sale', 'daily_rent', 'monthly_rent', 'seasonal_rent'],
    },
    price: { type: Number, required: true },
    pricePerDay: { type: Number },
    availability: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    address: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    surface: { type: Number, required: true },
    rooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    amenities: [{ type: String }],
    internalRules: [{ type: String }],
    energyDiagnostics: { type: String },
    status: {
      type: String,
      enum: ['draft', 'published', 'pending_moderation', 'rejected', 'archived'],
      default: 'pending_moderation',
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    media: [
      {
        type: {
          type: String,
          enum: ['image', 'video'],
          default: 'image',
        },
        url: { type: String, required: true },
        thumbnailUrl: { type: String },
      },
    ],
    priorityScore: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    leadsCount: { type: Number, default: 0 },
    moderation: {
      reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      note: { type: String },
      reviewedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

propertySchema.index({ location: '2dsphere' });
propertySchema.index({ status: 1, priorityScore: -1, createdAt: -1 });

export default mongoose.model('Property', propertySchema);
