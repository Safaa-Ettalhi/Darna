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
}

export default new AdminController();

