import Joi from 'joi';

export const estimationRequestSchema = Joi.object({
  propertyId: Joi.string().optional(),
  transactionType: Joi.string().valid('sale', 'daily_rent', 'monthly_rent', 'seasonal_rent').optional(),
  surface: Joi.number().positive().optional(),
  rooms: Joi.number().integer().min(0).optional(),
  bathrooms: Joi.number().integer().min(0).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  condition: Joi.string().valid('premium', 'renovated', 'standard', 'needs_work').optional(),
  locationScore: Joi.number().min(0.5).max(1.5).optional(),
});

