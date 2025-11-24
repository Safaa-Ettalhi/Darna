import ChatService from '../services/ChatService.js';
import NotificationService from '../services/NotificationService.js';

const serializeMessagePayload = (msg) => {
    if (!msg) {
        return null;
    }
    const fullName = `${msg.userId?.firstName || ""} ${msg.userId?.lastName || ""}`.trim();
    const imageUrl = msg.image || (msg.mediaType === "image" ? msg.mediaUrl : null);
    return {
        id: msg._id,
        userId: msg.userId?._id || msg.userId,
        user: fullName || msg.userId?.email || "Utilisateur",
        message: msg.message || null,
        timestamp: msg.createdAt,
        image: imageUrl,
        mediaType: msg.mediaType || null,
        mediaUrl: msg.mediaUrl || null,
        mediaName: msg.mediaName || null,
        mediaSize: msg.mediaSize || null,
        read: msg.read || false,
    systemType: msg.systemType || null,
    callDuration: msg.callDuration || null,
    };
};

const notifyParticipants = async ({ io, thread, msg, currentUserId }) => {
    if (!io || !thread || !msg) return;
    
    // Filtrer les participants visibles (qui n'ont pas supprimé la conversation)
    const visibleParticipants = thread.participants.filter(
        (participant) => {
            const participantId = participant._id?.toString() || participant.toString();
            // Exclure l'expéditeur et ceux qui ont supprimé la conversation
            if (participantId === currentUserId.toString()) return false;
            if (thread.hiddenFor && thread.hiddenFor.some(
                (hiddenId) => hiddenId.toString() === participantId
            )) return false;
            return true;
        }
    );

    // Émettre le message seulement aux participants visibles
    // On émet à la room, mais les utilisateurs qui ont supprimé ne verront pas le message
    // car ils ne sont pas dans la room (ils ne peuvent pas rejoindre une conversation supprimée)
    io.to(thread.roomId).emit('new_message', serializeMessagePayload(msg));

    const notificationService = new NotificationService(io);
    for (const recipient of visibleParticipants) {
        await notificationService.sendNotification({
            userId: recipient._id || recipient,
            title: `Nouveau message sur "${thread.property?.title || "conversation"}"`,
            message: `${msg.userId.firstName} ${msg.userId.lastName} vous a envoyé un message.`.trim(),
            type: 'message',
            email: recipient.email,
        });
    }
};

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
            await notifyParticipants({
                io,
                thread,
                msg,
                currentUserId: req.user.userId,
            });

            res.status(201).json({ success: true, message: msg });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    uploadAttachment = async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "Fichier requis" });
            }

            const thread = await ChatService.getThreadById(req.params.threadId, req.user.userId);
            const msg = await ChatService.saveMediaMessage({
                roomId: thread.roomId,
                userId: req.user.userId,
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
            });

            // Notification non-bloquante : si elle échoue, le message est quand même envoyé
            const io = req.app.get('io');
            try {
                await notifyParticipants({
                    io,
                    thread,
                    msg,
                    currentUserId: req.user.userId,
                });
            } catch (notifError) {
                // Log l'erreur mais ne bloque pas l'envoi du message
                console.error('Erreur lors de l\'envoi de la notification:', notifError.message);
            }

            res.status(201).json({ success: true, message: msg });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    markMessageRead = async (req, res) => {
        try {
            const message = await ChatService.markAsRead(req.params.messageId, req.user.userId);
            const io = req.app.get('io');
            if (io && message?.roomId) {
                io.to(message.roomId).emit('message_read', {
                    messageId: message._id?.toString() || message.id,
                    readerId: req.user.userId,
                    readAt: new Date().toISOString(),
                });
            }
            res.json({ success: true });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    deleteThread = async (req, res) => {
        try {
            await ChatService.deleteThread(req.params.threadId, req.user.userId);
            res.json({ success: true, message: 'Conversation supprimée avec succès' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };
}

export default new ChatController();

