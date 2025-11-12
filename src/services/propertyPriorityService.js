import Property from "../models/Property.js";
import User from "../models/User.js";

const PLAN_WEIGHTS = {
  gratuit: 1,
  pro: 2,
  premium: 3,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const computeScore = (property, owner) => {
  const planName = owner?.subscription?.plan || 'gratuit';
  const planWeight = PLAN_WEIGHTS[planName] ?? PLAN_WEIGHTS.gratuit;

  const createdAt = property.createdAt || new Date();
  const ageInDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  );
  const recencyBoost = clamp(30 - ageInDays, 0, 30);

  const leadsCount = property.leadsCount || 0;
  const viewsCount = property.viewsCount || 0;

  return planWeight * 100 + recencyBoost + leadsCount * 10 + clamp(Math.floor(viewsCount / 25), 0, 20);
};

export const recalculatePropertyPriority = async (propertyId) => {
  const property = await Property.findById(propertyId).populate('ownerId', 'subscription');
  if (!property) {
    return null;
  }

  const score = computeScore(property, property.ownerId);
  property.priorityScore = score;
  await property.save();
  return property;
};

export const recalculatePriorityForOwner = async (ownerId) => {
  const owner = await User.findById(ownerId, 'subscription');
  if (!owner) {
    return;
  }

  const properties = await Property.find({ ownerId });
  await Promise.all(
    properties.map(async (property) => {
      const score = computeScore(property, owner);
      property.priorityScore = score;
      await property.save();
    })
  );
};

export default {
  recalculatePropertyPriority,
  recalculatePriorityForOwner,
};

