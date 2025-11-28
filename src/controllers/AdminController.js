import os from 'os';
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

    async listUsers(req, res) {
        try {
            const { role, accountType, status, search } = req.query;
            const filter = {};

            if (role) filter.role = role;
            if (accountType) filter.accountType = accountType;
            if (status === 'active') filter.isActive = true;
            if (status === 'inactive') filter.isActive = false;
            if (status === 'blocked') filter.isBlocked = true;

            if (search) {
                filter.$or = [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { 'companyInfo.companyName': { $regex: search, $options: 'i' } },
                ];
            }

            const users = await User.find(filter)
                .sort({ createdAt: -1 })
                .select('firstName lastName email role accountType isActive isBlocked blockedReason subscription.plan companyInfo.companyName createdAt');

            res.json({ success: true, users });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const { role, accountType, isActive, isBlocked, blockedReason } = req.body;

            const updates = {};
            if (role) updates.role = role;
            if (accountType) updates.accountType = accountType;
            if (typeof isActive === 'boolean') updates.isActive = isActive;
            if (typeof isBlocked === 'boolean') {
                updates.isBlocked = isBlocked;
                updates.blockedReason = isBlocked ? blockedReason || 'Blocage administrateur' : null;
            } else if (blockedReason !== undefined) {
                updates.blockedReason = blockedReason;
            }

            if (!Object.keys(updates).length) {
                return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
            }

            const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select(
                'firstName lastName email role accountType isActive isBlocked blockedReason'
            );

            if (!user) {
                return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
            }

            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getSystemSettings(req, res) {
        try {
            const memory = process.memoryUsage();
            const uptimeSeconds = Math.round(process.uptime());

            res.json({
                success: true,
                settings: {
                    environment: process.env.NODE_ENV || 'development',
                    version: process.env.APP_VERSION || '1.0.0',
                    nodeVersion: process.version,
                    hostname: os.hostname(),
                    uptimeSeconds,
                    resources: {
                        memoryMB: Math.round(memory.rss / 1024 / 1024),
                        heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
                        platform: process.platform,
                    },
                    services: {
                        database: true,
                        stripe: Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET),
                        minio: Boolean(process.env.MINIO_ENDPOINT),
                        websockets: true,
                        tirelireBridge: Boolean(process.env.TIRELIRE_API_URL),
                    },
                },
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new AdminController();

