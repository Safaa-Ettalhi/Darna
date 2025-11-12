import Joi from 'joi';

const availabilityCreateSchema = Joi.object({
  from: Joi.date().required(),
  to: Joi.date().greater(Joi.ref('from')).required(),
});

const availabilityUpdateSchema = Joi.object({
  from: Joi.date(),
  to: Joi.date().greater(Joi.ref('from')),
}).min(1);

const locationCreateSchema = Joi.object({
  type: Joi.string().valid('Point').required(),
  coordinates: Joi.array().items(Joi.number()).length(2).required(),
});

const locationUpdateSchema = Joi.object({
  type: Joi.string().valid('Point'),
  coordinates: Joi.array().items(Joi.number()).length(2),
});

const mediaItemSchema = Joi.object({
  type: Joi.string().valid('image', 'video').default('image'),
  url: Joi.string().uri().required(),
  thumbnailUrl: Joi.string().uri(),
});

const createPropertySchema = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().required(),
  transactionType: Joi.string()
    .valid('sale', 'daily_rent', 'monthly_rent', 'seasonal_rent')
    .required(),
  price: Joi.number().required(),
  pricePerDay: Joi.number(),
  availability: availabilityCreateSchema.required(),
  address: Joi.string().required(),
  location: locationCreateSchema.required(),
  surface: Joi.number().required(),
  rooms: Joi.number().required(),
  bathrooms: Joi.number().required(),
  amenities: Joi.array().items(Joi.string()),
  internalRules: Joi.array().items(Joi.string()),
  energyDiagnostics: Joi.string(),
  status: Joi.string().valid('draft', 'published', 'pending_moderation', 'rejected', 'archived'),
  ownerId: Joi.string().required(),
  media: Joi.array().items(mediaItemSchema),
});

const updatePropertySchema = Joi.object({
  title: Joi.string().trim(),
  description: Joi.string(),
  transactionType: Joi.string().valid('sale', 'daily_rent', 'monthly_rent', 'seasonal_rent'),
  price: Joi.number(),
  pricePerDay: Joi.number(),
  availability: availabilityUpdateSchema,
  address: Joi.string(),
  location: locationUpdateSchema,
  surface: Joi.number(),
  rooms: Joi.number(),
  bathrooms: Joi.number(),
  amenities: Joi.array().items(Joi.string()),
  internalRules: Joi.array().items(Joi.string()),
  energyDiagnostics: Joi.string(),
  status: Joi.string().valid('draft', 'published', 'pending_moderation', 'rejected', 'archived'),
  moderation: Joi.object({
    reviewer: Joi.string(),
    note: Joi.string(),
    reviewedAt: Joi.date(),
  }),
  media: Joi.array().items(mediaItemSchema),
  ownerId: Joi.forbidden(),
}).min(1);

export { createPropertySchema, updatePropertySchema };
export default createPropertySchema;
