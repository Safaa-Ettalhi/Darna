import mongoose from 'mongoose';

const loanSimulationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    amount: { type: Number, required: true },
    downPayment: { type: Number, default: 0 },
    durationYears: { type: Number, required: true },
    rate: { type: Number, required: true },
    monthlyPayment: { type: Number, required: true },
    totalInterest: { type: Number, required: true },
    bankOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'BankOffer' },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('LoanSimulation', loanSimulationSchema);

