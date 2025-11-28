import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import NotificationService from '../services/NotificationService.js';

async function notifyAdmins(req, payload) {
    try {
        const admins = await User.find({ role: 'admin' }).select('_id email');
        console.log(`notifyAdmins: Found ${admins.length} admins`);
        if (!admins.length) {
            console.warn('notifyAdmins: No admins found');
            return;
        }
        const service = new NotificationService(req.app.get('io'));
        const result = await service.sendBulk({
            recipients: admins.map((admin) => ({ userId: admin._id, email: admin.email })),
            ...payload,
        });
        console.log(`notifyAdmins: Successfully sent ${result.length} notifications`);
    } catch (error) {
        console.error('Support notification error:', error);
    }
}

class SupportController {

    async createTicket(req, res) {
        try {
            const { subject, category = 'other', message, priority = 'normal', email } = req.body;
            const requester = req.user ? await User.findById(req.user.userId).select('email firstName lastName') : null;

            const contactEmail = (email || requester?.email || '').toLowerCase();
            if (!subject || !message || !contactEmail) {
                return res.status(400).json({ success: false, message: 'Sujet, email et message sont requis.' });
            }

            const ticket = await SupportTicket.create({
                user: requester?._id,
                email: contactEmail,
                subject,
                category,
                message,
                priority,
            });

            await notifyAdmins(req, {
                title: 'Nouveau ticket support',
                message: `${requester ? `${requester.firstName} ${requester.lastName}` : 'Un visiteur'} a soumis un ticket : "${subject}"`,
                type: 'admin_alert',
            });

            const populated = await ticket.populate('user', 'firstName lastName email');
            res.json({ success: true, ticket: populated });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async listUserTickets(req, res) {
        try {
            const tickets = await SupportTicket.find({ user: req.user.userId })
                .sort({ createdAt: -1 })
                .populate('assignedTo', 'firstName lastName email')
                .lean();

            res.json({ success: true, tickets });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async listAllTickets(req, res) {
        try {
            const { status, priority, search } = req.query;
            const filter = {};
            if (status) filter.status = status;
            if (priority) filter.priority = priority;

            if (search) {
                filter.$or = [
                    { subject: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { message: { $regex: search, $options: 'i' } },
                ];
            }

            const tickets = await SupportTicket.find(filter)
                .sort({ createdAt: -1 })
                .populate('user', 'firstName lastName email')
                .populate('assignedTo', 'firstName lastName email')
                .lean();

            res.json({ success: true, tickets });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateTicket(req, res) {
        try {
            const { ticketId } = req.params;
            const { status, priority, assignedTo, responseMessage } = req.body;

            const ticket = await SupportTicket.findById(ticketId);
            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket introuvable' });
            }

            if (status) ticket.status = status;
            if (priority) ticket.priority = priority;
            if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;
            if (responseMessage) {
                ticket.responses.push({
                    author: req.user.userId,
                    message: responseMessage,
                });
            }

            await ticket.save();
            const populated = await ticket
                .populate('user', 'firstName lastName email')
                .populate('assignedTo', 'firstName lastName email');

            if (responseMessage && ticket.email) {
                const service = new NotificationService(req.app.get('io'));
                await service.sendNotification({
                    userId: ticket.user,
                    email: ticket.email,
                    title: 'Mise à jour de votre ticket',
                    message: `Une réponse a été ajoutée à votre ticket "${ticket.subject}".`,
                    type: 'info',
                });
            }

            res.json({ success: true, ticket: populated });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new SupportController();

