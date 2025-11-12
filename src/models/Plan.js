import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
    name: {
        type: String, required: true, enum: ['gratuit', 'pro', 'premium']
    },
    price: {
        type: Number,required: true,default: 0
    },
    duration: {
        type: String, required: true, enum: ['monthly', 'yearly']
    },
    maxProperties: {
        type: Number, required: true, default: 1
    },
    priority: {
        type: Number, required: true, default: 1
    },
    features: {
        type: [String], default: []
    },
    isActive: {
        type: Boolean, default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Plan', planSchema);
