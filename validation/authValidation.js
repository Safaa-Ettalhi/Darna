import Joi from 'joi';

// validation inscription
export const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    accountType: Joi.string().valid('particulier', 'entreprise').required(),
    companyInfo: Joi.object({
        companyName: Joi.string().min(2).max(100).optional(),
        siret: Joi.string().pattern(/^\d{14}$/).optional(),
        address: Joi.object({
            street: Joi.string().max(200).optional(),
            city: Joi.string().max(100).optional(),
            postalCode: Joi.string().pattern(/^\d{5}$/).optional(),
            country: Joi.string().max(50).default('Maroc')
        }).optional()
    }).optional()
});


export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

//  validation pour update pswrd
export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

// validation pour la réinitialisation de mot de passe
export const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

//  validation pour la demande de réinitialisation
export const requestPasswordResetSchema = Joi.object({
    email: Joi.string().email().required()
});

// validation de vérification d'email
export const verifyEmailSchema = Joi.object({
    token: Joi.string().required()
});

// validation de la mise à jour du profil
export const updateProfileSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    companyInfo: Joi.object({
        companyName: Joi.string().min(2).max(100).optional(),
        siret: Joi.string().pattern(/^\d{14}$/).optional(),
        address: Joi.object({
            street: Joi.string().max(200).optional(),
            city: Joi.string().max(100).optional(),
            postalCode: Joi.string().pattern(/^\d{5}$/).optional(),
            country: Joi.string().max(50).optional()
        }).optional()
    }).optional(),
    preferences: Joi.object({
        notifications: Joi.object({
            email: Joi.boolean().optional(),
            push: Joi.boolean().optional(),
            sms: Joi.boolean().optional()
        }).optional(),
        language: Joi.string().valid('fr', 'en', 'es', 'de').optional(),
        timezone: Joi.string().optional()
    }).optional()
});

//validation de refresh token
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
});

//  validation pour la pagination
export const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'firstName', 'lastName', 'email').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});