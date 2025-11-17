import ChatService from '../services/ChatService.js';
import NotificationService from '../services/NotificationService.js';

class ChatController {
    getThreads = async (req, res) => {
        try {
            const threads = await ChatService.getUserThreads(req.user.userId);
            res.json({ success: true, threads });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    getThread = async (req, res) => {
        try {
            const thread = await ChatService.getThreadById(req.params.threadId, req.user.userId);
            res.json({ success: true, thread });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    };

    getMessages = async (req, res) => {
        try {
            const thread = await ChatService.getThreadById(req.params.threadId, req.user.userId);
            const { limit, before } = req.query;
            const messages = await ChatService.getRoomMessages(thread.roomId, req.user.userId, {
                limit: limit ? Number(limit) : undefined,
                before,
            });
            res.json({ success: true, messages: messages.reverse() });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    sendMessage = async (req, res) => {
        try {
            const { message } = req.body;
            if (!message || !message.trim()) {
                return res.status(400).json({ success: false, message: 'Message requis' });
            }

            const thread = await ChatService.getThreadById(req.params.threadId, req.user.userId);
            const msg = await ChatService.saveMessage({
                roomId: thread.roomId,
                userId: req.user.userId,
                message,
            });

            const io = req.app.get('io');
            if (io) {
                io.to(thread.roomId).emit('new_message', {
                    id: msg._id,
                    userId: msg.userId._id,
                    user: `${msg.userId.firstName} ${msg.userId.lastName}`.trim(),
                    message: msg.message,
                    timestamp: msg.createdAt,
                });
            }

            if (io) {
                io.to(thread.roomId).emit('new_message', {
                    id: msg._id,
                    userId: msg.userId._id,
                    user: `${msg.userId.firstName} ${msg.userId.lastName}`.trim(),
                    message: msg.message,
                    timestamp: msg.createdAt,
                });

                const notificationService = new NotificationService(io);
                const recipients = thread.participants.filter(
                    (participant) => participant._id.toString() !== req.user.userId
                );
                for (const recipient of recipients) {
                    await notificationService.sendNotification({
                        userId: recipient._id,
                        title: `Nouveau message sur "${thread.property?.title || "conversation"}"`,
                        message: `${msg.userId.firstName} ${msg.userId.lastName} vous a envoyé un message.`,
                        type: 'message',
                        email: recipient.email,
                    });
                }
            }

            res.status(201).json({ success: true, message: msg });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    markMessageRead = async (req, res) => {
        try {
            await ChatService.markAsRead(req.params.messageId, req.user.userId);
            res.json({ success: true });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };
}

export default new ChatController();

