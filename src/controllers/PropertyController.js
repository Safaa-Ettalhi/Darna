const OWNER_UPDATABLE_FIELDS = new Set([
    'title',
    'description',
    'transactionType',
    'price',
    'pricePerDay',
    'availability',
    'address',
    'location',
    'surface',
    'rooms',
    'bathrooms',
    'amenities',
    'internalRules',
    'energyDiagnostics',
]);
import { createPropertySchema, updatePropertySchema } from "../../validation/propertyValidation.js";
import Property from "../models/Property.js";
import searchProperties from "../services/propertySearchService.js";
import { recalculatePropertyPriority } from "../services/propertyPriorityService.js";
import PropertyMediaService from "../services/PropertyMediaService.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";

const propertyMediaService = new PropertyMediaService();
const PLAN_PROPERTY_LIMITS = {
    gratuit: 10,
    pro: 30,
    premium: Number.POSITIVE_INFINITY,
};
const ACTIVE_STATUSES_FOR_LIMIT = ['published', 'pending_moderation'];

const getPlanPropertyLimit = (planName = 'gratuit') => {
    const normalized = planName?.toLowerCase?.() ?? 'gratuit';
    return PLAN_PROPERTY_LIMITS[normalized] ?? PLAN_PROPERTY_LIMITS.gratuit;
};

const ensurePlanAllowsNewProperty = async (userId) => {
    const owner = await User.findById(userId).select('subscription.plan');
    if (!owner) {
        throw new Error('Utilisateur introuvable pour la création de l’annonce.');
    }

    const planName = owner.subscription?.plan || 'gratuit';
    const limit = getPlanPropertyLimit(planName);

    if (!Number.isFinite(limit)) {
        return { allowed: true, planName, limit };
    }

    const activeCount = await Property.countDocuments({
        ownerId: userId,
        status: { $in: ACTIVE_STATUSES_FOR_LIMIT },
    });

    return {
        allowed: activeCount < limit,
        planName,
        limit,
        activeCount,
    };
};

class PropertyController{
    createproperty = async(req, res)=>{
        try {
            const planCheck = await ensurePlanAllowsNewProperty(req.user.userId);
            if (!planCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    code: 'PLAN_LIMIT_REACHED',
                    message: `Votre plan ${planCheck.planName} limite la publication à ${planCheck.limit} annonce(s) active(s).`,
                    details: {
                        limit: planCheck.limit,
                        activeCount: planCheck.activeCount,
                    },
                });
            }

            const payload = {
                ...req.body,
                ownerId: req.user.userId,
            };

            await createPropertySchema.validateAsync(payload);

            
            if (payload.status && ['published', 'rejected'].includes(payload.status)) {
                if (req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: 'Vous ne pouvez pas créer une annonce avec ce statut. Utilisez "brouillon" ou "en attente de modération".',
                    });
                }
            }

            
            if (!payload.status) {
                payload.status = 'pending_moderation';
            } else if (!['draft', 'pending_moderation'].includes(payload.status) && req.user.role !== 'admin') {
                payload.status = 'pending_moderation';
            }

            const newProperty = await Property.create(payload);
            const hydratedProperty = await recalculatePropertyPriority(newProperty._id);
            res.status(201).json({
                success: true,
                property: hydratedProperty || newProperty,
            });
            const io = req.app.get("io");
            if (io) {
                io.emit("property_created", {
                    property: (hydratedProperty || newProperty),
                });
            }
        }catch(error){
            if(error.isJoi){
                res.status(400).json({ error: error.details[0].message});
            }else {
            console.error('Error creating property:', error);
            res.status(500).json({error: 'internal server error'});
            }
        }
    };
    updateProperty = async (req, res)=> {
        try {
            const propertyId = req.params.id;

            const updatePayload = { ...req.body };
            await updatePropertySchema.validateAsync(updatePayload);
            delete updatePayload.ownerId;
            delete updatePayload.owner;

          
            if (updatePayload.status !== undefined) {
                if (['published', 'rejected'].includes(updatePayload.status) && req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: 'Vous ne pouvez pas modifier le statut vers "publié" ou "rejeté". Seuls les administrateurs peuvent effectuer cette action.',
                    });
                }
               
                if (!['draft', 'pending_moderation', 'archived'].includes(updatePayload.status) && req.user.role !== 'admin') {
                    updatePayload.status = 'pending_moderation';
                }
            }

            Object.keys(updatePayload).forEach((key) => {
                if (!OWNER_UPDATABLE_FIELDS.has(key) && key !== 'status') {
                    delete updatePayload[key];
                }
            });

            if (Object.keys(updatePayload).length === 0) {
                return res.status(400).json({ error: 'No valid fields provided for update' });
            }

            const updatedProperty = await Property.findOneAndUpdate(
                { _id: propertyId, ownerId: req.user.userId },
                updatePayload,
                { new: true, runValidators: true }
            );

            if(!updatedProperty){
                return res.status(400).json({ error: 'proprety not found'});
            }
            const recalculated = await recalculatePropertyPriority(updatedProperty._id);
            res.json({ success: true, property: recalculated || updatedProperty });
            const io = req.app.get("io");
            if (io) {
                io.emit("property_updated", {
                    property: recalculated || updatedProperty,
                });
            }
        } catch(error){
            if( error.isJoi){
                res.status(400).json({error : error.details[0].message});
            }else {
                console.error('Error updating proprety:', error);
                res.status(500).json({ error : 'internal server error'});
            }
        }
    };
    deleteProperty = async (req, res) => {
        try {
            const propertyId = req.params.id;

            const deletedProperty = await Property.findOneAndDelete({
                _id: propertyId,
                ownerId: req.user.userId
            });

            if (!deletedProperty){
                return res.status(404).json({error:'property not found'});
            }

            res.json({ success: true, message: 'property deleted succesfully'});
            const io = req.app.get("io");
            if (io) {
                io.emit("property_deleted", { propertyId });
            }
        }catch(error){
            console.error('error deleting the property', error);
            res.status(500).json({ error:'internal server error'});
        }
    };
    searchPropreties = async(req, res) => {
        try{
            const result = await searchProperties(req.query, req.user);
            res.json({ success: true, ...result });
        }catch(error){console.error('Error searching properties', error);
            res.status(500).json({error :'internal server error'});
        }
    };
    getProperty = async (req, res) => {
        try {
            const propertyId = req.params.id;
            const property = await Property.findById(propertyId)
                .populate({
                    path: 'ownerId',
                    select: 'firstName lastName accountType role subscription companyInfo',
                    populate: { path: 'subscription.plan', select: 'name' },
                });

            if (!property) {
                return res.status(404).json({ success: false, message: 'Property not found' });
            }

            const userId = req.user?.userId;
            const userRole = req.user?.role;
            const isOwner = userId && property.ownerId && property.ownerId._id?.toString() === userId;
            const isAdmin = userRole === 'admin';

            if (property.status !== 'published' && !isOwner && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Cette annonce est en cours de traitement. Elle reste visible uniquement pour son propriétaire.',
                });
            }

            res.json({ success: true, property });
        } catch (error) {
            console.error('Error fetching property', error);
            res.status(500).json({ success: false, message: 'internal server error' });
        }
    };
    uploadMedia = async (req, res) => {
        try {
            if (!req.files?.length) {
                return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
            }

            const updatedProperty = await propertyMediaService.addMedia({
                propertyId: req.params.id,
                ownerId: req.user.userId,
                files: req.files,
            });

            const recalculated = await recalculatePropertyPriority(updatedProperty._id);

            res.status(201).json({ success: true, property: recalculated || updatedProperty });
        } catch (error) {
            console.error('Error uploading media', error);
            res.status(400).json({ success: false, message: error.message });
        }
    };

    removeMedia = async (req, res) => {
        try {
            const updatedProperty = await propertyMediaService.removeMedia({
                propertyId: req.params.id,
                ownerId: req.user.userId,
                mediaId: req.params.mediaId,
            });

            const recalculated = await recalculatePropertyPriority(updatedProperty._id);

            res.json({ success: true, property: recalculated || updatedProperty });
        } catch (error) {
            console.error('Error removing media', error);
            res.status(400).json({ success: false, message: error.message });
        }
    };

    getPremiumStats = async (req, res) => {
        try {
            const premiumPlan = await Plan.findOne({ name: 'premium' }).select('_id');
            if (!premiumPlan) {
                return res.json({ success: true, totalPremium: 0, myPremium: 0 });
            }

            const premiumUserIds = await Subscription.distinct('user', {
                plan: premiumPlan._id,
                status: 'active',
            });

            if (!premiumUserIds.length) {
                return res.json({ success: true, totalPremium: 0, myPremium: 0 });
            }

            const totalPremium = await Property.countDocuments({
                status: 'published',
                ownerId: { $in: premiumUserIds },
            });

            let myPremium = 0;
            if (req.user?.userId) {
                const userId = req.user.userId.toString();
                const isPremiumUser = premiumUserIds.some((id) => id.toString() === userId);
                if (isPremiumUser) {
                    myPremium = await Property.countDocuments({
                        ownerId: req.user.userId,
                        status: 'published',
                    });
                }
            }

            res.json({
                success: true,
                totalPremium,
                myPremium,
            });
        } catch (error) {
            console.error('Error computing premium stats', error);
            res.status(500).json({ success: false, message: 'internal server error' });
        }
    };
}
export default new PropertyController();