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

const propertyMediaService = new PropertyMediaService();

class PropertyController{
    createproperty = async(req, res)=>{
        try {
            const payload = {
                ...req.body,
                ownerId: req.user.userId,
            };

            await createPropertySchema.validateAsync(payload);

            const newProperty = await Property.create(payload);
            const hydratedProperty = await recalculatePropertyPriority(newProperty._id);
            res.status(201).json({
                success: true,
                property: hydratedProperty || newProperty,
            });
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

            Object.keys(updatePayload).forEach((key) => {
                if (!OWNER_UPDATABLE_FIELDS.has(key)) {
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
}
export default new PropertyController();