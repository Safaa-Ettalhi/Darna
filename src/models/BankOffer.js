import mongoose from 'mongoose';

const bankOfferSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    rate: { type: Number, required: true }, // annual rate in %
    durationYears: { type: Number, required: true },
    maxAmount: { type: Number, required: true },
    fees: { type: Number, default: 0 },
    contactEmail: { type: String },
    partner: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('BankOffer', bankOfferSchema);

