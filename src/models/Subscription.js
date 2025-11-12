import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
    },
    plan: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true
    },
    status: {
        type: String, enum: ['active', 'cancelled', 'expired', 'pending_renewal'], default: 'active'
    },
    startDate: {
        type: Date, default: Date.now
    },
    endDate: {
        type: Date, required: true
    },
    autoRenew: {
        type: Boolean, default: true
    },
    renewalAttempts: { type: Number, default: 0 },
    lastRenewalAt: { type: Date },
    lastRenewalError: { type: String },
    renewalSessionUrl: { type: String }
}, {
    timestamps: true
});

export default mongoose.model('Subscription', subscriptionSchema);
