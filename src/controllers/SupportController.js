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
         
            const io = req.app.get('io');
            if (io) {
               
                const ticketData = populated.toObject ? populated.toObject({ virtuals: true }) : JSON.parse(JSON.stringify(populated));
                
                console.log('SupportController: Emitting ticket_created to admin room');
                console.log('SupportController: Ticket ID:', ticketData._id || ticketData.id);
                console.log('SupportController: Admin room clients:', io.sockets.adapter.rooms.get('admin')?.size || 0);
                
                io.to('admin').emit('ticket_created', {
                    ticket: ticketData,
                });
                
                console.log('SupportController: ticket_created event emitted successfully');
            } else {
                console.warn('SupportController: Socket.IO instance not available');
            }
            
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
                .populate('responses.author', 'firstName lastName email')
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
                .populate('responses.author', 'firstName lastName email')
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

            console.log('SupportController.updateTicket: Starting update for ticket', ticketId);
            console.log('SupportController.updateTicket: Payload', { status, priority, assignedTo, hasResponseMessage: !!responseMessage });

            const ticket = await SupportTicket.findById(ticketId);
            if (!ticket) {
                console.log('SupportController.updateTicket: Ticket not found', ticketId);
                return res.status(404).json({ success: false, message: 'Ticket introuvable' });
            }

           
            if (status) {
                ticket.status = status;
                console.log('SupportController.updateTicket: Status updated to', status);
            }
            if (priority) {
                ticket.priority = priority;
                console.log('SupportController.updateTicket: Priority updated to', priority);
            }
            if (assignedTo !== undefined) {
                ticket.assignedTo = assignedTo || null;
                console.log('SupportController.updateTicket: AssignedTo updated to', assignedTo);
            }
            if (responseMessage) {
                if (!req.user || !req.user.userId) {
                    console.error('SupportController.updateTicket: req.user.userId is missing');
                    return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
                }
                ticket.responses.push({
                    author: req.user.userId,
                    message: responseMessage,
                });
                console.log('SupportController.updateTicket: Response added');
            }

            await ticket.save();
            console.log('SupportController.updateTicket: Ticket saved');

           
            const populated = await SupportTicket.findById(ticketId)
                .populate('user', 'firstName lastName email')
                .populate('assignedTo', 'firstName lastName email')
                .populate('responses.author', 'firstName lastName email')
                .lean(); 

            if (!populated) {
                console.error('SupportController.updateTicket: Failed to populate ticket');
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération du ticket' });
            }

            if (responseMessage && ticket.email) {
                try {
                    const service = new NotificationService(req.app.get('io'));
                    await service.sendNotification({
                        userId: ticket.user,
                        email: ticket.email,
                        title: 'Mise à jour de votre ticket',
                        message: `Une réponse a été ajoutée à votre ticket "${ticket.subject}".`,
                        type: 'info',
                    });
                    console.log('SupportController.updateTicket: Notification sent to user');
                } catch (notifError) {
                    console.error('SupportController.updateTicket: Error sending notification', notifError);
                   
                }
            }

            const io = req.app.get('io');
            if (io) {
                console.log('SupportController: Emitting ticket_updated to admin room');
                console.log('SupportController: Ticket ID:', populated._id || populated.id);
                console.log('SupportController: Admin room clients:', io.sockets.adapter.rooms.get('admin')?.size || 0);
                
                io.to('admin').emit('ticket_updated', {
                    ticket: populated,
                });
                
                console.log('SupportController: ticket_updated event emitted successfully');
            } else {
                console.warn('SupportController: Socket.IO instance not available');
            }

            res.json({ success: true, ticket: populated });
        } catch (error) {
            console.error('SupportController.updateTicket: Error', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new SupportController();

