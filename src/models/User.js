import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: function() { return !this.sso?.googleId; }, minlength: 6, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    accountType: { type: String, enum: ['particulier', 'entreprise'], default: 'particulier' },
    role: { type: String, enum: ['visitor', 'particulier', 'entreprise', 'admin'], default: 'particulier' },
    subscription: {
        plan: { type: String, enum: ['gratuit', 'pro', 'premium'], default: 'gratuit' },
        isActive: { type: Boolean, default: true },
        endDate: Date
    },
    companyInfo: {
        companyName: String,
        siret: String,
        address: {
            street: String,
            city: String,
            postalCode: String,
            country: { type: String, default: 'Maroc' }
        },
        kycVerified: { type: Boolean, default: false },
        kycNote: String,
        kycReviewedAt: Date,
        kycReviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    sso: {
        googleId: String,
        provider: { type: String, enum: ['google'] }
    },
    
    //2FA
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    twoFactorBackupCodes: [String],
    twoFactorBackupCodesUsed: [String],
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true }
        },
        language: { type: String, default: 'fr' }
    },
    stats: {
        propertiesCount: { type: Number, default: 0 },
        viewsCount: { type: Number, default: 0 },
        lastLogin: Date,
        loginCount: { type: Number, default: 0 }
    },
    isActive: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    blockedReason: String,
    parentCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual pour le nom complet
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual pour vérifier l'abonnement
userSchema.virtual('isSubscriptionValid').get(function() {
    if (!this.subscription.isActive) return false;
    if (!this.subscription.endDate) return true;
    return new Date() < this.subscription.endDate;
});

// Hash du mot de passe si il est fourni
userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Vérifier si peut publier 
userSchema.methods.canPublishProperty = function() {
    if (this.isBlocked || !this.isActive) return false;
    if (this.accountType === 'entreprise' && !this.companyInfo.kycVerified) return false;
    return true;
};

// Limites d'abonnement 
userSchema.methods.getSubscriptionLimits = function() {
    const limits = {
        gratuit: { properties: 10, imagesPerProperty: 10 },
        pro: { properties: 30, imagesPerProperty: 20 },
        premium: { properties: -1, imagesPerProperty: -1 }
    };
    return limits[this.subscription.plan] || limits.gratuit;
};

// Nettoyer les données sensibles
userSchema.methods.toSafeObject = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.passwordResetToken;
    delete userObject.passwordResetExpires;
    delete userObject.emailVerificationToken;
    delete userObject.emailVerificationExpires;
    return userObject;
};

export default mongoose.model('User', userSchema);