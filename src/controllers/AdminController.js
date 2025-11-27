import Property from '../models/Property.js';
import User from '../models/User.js';
import Lead from '../models/Lead.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import NotificationService from '../services/NotificationService.js';
import { recalculatePropertyPriority } from '../services/propertyPriorityService.js';

class AdminController {
    async overview(req, res) {
        try {
            const [usersCount, propertiesByStatus, leadsCount, activeSubscriptions] = await Promise.all([
                User.countDocuments(),
                Property.aggregate([
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),
                Lead.countDocuments(),
                Subscription.countDocuments({ status: 'active' }),
            ]);

            const plans = await Plan.find({ isActive: true });

            res.json({
                success: true,
                metrics: {
                    usersCount,
                    propertiesByStatus,
                    leadsCount,
                    activeSubscriptions,
                    plans,
                },
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async listPendingProperties(req, res) {
        try {
            const properties = await Property.find({ status: 'pending_moderation' })
                .populate('ownerId', 'firstName lastName email accountType');
            res.json({ success: true, properties });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updatePropertyStatus(req, res) {
        try {
            const { status, note } = req.body;
            const validStatuses = ['published', 'rejected', 'archived', 'pending_moderation'];

            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Statut invalide' });
            }

            const property = await Property.findById(req.params.propertyId).populate('ownerId', 'email');
            if (!property) {
                return res.status(404).json({ success: false, message: 'Bien introuvable' });
            }

            property.status = status;
            property.moderation = {
                reviewer: req.user.userId,
                note,
                reviewedAt: new Date(),
            };
            await property.save();
            await recalculatePropertyPriority(property._id);

            const notificationService = new NotificationService(req.app.get('io'));
            const message =
                status === 'published'
                    ? `Votre bien "${property.title}" vient d'être validé et publié`
                    : `Votre bien "${property.title}" a été ${status}. ${note ? `Motif: ${note}` : ''}`;

            await notificationService.sendNotification({
                userId: property.ownerId._id,
                title: 'Modération d\'annonce',
                message,
                type: 'ad_validation',
                email: property.ownerId.email,
            });

            res.json({ success: true, property });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async listLeads(req, res) {
        try {
            const leads = await Lead.find()
                .populate('property')
                .populate('buyer', 'firstName lastName email')
                .populate('owner', 'firstName lastName email')
                .sort({ createdAt: -1 });

            res.json({ success: true, leads });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async listKycRequests(req, res) {
        try {
            const { status = 'pending', search = '' } = req.query;
            const filter = { accountType: 'entreprise' };

            if (status === 'pending') {
                filter['companyInfo.kycVerified'] = { $ne: true };
            } else if (status === 'approved') {
                filter['companyInfo.kycVerified'] = true;
            }

            if (search) {
                filter.$or = [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { 'companyInfo.companyName': { $regex: search, $options: 'i' } },
                ];
            }

            const requests = await User.find(filter)
                .select('firstName lastName email companyInfo createdAt accountType');

            res.json({
                success: true,
                requests: requests.map((user) => ({
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    company: user.companyInfo?.companyName,
                    siret: user.companyInfo?.siret,
                    kycVerified: user.companyInfo?.kycVerified ?? false,
                    kycNote: user.companyInfo?.kycNote ?? '',
                    createdAt: user.createdAt,
                    kycReviewedAt: user.companyInfo?.kycReviewedAt,
                })),
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateKycStatus(req, res) {
        try {
            const { status, note } = req.body;
            const allowed = ['approved', 'rejected', 'pending'];

            if (!allowed.includes(status)) {
                return res.status(400).json({ success: false, message: 'Statut KYC invalide' });
            }

            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
            }

            user.companyInfo = {
                ...user.companyInfo,
                kycVerified: status === 'approved',
                kycNote: note || '',
                kycReviewedAt: new Date(),
                kycReviewer: req.user.userId,
            };
            await user.save();

            const notificationService = new NotificationService(req.app.get('io'));
            await notificationService.sendNotification({
                userId: user._id,
                title: 'Mise à jour KYC',
                message:
                    status === 'approved'
                        ? 'Votre dossier KYC a été approuvé.'
                        : status === 'rejected'
                        ? `Votre dossier KYC nécessite des corrections.${note ? ` Motif: ${note}` : ''}`
                        : 'Votre dossier KYC a été remis en attente.',
                type: 'ad_validation',
                email: user.email,
            });

            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updatePlan(req, res) {
        try {
            const { planId } = req.params;
            const { price, maxProperties, priority, features, duration } = req.body;

            const plan = await Plan.findById(planId);
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan introuvable' });
            }

            if (price != null) plan.price = Number(price);
            if (maxProperties != null) plan.maxProperties = Number(maxProperties);
            if (priority != null) plan.priority = Number(priority);
            if (duration != null) plan.duration = duration;
            if (features !== undefined) {
                plan.features = Array.isArray(features)
                    ? features
                    : String(features)
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean);
            }

            await plan.save();

            res.json({ success: true, plan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new AdminController();

